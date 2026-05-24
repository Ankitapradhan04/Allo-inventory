import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Package } from "lucide-react";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory and reservation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Allo Inventory</span>
            </Link>
            <span className="text-gray-300 text-lg font-light">/</span>
            <nav className="flex gap-4 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900 transition-colors">Products</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
