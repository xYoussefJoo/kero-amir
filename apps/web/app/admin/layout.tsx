import type { Metadata } from "next";
import { clash, inter, jetbrains } from "../fonts";
import { ThemeScript } from "@/components/ui/ThemeScript";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Kero Amir admin" },
  robots: { index: false, follow: false },
};

// The admin is its own root layout: English only, no public header, never indexed.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${clash.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
