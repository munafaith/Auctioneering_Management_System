const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["repossession_warrant", "logbook", "valuation_report", "other"],
      required: true,
    },
    originalName: String,
    filename: String,
    size: Number,
  },
  { _id: false }
);

const instructionSchema = new mongoose.Schema(
  {
    caseRef: { type: String, unique: true, sparse: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        "draft", "submitted", "under_review", "rejected", "scheduled", "live",
        "closed", "payment_cleared", "handed_over", "completed",
      ],
      default: "submitted",
    },

    // Asset details (client fills in on Screen 6)
    category: {
      type: String,
      enum: ["motor_vehicle", "machinery", "real_estate", "industrial_equipment"],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    registration: { type: String, trim: true },
    yardLocation: { type: String, required: true, trim: true },
    loanBalance: { type: Number, required: true },
    proposedReserve: { type: Number, required: true },
    documents: [documentSchema],

    // Admin determination (filled in during review, Screen 2)
    approvedReserve: Number,
    minIncrement: Number,
    auctionStart: Date,
    auctionEnd: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Instruction", instructionSchema);