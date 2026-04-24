import { chromium } from 'playwright';

const baseUrl = 'http://localhost:5173';
const apiUrl = 'http://localhost:4002';
const email = 'client-qa@example.com';
const password = 'devpassword123!';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.on('dialog', async (dialog) => await dialog.dismiss());

console.log('step: goto app');
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
console.log('step: login fetch');
const loginRes = await page.evaluate(async ({ apiUrl, email, password }) => {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}, { apiUrl, email, password });
console.log('loginRes', JSON.stringify(loginRes));

console.log('step: goto address-book');
await page.goto(`${baseUrl}/address-book`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const refreshRes = await page.evaluate(async (apiUrl) => {
  const res = await fetch(`${apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}, apiUrl);
console.log('refreshRes', JSON.stringify(refreshRes));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
console.log('url', page.url());
const bodyText = await page.locator('body').innerText();
console.log('bodyText', bodyText.slice(0, 2000));
await page.screenshot({ path: '/tmp/addressbook-ui-debug.png', fullPage: true });
await browser.close();
