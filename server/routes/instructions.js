const mongoose = require("mongoose");
const path = require("path");

const express = require("express");
const Instruction = require("../models/Instruction");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");
const nextCaseRef = require("../utils/caseRef");
const nextLotNumber = require("../utils/lotNumber");

const router = express.Router();

const docFields = upload.fields([
  { name: "repossessionWarrant", maxCount: 1 },
  { name: "logbook", maxCount: 1 },
  { name: "valuationReport", maxCount: 1 },
  { name: "otherDocs", maxCount: 5 },
]);

const docTypeByField = {
  repossessionWarrant: "repossession_warrant",
  logbook: "logbook",
  valuationReport: "valuation_report",
  otherDocs: "other",
};

// Client submits a new instruction
router.post("/", protect, restrictTo("client"), docFields, async (req, res) => {
  const { category, description, registration, yardLocation, loanBalance, proposedReserve } =
    req.body ?? {};

  if (!category || !description || !yardLocation || !loanBalance || !proposedReserve) {
    return res.status(400).json({ message: "Please fill in all required asset details" });
  }

  const documents = [];
  for (const [field, files] of Object.entries(req.files ?? {})) {
    for (const f of files) {
      documents.push({
        type: docTypeByField[field],
        originalName: f.originalname,
        filename: f.filename,
        size: f.size,
      });
    }
  }
  if (!documents.some((d) => d.type === "repossession_warrant")) {
    return res.status(400).json({ message: "A repossession warrant or court order is required" });
  }

  const instruction = await Instruction.create({
    caseRef: await nextCaseRef(),
    client: req.user._id,
    status: "submitted",
    category,
    description,
    registration,
    yardLocation,
    loanBalance: Number(loanBalance),
    proposedReserve: Number(proposedReserve),
    documents,
  });

  res.status(201).json({ instruction });
});

// Client sees only their own cases (the tracker on Screen 6)
router.get("/mine", protect, restrictTo("client"), async (req, res) => {
  const instructions = await Instruction.find({ client: req.user._id }).sort({ createdAt: -1 });
  res.json({ instructions });
});


const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid case id" });
  }
  next();
};

// Admin dashboard: all cases plus the four summary counts (Screen 1)
router.get("/", protect, restrictTo("admin"), async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const [instructions, active, pendingReview, live, pendingHandover] = await Promise.all([
    Instruction.find(filter).populate("client", "name organization").sort({ createdAt: -1 }),
    Instruction.countDocuments({ status: { $nin: ["completed", "rejected", "unsold"] } }),
    Instruction.countDocuments({ status: { $in: ["submitted", "under_review"] } }),
    Instruction.countDocuments({ status: "live" }),
    Instruction.countDocuments({ status: { $in: ["closed", "payment_cleared"] } }),
  ]);
  res.json({ counts: { active, pendingReview, live, pendingHandover }, instructions });
});

// One case in full: admins see any case, clients only their own
router.get("/:id", protect, validId, async (req, res) => {
  const instruction = await Instruction.findById(req.params.id).populate(
    "client",
    "name email organization phone"
  );
  if (!instruction) return res.status(404).json({ message: "Case not found" });

  const isOwner = instruction.client._id.equals(req.user._id);
  if (req.user.role !== "admin" && !isOwner) {
    return res.status(403).json({ message: "You do not have permission" });
  }
  res.json({ instruction });
});

// Admin opens a case for review: submitted becomes under_review
router.patch("/:id/review", protect, restrictTo("admin"), validId, async (req, res) => {
  const instruction = await Instruction.findOneAndUpdate(
    { _id: req.params.id, status: "submitted" },
    { status: "under_review", reviewedBy: req.user._id },
    { new: true }
  );
  if (!instruction) {
    return res.status(409).json({ message: "Case not found or not awaiting review" });
  }
  res.json({ instruction });
});

// Admin approves and schedules the auction (Screen 2: "Approve & Schedule Lot")
router.patch("/:id/approve", protect, restrictTo("admin"), validId, async (req, res) => {
  const { approvedReserve, minIncrement, auctionStart, auctionEnd } = req.body ?? {};
  const reserve = Number(approvedReserve);
  const increment = Number(minIncrement);
  const start = new Date(auctionStart);
  const end = new Date(auctionEnd);

  if (!(reserve > 0) || !(increment > 0) || isNaN(start) || isNaN(end)) {
    return res.status(400).json({
      message: "Reserve price, minimum increment, auction start and auction end are required",
    });
  }
  if (start <= new Date()) {
    return res.status(400).json({ message: "Auction start must be in the future" });
  }
  if (end <= start) {
    return res.status(400).json({ message: "Auction end must be after the start" });
  }

  const lotNumber = await nextLotNumber();

  const instruction = await Instruction.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["submitted", "under_review"] } },
    {
      status: "scheduled",
      approvedReserve: reserve,
      minIncrement: increment,
      auctionStart: start,
      auctionEnd: end,
      lotNumber: lotNumber,
      reviewedBy: req.user._id,
    },
    { new: true }
  );
  if (!instruction) {
    return res.status(409).json({ message: "Case not found or already decided" });
  }
  res.json({ instruction });
});

// Admin rejects an instruction (Screen 2: "Reject Instruction")
router.patch("/:id/reject", protect, restrictTo("admin"), validId, async (req, res) => {
  const reason = (req.body?.reason ?? "").trim();
  if (!reason) {
    return res.status(400).json({ message: "A reason for rejection is required" });
  }

  const instruction = await Instruction.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["submitted", "under_review"] } },
    { status: "rejected", rejectionReason: reason, reviewedBy: req.user._id },
    { new: true }
  );
  if (!instruction) {
    return res.status(409).json({ message: "Case not found or already decided" });
  }
  res.json({ instruction });
});

// Download an uploaded document (admin, or the client who owns the case)
router.get("/:id/documents/:filename", protect, validId, async (req, res) => {
  const instruction = await Instruction.findById(req.params.id);
  if (!instruction) return res.status(404).json({ message: "Case not found" });

  const isOwner = instruction.client.equals(req.user._id);
  if (req.user.role !== "admin" && !isOwner) {
    return res.status(403).json({ message: "You do not have permission" });
  }

  const doc = instruction.documents.find((d) => d.filename === req.params.filename);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  res.download(path.join(__dirname, "..", "uploads", doc.filename), doc.originalName);
});

module.exports = router;