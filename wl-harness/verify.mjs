// Drives the built page to prove the Check in + See all plan dialogs open.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.URL || 'http://localhost:4181/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=2'],
  defaultViewport: { width: 1280, height: 1500, deviceScaleFactor: 2 },
});

async function clickByText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button')];
    return els.find((el) => el.textContent.trim() === t || el.getAttribute('aria-label')?.includes(t));
  }, text);
  const el = handle.asElement();
  if (!el) throw new Error(`no clickable element with text "${text}"`);
  await el.click();
}

// 1) See all plan
let page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(1200);
await clickByText(page, 'See all plan');
await sleep(900);
await page.screenshot({ path: 'shot-plan-details.png' });
console.log('captured plan details dialog');
await page.close();

// 2) Check in
page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(1200);
await clickByText(page, 'Check in');
await sleep(900);
await page.screenshot({ path: 'shot-checkin.png' });
console.log('captured check-in dialog');

await browser.close();
console.log('done');
