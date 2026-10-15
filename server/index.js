require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));

app.use("/api/instructions", require("./routes/instructions"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "LotLink API" });
});

app.use((err, req, res, next) => {
  const status = err.name === "MulterError" ? 400 : err.status || 500;
  res.status(status).json({ message: err.message });
});


const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`LotLink server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });