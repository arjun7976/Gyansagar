import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "gyansagar_admin_session";
const SESSION_DURATION = 60 * 60 * 8;
function getSecretKey() { const secret = process.env.AUTH_SECRET; if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be configured with at least 32 characters."); return new TextEncoder().encode(secret); }
export const publicUser = (user) => ({ name: user.name, email: user.email, role: user.role });
export async function createSessionToken(user) { return new SignJWT({ email: user.email, role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user._id.toString()).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).setIssuer("gyansagar-test-system").setAudience("admin").sign(getSecretKey()); }
export async function getSession() { const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null; try { const { payload } = await jwtVerify(token, getSecretKey(), { issuer: "gyansagar-test-system", audience: "admin" }); if (payload.role !== "admin" || !payload.sub) return null; return { userId: payload.sub, email: payload.email, role: payload.role }; } catch { return null; } }
export async function getCurrentAdmin() { const session = await getSession(); if (!session) return null; const { default: User } = await import("../models/User"); const { connectToDatabase } = await import("./mongodb"); await connectToDatabase(); const user = await User.findById(session.userId).select("name email role isActive").lean(); if (!user || user.role !== "admin" || !user.isActive) return null; return publicUser(user); }
export const sessionCookie = (token) => ({ name: SESSION_COOKIE, value: token, options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_DURATION } });
export const clearSessionCookie = { name: SESSION_COOKIE, value: "", options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 } };