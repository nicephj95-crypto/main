import { chromium } from 'playwright';
const baseUrl='http://localhost:5173';
const apiUrl='http://localhost:4002';
const email='client-qa@example.com';
const password='devpassword123!';
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
await page.locator('button[aria-label^="이미지 관리"]').first().click();
await page.waitForSelector('[aria-label="주소록 이미지 관리"]',{timeout:10000});
const result={
  dialogVisible: await page.locator('[aria-label="주소록 이미지 관리"]').count(),
  uploadVisible: await page.locator('label.img-modal-upload-btn').count(),
  emptyTextVisible: await page.locator('text=등록된 이미지가 없습니다').count(),
  titleText: (await page.locator('.img-modal-title').textContent())?.trim() ?? null,
  subtitleText: (await page.locator('.img-modal-subtitle').textContent())?.trim() ?? null,
};
console.log(JSON.stringify(result,null,2));
await browser.close();
