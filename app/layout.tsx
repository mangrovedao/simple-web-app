import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Suspense } from "react";

import RootProvider from "@/providers/root";

import "./globals.css";

const toastClasses =
  "!border !border-dark-green !text-sm !font-axiforma !text-white !bg-gray-scale-700 !font-normal";
const titleClasses = "!font-medium";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swap | Mangrove DEX",
  description: "Swap on Mangrove DEX",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Suspense fallback={"Loading..."}>
          <RootProvider>{children}</RootProvider>
        </Suspense>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: toastClasses,
            classNames: {
              toast: toastClasses,
              title: titleClasses,
              error: "!fill-red-100",
              success: "!fill-green-caribbean",
            },
            style: {
              fontFamily: "Axiforma",
              fontSize: "14px",
              border: "1px solid #032221",
              borderRadius: "8px",
            },
          }}
        />
      </body>
    </html>
  );
}
