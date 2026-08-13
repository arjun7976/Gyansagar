import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata = { title: "GyanSagar Test System", description: "Online Quiz & Test Platform for coaching institutes" };

export default function RootLayout({ children }) {
  return <html lang="en" className={`${inter.variable} ${outfit.variable}`}><body className="font-sans antialiased text-slate-800 bg-slate-50">{children}</body></html>;
}
