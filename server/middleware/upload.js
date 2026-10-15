const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const dir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const allowed = [".pdf", ".jpg", ".jpeg", ".png"];

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (req, file, cb) => {
    const ok = allowed.includes(path.extname(file.originalname).toLowerCase());
    if (ok) return cb(null, true);
    const err = new Error("Only PDF, JPG and PNG files are allowed");
    err.status = 400;
    cb(err);
  },
});