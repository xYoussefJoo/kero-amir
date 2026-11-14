import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync, writeFileSync } from "node:fs";
const file = "D:/New_Desktop/kero-amir/docs/reports/kero-amir-performance-security-report.pdf";
const doc = await PDFDocument.load(readFileSync(file));
const font = await doc.embedFont(StandardFonts.Helvetica);
const accent = rgb(0x25 / 255, 0x46 / 255, 0xeb / 255);
const pages = doc.getPages();
pages.forEach((page, i) => {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 45, y: height - 30, width: width - 90, height: 1.5, color: accent }); // thin accent rule
  const left = "Kero Amir - Performance & Security Review - kero-amir.runasp.net";
  const right = `Page ${i + 1} of ${pages.length}`;
  page.drawText(left, { x: 45, y: 24, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) });
  page.drawText(right, { x: width - 45 - font.widthOfTextAtSize(right, 7.5), y: 24, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) });
});
writeFileSync(file, await doc.save());
console.log("stamped", pages.length, "pages");
