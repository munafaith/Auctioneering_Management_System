const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const userPayload = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  organization: u.organization,
  staffTitle: u.staffTitle,
  isVerified: u.isVerified,
});

// Public sign up: only clients and bidders. Admins are created by a seed script.
router.post("/register", async (req, res) => {
  const { name, email, password, role, phone, organization } = req.body ?? {};

  if (!["client", "bidder"].includes(role)) {
    return res.status(400).json({ message: "Role must be client or bidder" });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password, role, phone, organization });
  res.status(201).json({ token: signToken(user), user: userPayload(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ token: signToken(user), user: userPayload(user) });
});

router.get("/me", protect, (req, res) => {
  res.json({ user: userPayload(req.user) });
});

module.exports = router;