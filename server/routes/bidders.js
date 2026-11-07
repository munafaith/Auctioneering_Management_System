const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Bid = require("../models/Bid");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

// Every bidder, with how many bids they have placed
router.get("/", protect, restrictTo("admin"), async (req, res) => {
  const [bidders, counts] = await Promise.all([
    User.find({ role: "bidder" }).sort({ createdAt: -1 }),
    Bid.aggregate([{ $group: { _id: "$bidder", n: { $sum: 1 } } }]),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

  res.json({
    bidders: bidders.map((b) => ({
      id: b._id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      idNumber: b.idNumber,
      bidderNo: b.bidderNo,
      isVerified: b.isVerified,
      createdAt: b.createdAt,
      termsAcceptedAt: b.termsAcceptedAt,
      bidCount: byId[String(b._id)] || 0,
    })),
  });
});

// Verify a bidder, or revoke verification with { "verified": false }
router.patch("/:id/verify", protect, restrictTo("admin"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid bidder id" });
  }
  const verified = req.body?.verified !== false;

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "bidder" },
    { isVerified: verified },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Bidder not found" });

  res.json({ bidder: { id: user._id, name: user.name, isVerified: user.isVerified } });
});

module.exports = router;