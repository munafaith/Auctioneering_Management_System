const express = require("express");
const Instruction = require("../models/Instruction");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");
const nextCaseRef = require("../utils/caseRef");

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

module.exports = router;