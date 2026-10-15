const Instruction = require("../models/Instruction");

async function tick() {
  const now = new Date();

  const opened = await Instruction.updateMany(
    { status: "scheduled", auctionStart: { $lte: now } },
    { status: "live" }
  );
  const closed = await Instruction.updateMany(
    { status: "live", auctionEnd: { $lte: now } },
    { status: "closed" }
  );

  if (opened.modifiedCount) console.log(`${opened.modifiedCount} auction(s) went live`);
  if (closed.modifiedCount) console.log(`${closed.modifiedCount} auction(s) closed`);
}

module.exports = function startAuctionClock() {
  const run = () => tick().catch((e) => console.error("Auction clock error:", e.message));
  run(); // catch up immediately if the server was off while an auction time passed
  setInterval(run, 10 * 1000);
};