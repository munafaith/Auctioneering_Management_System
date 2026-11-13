// Fills the LOCAL database with demo data: users plus ten cases, one in every stage.
// Usage (from the server folder):  npm run seed -- --yes
// WARNING: this wipes users, cases, bids, counters and uploaded files first.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Instruction = require("./models/Instruction");
const Bid = require("./models/Bid");
const Counter = require("./models/Counter");

if (!process.argv.includes("--yes")) {
  console.log("This will WIPE the database and uploads. Run again with:  npm run seed -- --yes");
  process.exit(0);
}
const uri = process.env.MONGO_URI || "";
if (!/(localhost|127\.0\.0\.1)/.test(uri)) {
  console.log("Refusing to run: MONGO_URI is not a local database.");
  process.exit(1);
}

const UPLOADS = path.join(__dirname, "uploads");
const PHOTOS = path.join(UPLOADS, "photos");
const SEED_PHOTOS = path.join(__dirname, "seed-photos");
const H = 3600 * 1000, D = 24 * H;
const now = Date.now();
const at = (ms) => new Date(now + ms);

// A tiny valid PDF used for every placeholder document
const PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
  "4 0 obj<</Length 55>>stream\nBT /F1 14 Tf 20 50 Td (LotLink demo document) Tj ET\nendstream endobj\n" +
  "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF\n"
);
let fileSeq = 0;
function pdf(label) {
  const filename = `seed-${Date.now()}-${++fileSeq}.pdf`;
  fs.writeFileSync(path.join(UPLOADS, filename), PDF);
  return { originalName: `${label}.pdf`, filename, size: PDF.length };
}
function photo(slug) {
  if (!slug || !fs.existsSync(SEED_PHOTOS)) return [];
  const f = fs.readdirSync(SEED_PHOTOS).find((n) => n.toLowerCase().startsWith(slug + ".") || n.toLowerCase().startsWith(slug + "-"));
  if (!f) return [];
  const files = fs.readdirSync(SEED_PHOTOS).filter((n) => n.toLowerCase().startsWith(slug));
  return files.map((n, i) => {
    const ext = path.extname(n).toLowerCase();
    const filename = `seed-${slug}-${i}${ext}`;
    fs.copyFileSync(path.join(SEED_PHOTOS, n), path.join(PHOTOS, filename));
    return { filename, originalName: n, size: fs.statSync(path.join(SEED_PHOTOS, n)).size };
  });
}

function wipeFolder(dir) {
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isFile()) fs.unlinkSync(p);
  }
}

(async () => {
  await mongoose.connect(uri);
  console.log("Connected. Wiping old data...");
  await Promise.all([User.deleteMany({}), Instruction.deleteMany({}), Bid.deleteMany({}), Counter.deleteMany({})]);
  fs.mkdirSync(PHOTOS, { recursive: true });
  wipeFolder(UPLOADS);
  wipeFolder(PHOTOS);

  // ---------- Users ----------
  const PASS = "Demo@12345";
  const admin = await User.create({
    name: "Grace Wanjiru (Admin)", email: "admin@lotlink.test", password: "Admin@12345",
    role: "admin", staffTitle: "Operations Manager", isVerified: true,
  });
  const mkClient = (name, email, organization) =>
    User.create({ name, email, password: PASS, role: "client", organization, phone: "0700000000", isVerified: true });
  const [ncba, kcb, dtb, stanbic] = await Promise.all([
    mkClient("NCBA Recoveries", "ncba@lotlink.test", "NCBA Bank"),
    mkClient("KCB Recoveries", "kcb@lotlink.test", "KCB Bank"),
    mkClient("DTB Recoveries", "dtb@lotlink.test", "Diamond Trust Bank"),
    mkClient("Stanbic Recoveries", "stanbic@lotlink.test", "Stanbic Bank"),
  ]);
  let bn = 100;
  const mkBidder = (name, email, idNumber, verified, phone) =>
    User.create({
      name, email, password: PASS, role: "bidder", phone, idType: "national_id", idNumber, isVerified: verified,
      termsAcceptedAt: new Date(), ...(verified ? { bidderNo: ++bn } : {}),
    });
  const david = await mkBidder("David Otieno", "david@lotlink.test", "28451907", true, "0711000001");
  const grace = await mkBidder("Grace Achieng", "grace@lotlink.test", "30127745", true, "0711000002");
  const peter = await mkBidder("Peter Kamau", "peter@lotlink.test", "26984513", true, "0711000003");
  const mercy = await mkBidder("Mercy Njeri", "mercy@lotlink.test", "31560872", true, "0711000004");
  await mkBidder("Samuel Mwangi", "samuel@lotlink.test", "29876543", false, "0711000005"); // pending verification
  await Counter.create({ _id: "bidder", seq: bn - 100 });

  // ---------- Cases ----------
  let lotSeq = 0, refSeq = 0;
  const year = new Date().getFullYear();
  const cases = [
    // 1 submitted
    { client: kcb, category: "machinery", description: "Massey Ferguson 290 Tractor", yardLocation: "Nakuru Yard", loanBalance: 1900000, proposedReserve: 1500000, status: "submitted", docs: ["repossession_warrant", "valuation_report"], photo: "tractor" },
    // 2 under review
    { client: ncba, category: "motor_vehicle", description: "Isuzu FRR Tipper", registration: "KDG 412P", yardLocation: "Industrial Area Yard, Nairobi", loanBalance: 4100000, proposedReserve: 3200000, status: "under_review", docs: ["repossession_warrant", "logbook", "valuation_report"], photo: "isuzu" },
    // 3 rejected
    { client: dtb, category: "motor_vehicle", description: "Nissan X-Trail", registration: "KCX 208T", yardLocation: "Mombasa Road Yard", loanBalance: 2300000, proposedReserve: 1800000, status: "rejected", docs: ["logbook"], rejectionReason: "Repossession warrant is missing. Please resubmit with the signed warrant attached.", photo: "xtrail" },
    // 4 scheduled
    { client: stanbic, category: "motor_vehicle", description: "Mitsubishi L200 Double Cab", registration: "KDH 653L", yardLocation: "Industrial Area Yard, Nairobi", loanBalance: 2800000, proposedReserve: 2200000, approvedReserve: 2100000, minIncrement: 25000, status: "scheduled", start: at(1 * D), end: at(3 * D), docs: ["repossession_warrant", "logbook", "valuation_report"], photo: "l200" },
    // 5 live with bids
    { client: ncba, category: "motor_vehicle", description: "Toyota Land Cruiser Prado TX", registration: "KDE 118S", yardLocation: "Industrial Area Yard, Nairobi", loanBalance: 6200000, proposedReserve: 5000000, approvedReserve: 4800000, minIncrement: 50000, status: "live", start: at(-2 * H), end: at(6 * H), docs: ["repossession_warrant", "logbook", "valuation_report"], photo: "prado",
      bids: [[david, 4800000, -110], [grace, 4850000, -95], [david, 4900000, -80], [peter, 4950000, -40], [grace, 5000000, -12]] },
    // 6 live, no bids
    { client: kcb, category: "real_estate", description: "Half acre plot, Ruiru", yardLocation: "Ruiru, Kiambu County", loanBalance: 7500000, proposedReserve: 6000000, approvedReserve: 5500000, minIncrement: 100000, status: "live", start: at(-1 * H), end: at(2 * D), docs: ["repossession_warrant", "valuation_report"], photo: "ruiru" },
    // 7 closed, awaiting payment (winner David)
    { client: dtb, category: "motor_vehicle", description: "Subaru Outback", registration: "KCN 774Q", yardLocation: "Mombasa Road Yard", loanBalance: 2900000, proposedReserve: 2300000, approvedReserve: 2200000, minIncrement: 25000, status: "closed", start: at(-2 * D), end: at(-1 * H), docs: ["repossession_warrant", "logbook", "valuation_report"], photo: "subaru",
      bids: [[mercy, 2200000, -2400], [david, 2300000, -2000], [mercy, 2400000, -1500], [david, 2450000, -1300]], winner: david },
    // 8 payment cleared
    { client: stanbic, category: "industrial_equipment", description: "Perkins 100kVA Generator", yardLocation: "Athi River Yard", loanBalance: 1700000, proposedReserve: 1300000, approvedReserve: 1200000, minIncrement: 20000, status: "payment_cleared", start: at(-6 * D), end: at(-4 * D), docs: ["repossession_warrant", "valuation_report"], photo: "generator",
      bids: [[peter, 1200000, -6000], [grace, 1260000, -5900], [peter, 1320000, -5800]], winner: peter, pay: true },
    // 9 completed
    { client: ncba, category: "motor_vehicle", description: "Honda CR-V", registration: "KCA 530M", yardLocation: "Industrial Area Yard, Nairobi", loanBalance: 3000000, proposedReserve: 2400000, approvedReserve: 2300000, minIncrement: 25000, status: "completed", start: at(-12 * D), end: at(-10 * D), docs: ["repossession_warrant", "logbook", "valuation_report"], photo: "crv",
      bids: [[grace, 2300000, -14000], [mercy, 2375000, -13900], [grace, 2500000, -13800]], winner: grace, pay: true, hand: true },
    // 10 unsold
    { client: kcb, category: "machinery", description: "Toyota 3 Tonne Forklift", yardLocation: "Nakuru Yard", loanBalance: 1400000, proposedReserve: 1100000, approvedReserve: 1000000, minIncrement: 20000, status: "unsold", start: at(-9 * D), end: at(-7 * D), docs: ["repossession_warrant", "valuation_report"], photo: "forklift" },
  ];

  const docLabel = { repossession_warrant: "Repossession warrant", logbook: "Logbook", valuation_report: "Valuation report" };

  for (const c of cases) {
    const reviewed = !["submitted", "under_review"].includes(c.status) && c.status !== "rejected" ? true : c.status === "rejected";
    const doc = {
      caseRef: `LL-${year}-${String(++refSeq).padStart(3, "0")}`,
      client: c.client._id,
      status: c.status,
      category: c.category,
      description: c.description,
      registration: c.registration,
      yardLocation: c.yardLocation,
      loanBalance: c.loanBalance,
      proposedReserve: c.proposedReserve,
      documents: c.docs.map((t) => ({ type: t, ...pdf(`${docLabel[t]} ${c.description}`) })),
      photos: photo(c.photo),
    };
    if (reviewed) doc.reviewedBy = admin._id;
    if (c.rejectionReason) doc.rejectionReason = c.rejectionReason;
    if (c.approvedReserve) {
      Object.assign(doc, {
        approvedReserve: c.approvedReserve, minIncrement: c.minIncrement,
        auctionStart: c.start, auctionEnd: c.end, lotNumber: `LOT-${String(++lotSeq).padStart(3, "0")}`,
      });
    }

    let created = [];
    if (c.bids) {
      const last = c.bids[c.bids.length - 1];
      doc.currentBid = last[1];
      doc.bidCount = c.bids.length;
      doc.leadingBidder = last[0]._id;
      if (c.winner) { doc.winner = c.winner._id; doc.winningBid = last[1]; }
    }
    if (c.pay) {
      doc.payment = {
        method: "M-Pesa", reference: `QK${Math.floor(Math.random() * 9e7 + 1e7)}X`,
        amount: doc.winningBid, receivedAt: at(-2 * D), proof: pdf("Payment proof"), recordedBy: admin._id,
      };
    }
    if (c.hand) {
      doc.handover = {
        date: at(-1 * D), collectorName: c.winner.name, collectorId: c.winner.idNumber,
        notes: "Collected in person with original ID. Vehicle inspected on release.",
        signedForm: pdf("Signed handover form"), recordedBy: admin._id,
      };
    }
    const inst = await Instruction.create(doc);
    if (c.bids) {
      for (const [bidder, amount, minsAgo] of c.bids) {
        const b = await Bid.create({ lot: inst._id, bidder: bidder._id, amount });
        const t = new Date(now + minsAgo * 60 * 1000);
        await Bid.collection.updateOne({ _id: b._id }, { $set: { createdAt: t, updatedAt: t } });
      }
    }
    console.log(`  ${doc.caseRef}  ${c.status.padEnd(16)} ${c.description}${inst.photos.length ? "  (photo)" : ""}`);
  }

  await Counter.create({ _id: "lot", seq: lotSeq });
  await Counter.create({ _id: `case-${year}`, seq: refSeq });

  console.log("\nDone. Logins:");
  console.log("  Admin   admin@lotlink.test / Admin@12345");
  console.log("  Clients ncba@, kcb@, dtb@, stanbic@lotlink.test / Demo@12345");
  console.log("  Bidders david@, grace@, peter@, mercy@lotlink.test / Demo@12345 (verified)");
  console.log("  Pending samuel@lotlink.test / Demo@12345 (awaiting verification)");
  console.log("Live auctions end in 6 hours and 2 days from now. Re-run the seed before your demo.");
  await mongoose.disconnect();
})().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
