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
  addBtnText: (await page.locator('.addressbook-add-btn').textContent())?.trim() ?? null,
  addBtnCount: await page.locator('.addressbook-add-btn').count(),
  editBtnCount: await page.locator('button[aria-label="수정"]').count(),
};
await page.locator('.addressbook-add-btn').click();
await page.waitForTimeout(300);
const createInput = page.locator('input[name="businessName"]').last();
result.createModal={
  visible: await page.locator('.ab-modal-title:text("주소록 추가")').count().catch(()=>0),
  businessValue: await createInput.inputValue(),
  businessReadOnly: await createInput.evaluate((el)=>el.readOnly),
  businessDisabled: await createInput.evaluate((el)=>el.disabled),
};
await page.locator('.ab-btn-cancel').click();
await page.waitForTimeout(300);
await page.locator('button[aria-label="수정"]').first().click();
await page.waitForTimeout(300);
const editInput = page.locator('input[name="businessName"]').last();
result.editModal={
  title: (await page.locator('.ab-modal-title').textContent())?.trim() ?? null,
  businessValue: await editInput.inputValue(),
  businessReadOnly: await editInput.evaluate((el)=>el.readOnly),
  businessDisabled: await editInput.evaluate((el)=>el.disabled),
};
console.log(JSON.stringify(result,null,2));
await browser.close();
