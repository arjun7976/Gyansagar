import mongoose from "mongoose";

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectToDatabase() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error("MONGODB_URI is not configured. Add it to .env.local before using database features.");
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(mongodbUri, { bufferCommands: false });
  try { cached.conn = await cached.promise; } catch (error) { cached.promise = null; throw new Error("Unable to connect to the database."); }
  return cached.conn;
}