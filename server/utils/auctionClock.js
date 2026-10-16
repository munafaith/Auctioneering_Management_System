const Instruction = require("../models/Instruction");

// Scheduled lots whose start time has passed go live
async function openDue(io) {
  const due = await Instruction.find({
    status: "scheduled",
    auctionStart: { $lte: new Date() },
  }).select("_id");

  for (const lot of due) {
    const r = await Instruction.updateOne({ _id: lot._id, status: "scheduled" }, { status: "live" });
    if (r.modifiedCount) {
      console.log(`Lot ${lot._id} went live`);
      io.to(`lot:${lot._id}`).emit("lot:status", { lotId: String(lot._id), status: "live" });
    }
  }
}

// Live lots whose end time has passed are closed: sold to the leader, or marked unsold
async function closeDue(io) {
  const ended = await Instruction.find({
    status: "live",
    auctionEnd: { $lte: new Date() },
  });

  for (const lot of ended) {
    const sold = lot.bidCount > 0 && lot.leadingBidder;
    const changes = sold
      ? { status: "closed", winner: lot.leadingBidder, winningBid: lot.currentBid }
      : { status: "unsold" };

    // Only close if the numbers we read are still current. If a last-moment bid
    // slipped in, this skips and the next tick retries with fresh numbers.
    const unchanged =
      lot.bidCount > 0
        ? { bidCount: lot.bidCount, currentBid: lot.currentBid }
        : { bidCount: { $in: [0, null] } };

    const r = await Instruction.updateOne({ _id: lot._id, status: "live", ...unchanged }, changes);
    if (r.modifiedCount) {
      console.log(`Lot ${lot._id} ${sold ? "closed with a winner" : "closed unsold"}`);
      io.to(`lot:${lot._id}`).emit("lot:status", { lotId: String(lot._id), status: changes.status });
    }
  }
}

module.exports = function startAuctionClock(io) {
  const run = async () => {
    try {
      await openDue(io);
      await closeDue(io);
    } catch (e) {
      console.error("Auction clock error:", e.message);
    }
  };
  run(); // catch up immediately if the server was off while an auction time passed
  setInterval(run, 10 * 1000);
};