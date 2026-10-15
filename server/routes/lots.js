const express = require("express");
const mongoose = require("mongoose");
const Instruction = require("../models/Instruction");

const router = express.Router();

const PUBLIC_STATUSES = ["scheduled", "live"];

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
});

router.get("/", async (req, res) => {
  const { category, q, status } = req.query;
  const filter = { status: { $in: PUBLIC_STATUSES } };

  if (status && PUBLIC_STATUSES.includes(status)) filter.status = status;
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
    .sort({ status: 1, auctionEnd: 1 }); // live lots first, soonest ending first

  res.json({ serverTime: new Date(), lots: lots.map(publicLot) });
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lot id" });
  }
  const c = await Instruction.findOne({
    _id: req.params.id,
    status: { $in: PUBLIC_STATUSES },
  }).populate("client", "organization");

  if (!c) return res.status(404).json({ message: "Lot not found" });
  res.json({ serverTime: new Date(), lot: publicLot(c) });
});

module.exports = router;