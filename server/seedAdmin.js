require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = "admin@lotlink.test";

  if (await User.findOne({ email })) {
    console.log("Admin already exists");
    process.exit(0);
  }

  await User.create({
    name: "LotLink Admin",
    email,
    password: "Admin@12345",
    role: "admin",
    staffTitle: "Operations Manager",
    isVerified: true,
  });
  console.log("Admin created:", email);
  process.exit(0);
})();