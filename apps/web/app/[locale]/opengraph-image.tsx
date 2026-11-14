import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

export const alt = "Kero Amir, graphic designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The link preview (Open Graph / Twitter): ink card, the logo, the name and the tagline. Rendered at build time. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [t, logo] = await Promise.all([
    getTranslations({ locale, namespace: "Meta" }),
    readFile(join(process.cwd(), "public/brand/logo-dark-bg.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: 80, background: "#0E1120", color: "#F4F0E7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
        <img src={logoSrc} width={248} height={300} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
            Kero Amir<span style={{ color: "#FF6535" }}>.</span>
          </div>
          <div style={{ fontSize: 34, color: "#C9C5BB", maxWidth: 640 }}>{t("description")}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <div style={{ width: 56, height: 10, background: "#2546EB" }} />
            <div style={{ width: 56, height: 10, background: "#FF6535" }} />
            <div style={{ width: 56, height: 10, background: "#F4F0E7" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
