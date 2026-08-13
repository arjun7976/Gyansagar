import Link from "next/link";

export default function Header() {
  return <header className="border-b border-slate-200 bg-white"><nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Main navigation"><Link href="/" className="text-lg font-bold tracking-tight text-slate-900">GyanSagar <span className="text-blue-700">Test System</span></Link><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Phase 1</span></nav></header>;
}
