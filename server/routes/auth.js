const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const createLimiter = require("../middleware/rateLimit");

const router = express.Router();

// Five wrong passwords for the same email from the same address locks that pair for 15 minutes
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many failed login attempts.",
  key: (req) => `${req.ip}|${String(req.body?.email ?? "").toLowerCase()}`,
});
// No more than 20 sign ups an hour from one address
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many sign ups from this address.",
});

const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const emailOk = (v) => typeof v === "string" && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const passwordOk = (v) =>
  typeof v === "string" && v.length >= 6 && v.length <= 72 &&
  /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);

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
  bidderNo: u.bidderNo,
});

// Public sign up: only clients and bidders. Admins are created by a seed script.
router.post("/register", registerLimiter.all, async (req, res) => {
  const { name, email: rawEmail, password, role, phone, organization, idType, idNumber, acceptTerms } = req.body ?? {};
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : rawEmail;

  if (!["client", "bidder"].includes(role)) {
    return res.status(400).json({ message: "Role must be client or bidder" });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (!isText(name, 100)) {
    return res.status(400).json({ message: "Enter a valid name (up to 100 characters)" });
  }
  if (!emailOk(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  if (!passwordOk(password)) {
    return res.status(400).json({ message: "Password should be 6 characters or more and include uppercase, lowercase, a number and a special character" });
  }
  if (phone !== undefined && phone !== "" && !/^[0-9+\s()-]{7,20}$/.test(String(phone))) {
    return res.status(400).json({ message: "Enter a valid phone number" });
  }
  if (organization !== undefined && typeof organization !== "string") {
    return res.status(400).json({ message: "Invalid organization" });
  }

  // Bidders must give an ID for the firm to check, and accept the auction terms
  const bidderFields = {};
  if (role === "bidder") {
    const id = String(idNumber ?? "").trim();
    if (idType === "passport") {
      if (!/^[A-Za-z0-9]{6,9}$/.test(id)) {
        return res.status(400).json({ message: "Enter a valid passport number (6 to 9 letters or digits)" });
      }
    } else if (idType === "national_id") {
      if (!/^\d{7,8}$/.test(id)) {
        return res.status(400).json({ message: "A national ID has 7 or 8 digits only. Use the passport option for letters." });
      }
    } else {
      return res.status(400).json({ message: "Choose National ID or Passport" });
    }
    if (acceptTerms !== true) {
      return res.status(400).json({ message: "You must accept the auction terms to register" });
    }
    bidderFields.idType = idType;
    bidderFields.idNumber = id;
    bidderFields.termsAcceptedAt = new Date();
  }

  if (await User.findOne({ email })) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password, role, phone, organization, ...bidderFields });
  res.status(201).json({ token: signToken(user), user: userPayload(user) });
});

router.post("/login", loginLimiter.gate, async (req, res) => {
  const { email, password } = req.body ?? {};

  // Only plain text is accepted. This stops query objects such as {"$gt": ""}
  // being sent in place of an email (NoSQL injection).
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    loginLimiter.fail(req);
    return res.status(401).json({ message: "Invalid email or password" });
  }
  loginLimiter.reset(req);
  res.json({ token: signToken(user), user: userPayload(user) });
});

router.get("/me", protect, (req, res) => {
  res.json({ user: userPayload(req.user) });
});

module.exports = router;