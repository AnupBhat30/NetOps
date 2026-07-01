import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetOps Agent",
  description: "AI-assisted network change workflow with approval, execution, and validation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
