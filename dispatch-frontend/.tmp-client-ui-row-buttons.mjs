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
const result = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => ({
  text: (b.textContent || '').trim(),
  aria: b.getAttribute('aria-label'),
  title: b.getAttribute('title'),
  className: b.className,
})).filter((b) => b.className.includes('addressbook') || b.aria === '수정' || b.aria === '삭제'));
console.log(JSON.stringify(result,null,2));
await browser.close();
