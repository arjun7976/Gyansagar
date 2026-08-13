import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/mongodb.js";
import User from "../models/User.js";
const name = process.env.ADMIN_NAME?.trim(); const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(); const password = process.env.ADMIN_PASSWORD;
if (!name || !email || !password) throw new Error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required in .env.local.");
if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters long.");
await connectToDatabase();
if (await User.findOne({ email })) { console.log("An account with this email already exists. No admin was created."); process.exit(0); }
await User.create({ name, email, password: await bcrypt.hash(password, 12), role: "admin", isActive: true });
console.log("Admin account created successfully."); process.exit(0);