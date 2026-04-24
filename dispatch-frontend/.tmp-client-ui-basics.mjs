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
  menuTexts: await page.locator('.page-menu a').allTextContents(),
  companyFilterVisible: await page.getByPlaceholder('업체명').count()>0,
  placeFilterVisible: await page.getByPlaceholder('장소명').count()>0,
  rowCount: await page.locator('table.addressbook-table tbody tr').count(),
  companyCells: await page.locator('table.addressbook-table tbody tr td:first-child').allTextContents(),
  addButtonVisible: await page.getByRole('button',{name:/주소록 추가/}).count()>0,
  excelMenuVisible: await page.getByRole('button',{name:/주소록 엑셀 메뉴/}).count()>0,
  groupsVisible: await page.getByRole('link',{name:'그룹관리'}).count()>0,
  usersVisible: await page.getByRole('link',{name:'유저관리'}).count()>0,
};
console.log(JSON.stringify(result,null,2));
await browser.close();
