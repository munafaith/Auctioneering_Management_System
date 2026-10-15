const Counter = require("../models/Counter");

module.exports = async function nextLotNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "lot" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `LOT-${String(counter.seq).padStart(3, "0")}`;
};