require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Express and Socket.IO share one HTTP server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL } });
app.set("io", io); // routes reach it with req.app.get("io")

io.on("connection", (socket) => {
  // A browser viewing a lot joins that lot's room to receive its updates
  socket.on("lot:join", (lotId) => {
    if (typeof lotId === "string" && lotId.length < 64) socket.join(`lot:${lotId}`);
  });
  socket.on("lot:leave", (lotId) => {
    if (typeof lotId === "string") socket.leave(`lot:${lotId}`);
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "LotLink API" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/instructions", require("./routes/instructions"));
app.use("/api/lots", require("./routes/lots"));

// Turns upload errors and other failures into clear JSON messages
app.use((err, req, res, next) => {
  const status = err.name === "MulterError" ? 400 : err.status || 500;
  res.status(status).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require("./utils/auctionClock")(io);
    server.listen(PORT, () => console.log(`LotLink server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });