import { createRequire } from 'node:module';
import fs from 'node:fs';

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

async function runVerification() {
  console.log('Launching Chromium for E2E verification...');
  const launchOptions = { headless: true };
  const userChromeExe = 'C:/Users/mdimr/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe';
  if (process.env.CHROME_PATH) {
    launchOptions.executablePath = process.env.CHROME_PATH;
  } else if (fs.existsSync(userChromeExe)) {
    launchOptions.executablePath = userChromeExe;
  }
  const browser = await chromium.launch(launchOptions);

  try {
    // 1. MOBILE VERIFICATION (360x800)
    console.log('\n--- 1. Testing Mobile Viewport (360x800) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    const page = await mobileContext.newPage();

    // Clear local storage and navigate to fresh app
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Onboarding step 1
    console.log('Onboarding step 1 visible, continuing...');
    const continueBtn = page.getByRole('button', { name: 'Continue to choose my pace' });
    await continueBtn.click();

    // Onboarding step 2: click "Start Day 1"
    console.log('Onboarding step 2 visible, clicking Start Day 1...');
    const startDay1Btn = page.getByRole('button', { name: 'Start Day 1' });
    await startDay1Btn.click();

    // Wait for Dashboard to appear and FeatureGuideModal to automatically trigger
    console.log('Waiting for FeatureGuideModal to auto-trigger on Dashboard entry...');
    const guideDialog = page.getByRole('dialog', { name: 'Feature Guide' });
    await guideDialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('FeatureGuideModal successfully auto-triggered!');

    // Check zero horizontal overflow at 360x800
    const overflowCheck = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
      };
    });
    console.log('Viewport dimensions check:', overflowCheck);
    if (overflowCheck.docScrollWidth > overflowCheck.docClientWidth) {
      throw new Error(`Horizontal overflow detected! scrollWidth=${overflowCheck.docScrollWidth}, clientWidth=${overflowCheck.docClientWidth}`);
    }

    // Step 1 assertions
    const step1Heading = guideDialog.getByRole('heading', { name: 'One-Tap Salah Logging' });
    if (!(await step1Heading.isVisible())) throw new Error('Step 1 heading not visible');
    const step1Indicator = guideDialog.getByText('Step 1 of 4');
    if (!(await step1Indicator.isVisible())) throw new Error('Step 1 indicator not visible');
    const skipBtn = guideDialog.getByRole('button', { name: 'Skip', exact: true });
    if (!(await skipBtn.isVisible())) throw new Error('Skip button not visible on Step 1');
    const backBtn = guideDialog.getByRole('button', { name: 'Back', exact: true });
    if (await backBtn.isVisible()) throw new Error('Back button should not be visible on Step 1');
    const nextBtn = guideDialog.getByRole('button', { name: 'Next', exact: true });
    if (!(await nextBtn.isVisible())) throw new Error('Next button not visible on Step 1');
    console.log('Step 1 verified successfully!');

    // Go to Step 2
    await nextBtn.click();
    const step2Heading = guideDialog.getByRole('heading', { name: 'Gentle Daily Pace' });
    await step2Heading.waitFor({ state: 'visible', timeout: 2000 });
    if (!(await backBtn.isVisible())) throw new Error('Back button should be visible on Step 2');
    console.log('Step 2 verified successfully!');

    // Test Back button
    await backBtn.click();
    await step1Heading.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Back button returns to Step 1 successfully!');

    // Go to Step 2 again
    await nextBtn.click();
    await step2Heading.waitFor({ state: 'visible', timeout: 2000 });

    // Go to Step 3
    await nextBtn.click();
    const step3Heading = guideDialog.getByRole('heading', { name: /Progress & Shareable Milestones/i });
    await step3Heading.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Step 3 verified successfully!');

    // Go to Step 4
    await nextBtn.click();
    const step4Heading = guideDialog.getByRole('heading', { name: /100% Private & Offline Backup/i });
    await step4Heading.waitFor({ state: 'visible', timeout: 2000 });
    const gotItBtn = guideDialog.getByRole('button', { name: 'Got it, Start Tracking', exact: true });
    if (!(await gotItBtn.isVisible())) throw new Error('"Got it, Start Tracking" button not visible on Step 4');
    console.log('Step 4 verified successfully with "Got it, Start Tracking" button!');

    // Click "Got it, Start Tracking" to finish
    await gotItBtn.click();
    await guideDialog.waitFor({ state: 'hidden', timeout: 2000 });
    console.log('FeatureGuideModal closed cleanly!');

    // Verify localStorage key is persisted
    const seenKey = await page.evaluate(() => localStorage.getItem('qazatrack_feature_guide_seen'));
    console.log('qazatrack_feature_guide_seen value:', seenKey);
    if (seenKey !== 'true') throw new Error(`Expected qazatrack_feature_guide_seen to be 'true', got '${seenKey}'`);

    // Reload page and confirm it does not auto-open again
    await page.reload();
    await page.waitForLoadState('networkidle');
    const isVisibleAfterReload = await guideDialog.isVisible();
    if (isVisibleAfterReload) throw new Error('FeatureGuideModal should not auto-open after being marked seen');
    console.log('Confirmed guide does NOT re-appear automatically after refresh.');

    // Test reopening from SettingsModal
    console.log('Opening SettingsModal...');
    const settingsBtn = page.getByRole('button', { name: 'Open settings and backup' });
    await settingsBtn.click();
    const settingsDialog = page.getByRole('dialog', { name: /settings/i });
    await settingsDialog.waitFor({ state: 'visible', timeout: 2000 });

    console.log('Clicking "Open Feature Guide" in SettingsModal...');
    const openGuideInSettings = settingsDialog.getByRole('button', { name: 'Open Feature Guide' });
    await openGuideInSettings.scrollIntoViewIfNeeded();
    await openGuideInSettings.click();

    // Verify FeatureGuideModal is opened at Step 1
    await guideDialog.waitFor({ state: 'visible', timeout: 2000 });
    await step1Heading.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Reopened FeatureGuideModal from Settings at Step 1!');

    // Test Skip button dismisses
    console.log('Testing Skip button dismissal...');
    await skipBtn.click();
    await guideDialog.waitFor({ state: 'hidden', timeout: 2000 });
    console.log('Skip button dismissed the guide immediately!');

    // Test reopening from Header Guide button
    console.log('Testing Header Guide button...');
    const headerGuideBtn = page.getByRole('button', { name: 'Open feature guide' });
    await headerGuideBtn.click();
    await guideDialog.waitFor({ state: 'visible', timeout: 2000 });
    console.log('Header guide button re-opened the guide!');

    // Test Escape key dismisses
    await page.keyboard.press('Escape');
    await guideDialog.waitFor({ state: 'hidden', timeout: 2000 });
    console.log('Escape key dismissed the guide cleanly!');

    await mobileContext.close();

    // 2. DESKTOP VERIFICATION (1280x800)
    console.log('\n--- 2. Testing Desktop Viewport (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:3000');
    await desktopPage.evaluate(() => localStorage.clear());
    await desktopPage.reload();
    await desktopPage.waitForLoadState('networkidle');

    // Onboarding to Dashboard
    await desktopPage.getByRole('button', { name: 'Continue to choose my pace' }).click();
    await desktopPage.getByRole('button', { name: 'Start Day 1' }).click();

    const desktopGuideDialog = desktopPage.getByRole('dialog', { name: 'Feature Guide' });
    await desktopGuideDialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Desktop: FeatureGuideModal auto-opened!');

    // Check step progress dots clickability
    console.log('Desktop: Testing progress dots jump...');
    const step3Dot = desktopPage.getByRole('tab', { name: 'Step 3 of 4' });
    await step3Dot.click();
    await desktopPage.getByRole('heading', { name: /Progress & Shareable Milestones/i }).waitFor({ state: 'visible', timeout: 2000 });
    console.log('Desktop: Progress dots jump to Step 3 works!');

    // Test Arrow navigation
    await desktopPage.keyboard.press('ArrowRight');
    await desktopPage.getByRole('heading', { name: /100% Private & Offline Backup/i }).waitFor({ state: 'visible', timeout: 2000 });
    console.log('Desktop: Keyboard ArrowRight navigation works to Step 4!');

    await desktopPage.keyboard.press('ArrowLeft');
    await desktopPage.getByRole('heading', { name: /Progress & Shareable Milestones/i }).waitFor({ state: 'visible', timeout: 2000 });
    console.log('Desktop: Keyboard ArrowLeft navigation works back to Step 3!');

    // Complete on desktop
    await desktopPage.keyboard.press('ArrowRight'); // Step 4
    await desktopPage.getByRole('button', { name: 'Got it, Start Tracking' }).click();
    await desktopGuideDialog.waitFor({ state: 'hidden', timeout: 2000 });
    console.log('Desktop: Walkthrough finished cleanly!');

    await desktopContext.close();
    console.log('\nALL E2E CHECKS PASSED PERFECTLY!');
  } finally {
    await browser.close();
  }
}

runVerification().catch((err) => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});
