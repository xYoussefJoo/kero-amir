# Reports

- `kero-amir-performance-security-report.pdf`: Performance & Security Report (2026-11-14).
- `kero-amir-loadtest.js`: k6 load test from section 6. Run only against a deployment you own, outside peak hours.

Regenerate the PDF (Node + Edge; numbers in `report.mjs`):

```bash
node report.mjs                       # writes kero-amir-report.html
msedge --headless=new --no-pdf-header-footer --print-to-pdf=kero-amir-performance-security-report.pdf kero-amir-report.html
npm i --no-save pdf-lib && node stamp.mjs   # footer, page numbers, accent rule
```
