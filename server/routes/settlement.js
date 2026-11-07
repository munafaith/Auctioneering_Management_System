const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Instruction = require("../models/Instruction");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

const SOLD = ["closed", "payment_cleared", "completed"];
const METHODS = ["bank_wire", "mpesa", "cheque", "cash"];

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid case id" });
  }
  next();
};

const fileInfo = (f) => ({ originalName: f.originalname, filename: f.filename, size: f.size });

// Refuses a request and deletes any file it uploaded, so refused uploads don't pile up
const refuse = (req, res, status, message) => {
  if (req.file) fs.unlink(req.file.path, () => {});
  return res.status(status).json({ message });
};

// ---------- Bidder: the lots I won ----------
router.get("/mine", protect, restrictTo("bidder"), async (req, res) => {
  const wins = await Instruction.find({ winner: req.user._id, status: { $in: SOLD } })
    .populate("client", "organization")
    .sort({ auctionEnd: -1 });

  res.json({
    wins: wins.map((c) => ({
      id: c._id,
      lotNumber: c.lotNumber,
      description: c.description,
      registration: c.registration,
      seller: c.client?.organization,
      yardLocation: c.yardLocation,
      winningBid: c.winningBid,
      status: c.status,
      auctionEnd: c.auctionEnd,
      paidAt: c.payment?.receivedAt,
      collectedAt: c.handover?.date,
    })),
  });
});

// ---------- Admin: all sold lots ----------
router.get("/", protect, restrictTo("admin"), async (req, res) => {
  const cases = await Instruction.find({ status: { $in: SOLD } })
    .populate("client", "organization name")
    .populate("winner", "name bidderNo")
    .sort({ auctionEnd: -1 });
  res.json({ cases });
});

// ---------- Admin: one case with the buyer's real details ----------
router.get("/:id", protect, restrictTo("admin"), validId, async (req, res) => {
  const instruction = await Instruction.findOne({ _id: req.params.id, status: { $in: SOLD } })
    .populate("client", "organization name email phone")
    .populate("winner", "name email phone bidderNo");
  if (!instruction) return res.status(404).json({ message: "Settlement record not found" });
  res.json({ instruction });
});

// ---------- Admin, Step 1: confirm payment ----------
router.post(
  "/:id/payment",
  protect, restrictTo("admin"), validId, upload.single("proof"),
  async (req, res) => {
    const { method, reference, amount } = req.body ?? {};
    const paid = Number(amount);

    if (!METHODS.includes(method) || !reference?.trim() || !(paid > 0)) {
      return refuse(req, res, 400, "Payment method, transaction reference and amount are required");
    }
    if (!req.file) return refuse(req, res, 400, "Attach the bank slip or proof of payment");

    const current = await Instruction.findOne({ _id: req.params.id, status: "closed" });
    if (!current || !current.winningBid) return refuse(req, res, 409, "This case is not awaiting payment");
    
    if (paid !== current.winningBid) {
      return refuse(
        req, res, 400,
        `Amount received (KES ${paid.toLocaleString("en-KE")}) does not match the winning bid (KES ${current.winningBid.toLocaleString("en-KE")})`
      );
    }

    // The status check is part of the update itself, so payment can only be recorded once
    const updated = await Instruction.findOneAndUpdate(
      { _id: req.params.id, status: "closed" },
      {
        status: "payment_cleared",
        payment: {
          method,
          reference: reference.trim(),
          amount: paid,
          receivedAt: new Date(),
          proof: fileInfo(req.file),
          recordedBy: req.user._id,
        },
      },
      { new: true }
    );
    if (!updated) return refuse(req, res, 409, "This case is not awaiting payment");
    res.json({ instruction: updated });
  }
);

// ---------- Admin, Step 2: record handover and close the case ----------
router.post(
  "/:id/handover",
  protect, restrictTo("admin"), validId, upload.single("signedForm"),
  async (req, res) => {
    const { handoverDate, collectorName, collectorId, notes } = req.body ?? {};
    const date = new Date(handoverDate);

    if (isNaN(date) || !collectorName?.trim() || !collectorId?.trim()) {
      return refuse(req, res, 400, "Handover date, collector name and collector ID are required");
    }
    if (date > new Date()) {
      return refuse(req, res, 400, "The handover date cannot be in the future");
    }
    if (!req.file) return refuse(req, res, 400, "Attach the signed handover form or gate pass");

    // Only works if payment has already been cleared
    const updated = await Instruction.findOneAndUpdate(
      { _id: req.params.id, status: "payment_cleared" },
      {
        status: "completed",
        handover: {
          date,
          collectorName: collectorName.trim(),
          collectorId: collectorId.trim(),
          notes: (notes ?? "").trim(),
          signedForm: fileInfo(req.file),
          recordedBy: req.user._id,
        },
      },
      { new: true }
    );
    if (!updated) return refuse(req, res, 409, "Payment must be cleared before handover");
    res.json({ instruction: updated });
  }
);

// ---------- Admin: open the payment proof or signed form ----------
router.get("/:id/files/:filename", protect, restrictTo("admin"), validId, async (req, res) => {
  const c = await Instruction.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Case not found" });

  const files = [c.payment?.proof, c.handover?.signedForm].filter(Boolean);
  const f = files.find((x) => x.filename === req.params.filename);
  if (!f) return res.status(404).json({ message: "File not found" });

  res.download(path.join(__dirname, "..", "uploads", f.filename), f.originalName);
});

module.exports = router;