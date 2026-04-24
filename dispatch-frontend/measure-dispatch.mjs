import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 2048, height: 1045 },
  deviceScaleFactor: 1,
});

await page.goto("http://127.0.0.1:4173/requests/new", { waitUntil: "networkidle" });

const result = await page.evaluate(() => {
  const q = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      selector,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    };
  };

  return {
    vehicleSection: q(".dispatch-vehicle-section"),
    cargoCard: q(".dispatch-cargo-card"),
    cargoTitleRow: q(".dispatch-cargo-card .dispatch-card-title-row"),
    cargoTextarea: q(".dispatch-cargo-card .dispatch-cargo-textarea"),
    paymentCard: q(".dispatch-payment-card"),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
