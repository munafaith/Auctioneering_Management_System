const Counter = require("../models/Counter");

module.exports = async function nextCaseRef() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `case-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `LL-${year}-${String(counter.seq).padStart(3, "0")}`;
};