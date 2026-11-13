require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const [email, newPassword] = process.argv.slice(2);

(async () => {
  if (!email || !newPassword) {
    console.log("Usage: node resetPassword.js <email> <new password>");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log("No user with that email");
    process.exit(1);
  }
  user.password = newPassword; // the model hashes it automatically on save
  await user.save();
  console.log(`Password reset for ${user.email} (${user.role})`);
  process.exit(0);
})();