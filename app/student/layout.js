"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StudentLayout({ children }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-blue-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/student" className="font-bold text-xl tracking-wide">
                GyanSagar Test System
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/student" className="hover:text-blue-200 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
