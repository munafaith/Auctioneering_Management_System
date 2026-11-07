const express = require("express");
const mongoose = require("mongoose");
const Instruction = require("../models/Instruction");
const Bid = require("../models/Bid");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lot id" });
  }
  next();
};

const row = (c) => ({
  id: c._id,
  caseRef: c.caseRef,
  lotNumber: c.lotNumber,
  description: c.description,
  registration: c.registration,
  seller: c.client?.organization,
  startingBid: c.approvedReserve,
  currentBid: c.currentBid,
  bidCount: c.bidCount,
  auctionStart: c.auctionStart,
  auctionEnd: c.auctionEnd,
  leader: c.leadingBidder
    ? { name: c.leadingBidder.name, phone: c.leadingBidder.phone, bidderNo: c.leadingBidder.bidderNo }
    : null,
});

// Live and upcoming lots for the Bidding Monitor
router.get("/live", protect, restrictTo("admin"), async (req, res) => {
  const [live, upcoming] = await Promise.all([
    Instruction.find({ status: "live" })
      .populate("client", "organization")
      .populate("leadingBidder", "name phone bidderNo")
      .sort({ auctionEnd: 1 }),
    Instruction.find({ status: "scheduled" })
      .populate("client", "organization")
      .sort({ auctionStart: 1 }),
  ]);
  res.json({ serverTime: new Date(), live: live.map(row), upcoming: upcoming.map(row) });
});

// Full bid history for one lot, with the real bidder behind every bid
router.get("/:id/bids", protect, restrictTo("admin"), validId, async (req, res) => {
  const bids = await Bid.find({ lot: req.params.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("bidder", "name email phone bidderNo");

  res.json({
    bids: bids.map((b) => ({
      id: b._id,
      amount: b.amount,
      at: b.createdAt,
      bidder: b.bidder
        ? { name: b.bidder.name, email: b.bidder.email, phone: b.bidder.phone, bidderNo: b.bidder.bidderNo }
        : null,
    })),
  });
});

module.exports = router;