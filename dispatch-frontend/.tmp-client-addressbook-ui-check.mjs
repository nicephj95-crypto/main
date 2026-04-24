import { chromium } from 'playwright';

const baseUrl = 'http://localhost:5173';
const apiUrl = 'http://localhost:4002';
const email = 'client-qa@example.com';
const password = 'devpassword123!';
const importFile = '/tmp/addressbook-client-import.xlsx';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const requests = [];
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('localhost:4002')) requests.push({ method: req.method(), url });
});
page.on('dialog', async (dialog) => await dialog.dismiss());

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
const loginRes = await page.evaluate(async ({ apiUrl, email, password }) => {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}, { apiUrl, email, password });
if (!loginRes.ok) throw new Error(JSON.stringify(loginRes));

await page.goto(`${baseUrl}/address-book`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const result = {};
result.menuTexts = await page.locator('.page-menu a').allTextContents();
result.companyFilterVisible = await page.getByPlaceholder('업체명').count() > 0;
result.placeFilterVisible = await page.getByPlaceholder('장소명').count() > 0;
result.rows = await page.locator('table.addressbook-table tbody tr').count();
result.companyCells = await page.locator('table.addressbook-table tbody tr td:first-child').allTextContents();
result.foreignCompanyVisible = result.companyCells.some((t) => t.trim() && t.trim() !== 'ㅇㅇ');
result.hasAddButton = await page.getByRole('button', { name: /주소록 추가/ }).count() > 0;
result.hasExcelMenu = await page.getByRole('button', { name: /주소록 엑셀 메뉴/ }).count() > 0;
result.hasStaffMenus = {
  groups: (await page.getByRole('link', { name: '그룹관리' }).count()) > 0,
  users: (await page.getByRole('link', { name: '유저관리' }).count()) > 0,
};

await page.getByRole('button', { name: /주소록 추가/ }).click();
await page.waitForTimeout(300);
const createBusinessInput = page.locator('input[name="businessName"]').last();
result.createModal = {
  visible: await page.getByText('주소록 추가').count() > 0,
  businessValue: await createBusinessInput.inputValue(),
  businessReadOnly: await createBusinessInput.evaluate((el) => el.readOnly),
  businessDisabled: await createBusinessInput.evaluate((el) => el.disabled),
};
await page.getByRole('button', { name: '취소' }).click();
await page.waitForTimeout(300);

await page.locator('button[aria-label="수정"]').first().click();
await page.waitForTimeout(300);
const editBusinessInput = page.locator('input[name="businessName"]').last();
result.editModal = {
  visible: await page.getByText('주소록 수정').count() > 0,
  businessValue: await editBusinessInput.inputValue(),
  businessReadOnly: await editBusinessInput.evaluate((el) => el.readOnly),
  businessDisabled: await editBusinessInput.evaluate((el) => el.disabled),
};
await page.getByRole('button', { name: '취소' }).click();
await page.waitForTimeout(300);

await page.getByRole('button', { name: /주소록 엑셀 메뉴/ }).click();
await page.waitForTimeout(300);
const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]');
await fileInput.setInputFiles(importFile);
await page.waitForSelector('text=주소록 엑셀 업로드 결과', { timeout: 15000 });
result.importModal = {
  titleVisible: await page.getByText('주소록 엑셀 업로드 결과').count() > 0,
  appliedText: (await page.locator('text=적용 업체:').textContent())?.trim() ?? null,
  overrideHintVisible: await page.locator('text=로그인 회사 기준').count() > 0,
};
await page.getByRole('button', { name: '확인' }).click();
await page.waitForTimeout(300);

await page.locator('button[aria-label^="이미지 관리"]').first().click();
await page.waitForSelector('[aria-label="주소록 이미지 관리"]', { timeout: 10000 });
result.imageModal = {
  titleVisible: await page.getByText('이미지 관리').count() > 0,
  uploadVisible: await page.locator('label.img-modal-upload-btn').count() > 0,
  emptyStateVisible: await page.locator('text=등록된 이미지가 없습니다').count() > 0,
  errorVisible: await page.locator('.img-modal-error').count() > 0,
};
await page.getByRole('button', { name: '닫기' }).last().click();

result.backendRequests = requests.filter((r) => /address-book|auth\//.test(r.url));

console.log(JSON.stringify(result, null, 2));
await browser.close();
