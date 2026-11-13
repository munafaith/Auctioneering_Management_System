const express = require("express");
const Instruction = require("../models/Instruction");
const User = require("../models/User");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const SOLD = ["closed", "payment_cleared", "completed"];
const STAGES = [
  "submitted", "under_review", "rejected", "scheduled", "live",
  "closed", "unsold", "payment_cleared", "completed",
];

// Summary figures for the admin Reports page
router.get("/summary", protect, restrictTo("admin"), async (req, res) => {
  const [stageRows, perClientRows, money, bidders] = await Promise.all([
    Instruction.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    Instruction.aggregate([
      { $lookup: { from: "users", localField: "client", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      {
        $group: {
          _id: "$c.organization",
          cases: { $sum: 1 },
          sold: { $sum: { $cond: [{ $in: ["$status", SOLD] }, 1, 0] } },
          unsold: { $sum: { $cond: [{ $eq: ["$status", "unsold"] }, 1, 0] } },
          value: { $sum: { $cond: [{ $in: ["$status", SOLD] }, { $ifNull: ["$winningBid", 0] }, 0] } },
        },
      },
      { $sort: { value: -1 } },
    ]),

    Instruction.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $cond: [{ $in: ["$status", SOLD] }, { $ifNull: ["$winningBid", 0] }, 0] } },
          awaitingPayment: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, { $ifNull: ["$winningBid", 0] }, 0] } },
          paid: { $sum: { $ifNull: ["$payment.amount", 0] } },
          totalBids: { $sum: { $ifNull: ["$bidCount", 0] } },
          auctioned: {
            $sum: { $cond: [{ $in: ["$status", ["live", ...SOLD, "unsold"]] }, 1, 0] },
          },
        },
      },
    ]),

    User.aggregate([
      { $match: { role: "bidder" } },
      { $group: { _id: "$isVerified", count: { $sum: 1 } } },
    ]),
  ]);

  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  stageRows.forEach((r) => (byStage[r._id] = r.count));

  const soldCount = SOLD.reduce((n, s) => n + byStage[s], 0);
  const finished = soldCount + byStage.unsold;
  const m = money[0] || {};

  res.json({
    totalCases: Object.values(byStage).reduce((a, b) => a + b, 0),
    byStage,
    sold: soldCount,
    unsold: byStage.unsold,
    sellThrough: finished ? Math.round((soldCount / finished) * 100) : null,
    totalSales: m.totalSales || 0,
    paid: m.paid || 0,
    awaitingPayment: m.awaitingPayment || 0,
    avgBids: m.auctioned ? Math.round(((m.totalBids || 0) / m.auctioned) * 10) / 10 : 0,
    bidders: {
      verified: bidders.find((b) => b._id === true)?.count || 0,
      pending: bidders.find((b) => b._id === false)?.count || 0,
    },
    perClient: perClientRows.map((r) => ({
      client: r._id || "Unknown",
      cases: r.cases,
      sold: r.sold,
      unsold: r.unsold,
      value: r.value,
    })),
  });
});

module.exports = router;
