import { chromium } from "playwright";

const outputPath = process.argv[2] ?? "/tmp/dispatch-capture.png";
const targetUrl = process.argv[3] ?? "http://127.0.0.1:4173/requests/new";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 2048, height: 1045 },
  deviceScaleFactor: 1,
});

await page.goto(targetUrl, { waitUntil: "networkidle" });
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();
