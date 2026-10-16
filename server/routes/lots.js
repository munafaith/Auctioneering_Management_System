const express = require("express");
const mongoose = require("mongoose");
const Instruction = require("../models/Instruction");
const Bid = require("../models/Bid");
const User = require("../models/User");
const Counter = require("../models/Counter");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const LIST_STATUSES = ["scheduled", "live"];
const DETAIL_STATUSES = [
  "scheduled", "live", "closed", "unsold", "payment_cleared", "handed_over", "completed",
];

const alias = (no) => (no ? `Bidder #${no}` : "Bidder");

// Only these fields ever leave the server. Loan balance, documents,
// client contact details and the client's own reserve proposal stay private.
const publicLot = (c) => ({
  id: c._id,
  lotNumber: c.lotNumber,
  category: c.category,
  description: c.description,
  registration: c.registration,
  yardLocation: c.yardLocation,
  seller: c.client?.organization || "Private seller",
  status: c.status,
  auctionStart: c.auctionStart,
  auctionEnd: c.auctionEnd,
  startingBid: c.approvedReserve,
  minIncrement: c.minIncrement,
  currentBid: c.currentBid,
  bidCount: c.bidCount,
  leadingBidderNo: c.leadingBidder?.bidderNo,
  winningBid: c.winningBid,
});

const bidView = (b) => ({
  id: b._id,
  alias: alias(b.bidder?.bidderNo),
  amount: b.amount,
  at: b.createdAt,
});

// Gives a bidder their public number the first time they bid
async function ensureBidderNo(user) {
  if (user.bidderNo) return user.bidderNo;
  const counter = await Counter.findOneAndUpdate(
    { _id: "bidder" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const updated = await User.findOneAndUpdate(
    { _id: user._id, bidderNo: { $exists: false } },
    { bidderNo: 100 + counter.seq },
    { new: true }
  );
  return updated ? updated.bidderNo : (await User.findById(user._id)).bidderNo;
}

// ---------- Public: browse ----------

router.get("/", async (req, res) => {
  const { category, q, status } = req.query;
  const filter = { status: { $in: LIST_STATUSES } };

  if (status && LIST_STATUSES.includes(status)) filter.status = status;
  if (category) filter.category = { $in: String(category).split(",") };
  if (q) {
    const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [
      { description: rx },
      { registration: rx },
      { lotNumber: rx },
      { yardLocation: rx },
    ];
  }

  const lots = await Instruction.find(filter)
    .populate("client", "organization")
    .populate("leadingBidder", "bidderNo")
    .sort({ status: 1, auctionEnd: 1 });

  res.json({ serverTime: new Date(), lots: lots.map(publicLot) });
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lot id" });
  }
  const c = await Instruction.findOne({
    _id: req.params.id,
    status: { $in: DETAIL_STATUSES },
  })
    .populate("client", "organization")
    .populate("leadingBidder", "bidderNo");

  if (!c) return res.status(404).json({ message: "Lot not found" });
  res.json({ serverTime: new Date(), lot: publicLot(c) });
});

// ---------- Public: the live bid feed (aliases only) ----------

router.get("/:id/bids", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lot id" });
  }
  const bids = await Bid.find({ lot: req.params.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("bidder", "bidderNo");
  res.json({ bids: bids.map(bidView) });
});

// ---------- Bidders only: place a bid ----------

router.post("/:id/bids", protect, restrictTo("bidder"), async (req, res) => {
  const lotId = req.params.id;
  if (!mongoose.isValidObjectId(lotId)) {
    return res.status(400).json({ message: "Invalid lot id" });
  }

  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ message: "Enter a valid bid amount in whole shillings" });
  }

  const bidderNo = await ensureBidderNo(req.user);
  const now = new Date();

  // ONE database step that both checks the rules and records the bid.
  // If any rule fails, nothing is changed and lot comes back null.
  const lot = await Instruction.findOneAndUpdate(
    {
      _id: lotId,
      status: "live",                              // auction is open
      auctionEnd: { $gt: now },                    // and not past its end time
      leadingBidder: { $ne: req.user._id },        // you are not already the highest bidder
      $or: [
        // first bid must reach the starting bid
        { bidCount: { $in: [0, null] }, approvedReserve: { $lte: amount } },
        // later bids must beat the current bid by at least the increment
        {
          bidCount: { $gt: 0 },
          $expr: { $gte: [amount, { $add: ["$currentBid", "$minIncrement"] }] },
        },
      ],
    },
    {
      $set: { currentBid: amount, leadingBidder: req.user._id },
      $inc: { bidCount: 1 },
    },
    { new: true }
  );

  // Rejected: work out why, so the bidder gets a useful message
  if (!lot) {
    const cur = await Instruction.findById(lotId);
    if (!cur || cur.status !== "live" || cur.auctionEnd <= now) {
      return res.status(409).json({ message: "This auction is not open for bidding" });
    }
    if (cur.leadingBidder?.equals(req.user._id)) {
      return res.status(409).json({ message: "You are already the highest bidder" });
    }
    const min = cur.bidCount === 0 ? cur.approvedReserve : cur.currentBid + cur.minIncrement;
    return res.status(409).json({
      message: `Bid too low. The minimum bid is KES ${min.toLocaleString("en-KE")}`,
    });
  }

  const bid = await Bid.create({ lot: lotId, bidder: req.user._id, amount });

  const payload = {
    lotId,
    currentBid: lot.currentBid,
    bidCount: lot.bidCount,
    leadingBidderNo: bidderNo,
    bid: { id: bid._id, alias: alias(bidderNo), amount, at: bid.createdAt },
  };

  // Tell everyone watching this lot
  req.app.get("io").to(`lot:${lotId}`).emit("bid:new", payload);

  res.status(201).json({ ...payload, bidderNo });
});

module.exports = router;