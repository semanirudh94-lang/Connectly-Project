import "dotenv/config";
import bcrypt from "bcrypt";
import connectDB from "../config/db.js";
import User from "../models/User.model.js";
import mongoose from "mongoose";

// ── Evaluation admin credentials ──────────────────────────────────────────
// These are intentionally fixed and documented in the project report so the
// assessor can log in and verify the admin dashboard. Re-running this seed is
// safe: it upserts by email and restores these exact credentials.
const ADMIN = {
  username: "admin",
  fullName: "Platform Administrator",
  email: "admin@instaclone.com",
  password: "Admin@123",
};

const seedAdmin = async () => {
  try {
    await connectDB();

    const hashed = await bcrypt.hash(ADMIN.password, 10);
    const admin = await User.findOneAndUpdate(
      { email: ADMIN.email },
      {
        $set: {
          username: ADMIN.username,
          fullName: ADMIN.fullName,
          email: ADMIN.email,
          password: hashed,
          role: "admin",
          status: "active",
          isVerified: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    console.log("--------------------------------");
    console.log("✅ Admin account ready");
    console.log(`   Email:    ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log(`   Role:     ${admin.role}`);
    console.log("--------------------------------");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
