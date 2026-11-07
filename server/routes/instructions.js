const mongoose = require("mongoose");
const path = require("path");

const express = require("express");
const Instruction = require("../models/Instruction");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");
const nextCaseRef = require("../utils/caseRef");
const nextLotNumber = require("../utils/lotNumber");
const fs = require("fs");
const photoUpload = require("../middleware/photoUpload");

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
  const instructions = await Instruction.find({ client: req.user._id })
    .populate("winner", "name")
    .sort({ createdAt: -1 });
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
  res.json({ instruction, serverTime: new Date() });
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

// Admin edits a scheduled lot. Only allowed before bidding opens.
router.patch("/:id/schedule", protect, restrictTo("admin"), validId, async (req, res) => {
  const {
    approvedReserve, minIncrement, auctionStart, auctionEnd,
    description, registration, yardLocation,
  } = req.body ?? {};

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

  const changes = {
    approvedReserve: reserve,
    minIncrement: increment,
    auctionStart: start,
    auctionEnd: end,
  };
  if (typeof description === "string" && description.trim()) changes.description = description.trim();
  if (typeof registration === "string") changes.registration = registration.trim();
  if (typeof yardLocation === "string" && yardLocation.trim()) changes.yardLocation = yardLocation.trim();

  // The status check is part of the update itself, so a lot that has just
  // gone live a moment ago can no longer be changed.
  const instruction = await Instruction.findOneAndUpdate(
    { _id: req.params.id, status: "scheduled" },
    changes,
    { new: true }
  );
  if (!instruction) {
    return res.status(409).json({
      message: "Only a scheduled lot that has not opened for bidding can be edited",
    });
  }
  res.json({ instruction });
});

// ---------- Lot photos ----------
const PHOTO_DIR = path.join(__dirname, "..", "uploads", "photos");
const PHOTO_STATUSES = ["submitted", "under_review", "scheduled"]; // locked once bidding opens
const MAX_PHOTOS = 8;

const dropFiles = (files) => (files || []).forEach((f) => fs.unlink(f.path, () => {}));

// Admin adds photos
router.post(
  "/:id/photos",
  protect, restrictTo("admin"), validId, photoUpload.array("photos", MAX_PHOTOS),
  async (req, res) => {
    const files = req.files ?? [];
    if (files.length === 0) return res.status(400).json({ message: "Choose at least one photo" });

    const current = await Instruction.findOne({ _id: req.params.id, status: { $in: PHOTO_STATUSES } });
    if (!current) {
      dropFiles(files);
      return res.status(409).json({ message: "Photos can only be changed before bidding opens" });
    }
    if (current.photos.length + files.length > MAX_PHOTOS) {
      dropFiles(files);
      return res.status(400).json({ message: `A lot can have at most ${MAX_PHOTOS} photos` });
    }

    const updated = await Instruction.findOneAndUpdate(
      { _id: req.params.id, status: { $in: PHOTO_STATUSES } },
      {
        $push: {
          photos: {
            $each: files.map((f) => ({ filename: f.filename, originalName: f.originalname, size: f.size })),
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      dropFiles(files);
      return res.status(409).json({ message: "Photos can only be changed before bidding opens" });
    }
    res.status(201).json({ photos: updated.photos });
  }
);

// Admin removes a photo
router.delete("/:id/photos/:filename", protect, restrictTo("admin"), validId, async (req, res) => {
  const updated = await Instruction.findOneAndUpdate(
    { _id: req.params.id, status: { $in: PHOTO_STATUSES }, "photos.filename": req.params.filename },
    { $pull: { photos: { filename: req.params.filename } } },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ message: "Photo not found, or photos are locked once bidding opens" });
  }
  fs.unlink(path.join(PHOTO_DIR, path.basename(req.params.filename)), () => {});
  res.json({ photos: updated.photos });
});

// Admin (or the client who owns the case) views a photo, even before the lot is public
router.get("/:id/photos/:filename", protect, validId, async (req, res) => {
  const c = await Instruction.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Case not found" });

  const isOwner = c.client.equals(req.user._id);
  if (req.user.role !== "admin" && !isOwner) {
    return res.status(403).json({ message: "You do not have permission" });
  }
  const photo = c.photos.find((p) => p.filename === req.params.filename);
  if (!photo) return res.status(404).json({ message: "Photo not found" });

  res.sendFile(path.join(PHOTO_DIR, photo.filename));
});

module.exports = router;