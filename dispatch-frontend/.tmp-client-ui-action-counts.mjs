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
const result={
  editButtons: await page.locator('button[aria-label="수정"]').count(),
  deleteButtons: await page.locator('button[aria-label="삭제"]').count(),
  imageButtonsByTitle: await page.locator('button[title^="이미지 관리"]').count(),
  imageButtonsByAria: await page.locator('button[aria-label^="이미지 관리"]').count(),
};
console.log(JSON.stringify(result,null,2));
await browser.close();
