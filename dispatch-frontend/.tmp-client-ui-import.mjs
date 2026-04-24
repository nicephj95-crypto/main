import { chromium } from 'playwright';
const baseUrl='http://localhost:5173';
const apiUrl='http://localhost:4002';
const email='client-qa@example.com';
const password='devpassword123!';
const importFile='/tmp/addressbook-client-import.xlsx';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1200}});
await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
await page.evaluate(async ({apiUrl,email,password})=>{
  await fetch(`${apiUrl}/auth/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
},{apiUrl,email,password});
await page.goto(`${baseUrl}/address-book`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2500);
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForTimeout(1500);
await page.locator('.excel-btn').click();
await page.waitForTimeout(300);
await page.locator('input[type="file"][accept=".xlsx,.xls"]').setInputFiles(importFile);
await page.waitForSelector('text=주소록 엑셀 업로드 결과', { timeout: 15000 });
const result={
  modalVisible: await page.getByText('주소록 엑셀 업로드 결과').count(),
  appliedText: (await page.locator('text=적용 업체:').textContent())?.trim() ?? null,
  overrideHintCount: await page.locator('text=로그인 회사 기준').count(),
  bodyText: (await page.locator('body').innerText()).slice(0, 1200),
};
console.log(JSON.stringify(result,null,2));
await browser.close();
