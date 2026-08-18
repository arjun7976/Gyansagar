"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
const links = [
  ["Dashboard", "/admin"], 
  ["Tests", "/admin/tests"], 
  ["Question Bank", "/admin/question-bank"],
  ["Subjects", "/admin/subjects"],
  ["Students", "/admin/students"], 
  ["Results", "/admin/results"],
  ["Certificates", "/admin/certificates"],
  ["Study Notes", "/admin/notes"],
  ["Doubts", "/admin/doubts"],
  ["Notifications", "/admin/notifications"],
  ["Settings", "/admin/settings"]
];
export default function AdminShell({ user, children }) { const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false); const [loggingOut, setLoggingOut] = useState(false); async function logout() { setLoggingOut(true); try { await fetch("/api/auth/logout", { method: "POST" }); } finally { router.replace("/admin/login"); router.refresh(); } } return <div className="min-h-screen bg-slate-50"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/50 bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-sm"><button onClick={() => setOpen(!open)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden shadow-sm hover:bg-slate-50 transition-colors">Menu</button><div className="flex items-center gap-3"><div className="p-0.5 rounded-full bg-white shadow-md shadow-blue-900/10"><img src="/logo.jpg" alt="GyanSagar" className="w-9 h-9 object-contain rounded-full" /></div><p className="font-bold tracking-tight text-slate-900 font-heading text-lg hidden sm:block">GyanSagar <span className="premium-text-gradient">Admin</span></p></div><div className="text-right flex flex-col justify-center"><p className="text-sm font-bold text-slate-800 tracking-tight">{user.name}</p><p className="hidden text-xs font-medium text-slate-500 sm:block">{user.email}</p></div></header><aside className={`fixed inset-y-16 left-0 z-20 w-64 border-r border-slate-200/60 bg-white/90 backdrop-blur-md p-5 transition-transform lg:translate-x-0 shadow-lg lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}><nav className="space-y-1.5">{links.map(([label, href]) => { const isActive = pathname === href; return <Link key={href} href={href} onClick={() => setOpen(false)} className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{label}</Link>})}<button onClick={logout} disabled={loggingOut} className="mt-8 w-full rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-left text-sm font-bold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50">{loggingOut ? "Logging out..." : "Logout"}</button></nav></aside>{open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 top-16 z-10 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity" />}<main className="p-4 sm:p-6 lg:ml-64 lg:p-8 relative z-0">{children}</main></div>; }