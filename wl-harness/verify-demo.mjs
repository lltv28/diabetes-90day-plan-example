// Drives the autoplay demo and screenshots each of the 3 steps.
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
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'networkidle0' });

async function waitFor(fn, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(150);
  }
  return false;
}

// 1) Paywall
await sleep(1500);
await page.screenshot({ path: 'shot-1-paywall.png' });
console.log('paywall captured');

// 2) SMS code state — wait for the OTP field the driver fills
const gotCode = await waitFor(() => !!document.querySelector('#otpCode'));
await sleep(600);
await page.screenshot({ path: 'shot-2-sms.png' });
console.log('sms code state captured:', gotCode);

// 3) Plan day 1 — wait for the plan greeting
const gotPlan = await waitFor(() => document.body.innerText.includes('to be done today'), 15000);
await sleep(800);
await page.screenshot({ path: 'shot-3-plan.png' });
console.log('plan captured:', gotPlan);

console.log('page errors:', errors.length ? errors.slice(0, 3) : 'none');
await browser.close();
