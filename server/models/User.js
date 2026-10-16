const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["client", "admin", "bidder"], required: true },
    phone: { type: String, trim: true },
    organization: { type: String, trim: true }, // clients: the bank or institution
    staffTitle: { type: String, trim: true },   // admins: Valuer, Finance Officer, etc.
    isVerified: { type: Boolean, default: false }, // bidders get verified by an admin
    bidderNo: Number, // public alias number, shown as "Bidder #101"  
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);