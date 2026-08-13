export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import AdminShell from "../../../components/AdminShell";
import { getCurrentAdmin } from "../../../lib/auth";
export default async function ProtectedAdminLayout({ children }) { const user = await getCurrentAdmin(); if (!user) redirect("/admin/login"); return <AdminShell user={user}>{children}</AdminShell>; }