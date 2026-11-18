import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

let chromium;
try {
  chromium = require('playwright').chromium;
} catch {
  try {
    chromium = require('playwright-core').chromium;
  } catch {
    const userFallback = 'C:/Users/mdimr/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/playwright-core';
    if (fs.existsSync(userFallback)) {
      chromium = require(userFallback).chromium;
    } else {
      throw new Error('Playwright or Playwright-core not found.');
    }
  }
}

const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = 'D:\\QazaTracker\\out';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') {
      reqPath = '/index.html';
    }

    let filePath = path.join(OUT_DIR, reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function runTest() {
  console.log(`Starting static server for ${OUT_DIR} on port ${PORT}...`);
  const server = createStaticServer();

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server listening on ${BASE_URL}. Launching Chromium...`);

  const userChromeExe = 'C:/Users/mdimr/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe';
  const launchOptions = { headless: true };
  if (process.env.CHROME_PATH) {
    launchOptions.executablePath = process.env.CHROME_PATH;
  } else if (fs.existsSync(userChromeExe)) {
    launchOptions.executablePath = userChromeExe;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    // TEST 1: MOBILE VIEWPORT (360x800) - FRESH FIRST-TIME VISIT
    console.log('\n--- Test 1: Mobile (360x800) First-Visit Verification ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    const page = await mobileContext.newPage();

    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 1. Verify light mode default
    const isDarkClassOnHtml = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDarkClassOnHtml) {
      throw new Error('FAIL: html element has .dark class on first visit! Expected light mode by default.');
    }
    console.log('PASS: First visit boots without .dark class on <html>.');

    // Check computed background color
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`Computed body background color: ${bgColor}`);
    // #faf9f6 is rgb(250, 249, 246)
    if (bgColor !== 'rgb(250, 249, 246)') {
      throw new Error(`FAIL: Expected body background to be rgb(250, 249, 246) (#FAF9F6), got: ${bgColor}`);
    }
    console.log('PASS: Body background is strictly Light Mode (#FAF9F6).');

    // 2. Verify Theme Switcher visible in top header bar on Onboarding screen
    const themeToggle = page.locator('nav[aria-label="Account and display controls"] button[aria-label*="Switch to"]');
    await themeToggle.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: Theme Toggle is visible in header on Onboarding screen.');

    // Verify streak and settings are NOT shown in onboarding header
    const streakEl = page.locator('header span:has-text("d")');
    const streakCount = await streakEl.count();
    if (streakCount > 0) {
      throw new Error('FAIL: Streak indicator should not be visible in onboarding header.');
    }
    console.log('PASS: Onboarding header shows only Logo and Theme Toggle.');

    // 3. Toggle to Dark Mode
    console.log('Clicking theme toggle to switch to dark mode...');
    await themeToggle.click();
    await page.waitForTimeout(300);

    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const savedTheme = await page.evaluate(() => localStorage.getItem('qazatrack-theme'));
    const darkBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);

    if (!isDarkNow || savedTheme !== 'dark') {
      throw new Error(`FAIL: Dark mode toggle failed. isDark=${isDarkNow}, savedTheme=${savedTheme}`);
    }
    // #090d16 is rgb(9, 13, 22)
    if (darkBg !== 'rgb(9, 13, 22)') {
      throw new Error(`FAIL: Expected dark background rgb(9, 13, 22) (#090D16), got: ${darkBg}`);
    }
    console.log(`PASS: Switched to Dark Mode (#090D16, rgb(9, 13, 22)). Saved theme: ${savedTheme}`);

    // 4. Reload page to verify dark mode persistence without flash
    await page.reload();
    await page.waitForLoadState('networkidle');
    const persistedDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!persistedDark) {
      throw new Error('FAIL: Dark mode did not persist after reload!');
    }
    console.log('PASS: Dark mode preference persisted cleanly after reload.');

    // 5. Toggle back to Light Mode
    await themeToggle.click();
    await page.waitForTimeout(300);
    const isLightAgain = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
    const lightSaved = await page.evaluate(() => localStorage.getItem('qazatrack-theme'));
    if (!isLightAgain || lightSaved !== 'light') {
      throw new Error(`FAIL: Light mode toggle failed. isLightAgain=${isLightAgain}, lightSaved=${lightSaved}`);
    }
    console.log('PASS: Successfully toggled back to Light Mode.');

    // 6. Verify Open-Source Verification Links on Step 1
    const profileVerifyLink = page.locator('a:has-text("100% Open-Source — Verify on GitHub ↗")').first();
    await profileVerifyLink.waitFor({ state: 'visible', timeout: 3000 });
    const href = await profileVerifyLink.getAttribute('href');
    const target = await profileVerifyLink.getAttribute('target');
    const rel = await profileVerifyLink.getAttribute('rel');
    if (href !== 'https://github.com/imrandotenv/qazatrack' || target !== '_blank' || !rel.includes('noopener')) {
      throw new Error(`FAIL: Verify link attributes incorrect: href=${href}, target=${target}, rel=${rel}`);
    }
    console.log('PASS: Open-source verification link present under Calculation Profile with target="_blank" rel="noopener noreferrer".');

    // 7. Step 2 check
    const continueBtn = page.getByRole('button', { name: 'Continue to choose my pace' });
    await continueBtn.click();
    await page.waitForTimeout(300);

    // Verify theme toggle is still visible in header on Step 2
    await themeToggle.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: Theme Toggle remains visible in header on Step 2.');

    // Step 2 bottom open-source link
    const step2VerifyLink = page.locator('a:has-text("100% Open-Source — Verify on GitHub ↗")').last();
    await step2VerifyLink.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: Open-source verification link present on Step 2.');

    // 8. FAQ Transparency Q&A Verification
    console.log('Verifying FAQ transparency Q&A...');
    const faqSummary = page.locator('summary#faq-heading');
    await faqSummary.scrollIntoViewIfNeeded();
    await faqSummary.click();
    await page.waitForTimeout(200);

    const faqQuestion = page.locator('text=How do I know my prayer data isn\'t tracked or uploaded?');
    await faqQuestion.waitFor({ state: 'visible', timeout: 3000 });
    const faqAnswer = page.locator('p:has-text("QazaTrack has no backend, no analytics trackers, and no login.")');
    await faqAnswer.waitFor({ state: 'visible', timeout: 3000 });
    const faqLink = faqAnswer.locator('a[href="https://github.com/imrandotenv/qazatrack"]');
    await faqLink.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: FAQ transparency question, answer, and GitHub link verified in DOM.');

    // 9. Footer Open Source & Credit Links
    console.log('Verifying Footer hairline credits...');
    const footerOpenSource = page.locator('footer a:has-text("Open Source (MIT) • View Source on GitHub ↗")');
    await footerOpenSource.waitFor({ state: 'visible', timeout: 3000 });
    const footerImran = page.locator('footer a[href="https://imranstack.com"]:has-text("Built by Imran")');
    await footerImran.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: Footer open-source link and "Built by Imran" link verified.');

    await mobileContext.close();

    // TEST 2: DESKTOP VIEWPORT (1280x800)
    console.log('\n--- Test 2: Desktop (1280x800) Verification ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const dPage = await desktopContext.newPage();
    await dPage.goto(BASE_URL);
    await dPage.evaluate(() => localStorage.clear());
    await dPage.reload();
    await dPage.waitForLoadState('networkidle');

    const dThemeToggle = dPage.locator('nav[aria-label="Account and display controls"] button[aria-label*="Switch to"]');
    await dThemeToggle.waitFor({ state: 'visible', timeout: 3000 });

    // On desktop, the text label "Light" should be visible
    const labelText = await dThemeToggle.locator('span.hidden.sm\\:inline').textContent();
    if (!labelText.includes('Light')) {
      throw new Error(`FAIL: Expected desktop theme toggle to display "Light", got "${labelText}"`);
    }
    console.log(`PASS: Desktop theme toggle shows text: "${labelText.trim()}".`);

    // Complete Onboarding to test Dashboard, Feature Guide & Settings Modal
    console.log('Completing onboarding...');
    await dPage.getByRole('button', { name: 'Continue to choose my pace' }).click();
    await dPage.getByRole('button', { name: 'Start Day 1' }).click();
    await dPage.waitForTimeout(500);

    // Feature Guide automatically appears upon first onboarding completion!
    console.log('Feature Guide modal auto-opened. Testing Step 4 verification link...');
    const guideDialog = dPage.locator('[role="dialog"][aria-label="Feature Guide"]');
    await guideDialog.waitFor({ state: 'visible', timeout: 3000 });

    // Step through Feature Guide to Step 4
    await dPage.locator('button:has-text("Next")').click();
    await dPage.waitForTimeout(200);
    await dPage.locator('button:has-text("Next")').click();
    await dPage.waitForTimeout(200);
    await dPage.locator('button:has-text("Next")').click();
    await dPage.waitForTimeout(200);

    const guideVerifyLink = guideDialog.locator('a:has-text("100% Open-Source — Verify on GitHub ↗")');
    await guideVerifyLink.waitFor({ state: 'visible', timeout: 3000 });
    console.log('PASS: Feature Guide Step 4 contains "100% Open-Source — Verify on GitHub ↗".');

    // Close Feature Guide
    await dPage.locator('button:has-text("Got it, Start Tracking")').click();
    await dPage.waitForTimeout(500);

    // Now on Dashboard: open Settings Modal
    console.log('Opening Settings Modal from Dashboard...');
    const settingsBtn = dPage.locator('button[aria-label="Open settings and backup"]');
    await settingsBtn.waitFor({ state: 'visible', timeout: 3000 });
    await settingsBtn.click();
    await dPage.waitForTimeout(300);

    // Verify settings modal verification links
    const settingsLinks = dPage.locator('section[role="dialog"] a:has-text("100% Open-Source — Verify on GitHub ↗")');
    const count = await settingsLinks.count();
    if (count < 2) {
      throw new Error(`FAIL: Expected multiple verification links in SettingsModal, found ${count}`);
    }
    console.log(`PASS: SettingsModal contains ${count} open-source verification links.`);

    // Close settings modal
    await dPage.locator('button[aria-label="Close settings"]').click();
    await dPage.waitForTimeout(300);

    // Verify strict guardrail: no feedback forms or star ratings anywhere
    const bodyText = await dPage.locator('body').innerText();
    const forbiddenTerms = ['send feedback', 'give feedback', 'rate this app', 'star rating', 'feedback form'];
    for (const term of forbiddenTerms) {
      if (bodyText.toLowerCase().includes(term)) {
        throw new Error(`FAIL: Forbidden term "${term}" found in page content!`);
      }
    }
    console.log('PASS: Strict Guardrail verified: zero feedback forms or star ratings present.');

    await desktopContext.close();
    await browser.close();
    console.log('\n>>> ALL BROWSER E2E TESTS PASSED WITH 100% COMPLIANCE! <<<\n');
  } finally {
    console.log('Closing server...');
    server.close();
  }
}

runTest().catch((err) => {
  console.error('E2E TEST ERROR:', err);
  process.exit(1);
});
