import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature Guide & Guardrails', () => {
  const featureGuidePath = path.resolve(__dirname, '../src/components/FeatureGuideModal.tsx');
  const settingsModalPath = path.resolve(__dirname, '../src/components/SettingsModal.tsx');
  const dashboardPath = path.resolve(__dirname, '../src/components/Dashboard.tsx');
  const footerPath = path.resolve(__dirname, '../src/components/Footer.tsx');
  const pagePath = path.resolve(__dirname, '../src/app/page.tsx');

  const featureGuideCode = fs.readFileSync(featureGuidePath, 'utf8');
  const settingsModalCode = fs.readFileSync(settingsModalPath, 'utf8');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
  const footerCode = fs.readFileSync(footerPath, 'utf8');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  it('FeatureGuideModal exists and contains 4 distinct steps', () => {
    assert.ok(featureGuideCode.includes('step === 1'));
    assert.ok(featureGuideCode.includes('step === 2'));
    assert.ok(featureGuideCode.includes('step === 3'));
    assert.ok(featureGuideCode.includes('step === 4'));
  });

  it('Step 1 explains One-Tap Salah Logging (+1 and Complete Full Day set)', () => {
    assert.ok(featureGuideCode.includes('One-Tap Salah Logging'));
    assert.ok(featureGuideCode.includes('+1'));
    assert.ok(featureGuideCode.includes('Clear 1 Full Day Set'));
    assert.ok(featureGuideCode.includes('Witr'));
  });

  it('Step 2 explains Gentle Daily Pace (steady consistency without countdowns or guilt)', () => {
    assert.ok(featureGuideCode.includes('Gentle Daily Pace'));
    assert.ok(featureGuideCode.includes('Gentle'));
    assert.ok(featureGuideCode.includes('Steady'));
    assert.ok(featureGuideCode.includes('consistency'));
    assert.ok(featureGuideCode.includes('guilt'));
  });

  it('Step 3 explains Progress & Shareable Milestones (breakdown and PNG cards)', () => {
    assert.ok(featureGuideCode.includes('Progress &amp; Shareable Milestones') || featureGuideCode.includes('Progress & Shareable Milestones'));
    assert.ok(featureGuideCode.includes('PNG'));
    assert.ok(featureGuideCode.includes('Breakdown') || featureGuideCode.includes('breakdown'));
    assert.ok(featureGuideCode.includes('Milestone') || featureGuideCode.includes('milestone'));
  });

  it('Step 4 explains 100% Private & Offline Backup (in-browser storage and JSON export/restore)', () => {
    assert.ok(featureGuideCode.includes('100% Private &amp; Offline Backup') || featureGuideCode.includes('100% Private & Offline Backup'));
    assert.ok(featureGuideCode.includes('JSON'));
    assert.ok(featureGuideCode.includes('localStorage') || featureGuideCode.includes('local storage'));
    assert.ok(featureGuideCode.includes('Settings'));
  });

  it('Navigation controls include Skip on every step, Back from step 2 onward, and Got it on step 4', () => {
    // Skip button
    assert.ok(featureGuideCode.includes('Skip'));
    // Back button rendered when step > 1
    assert.ok(featureGuideCode.includes('step > 1'));
    assert.ok(featureGuideCode.includes('Back'));
    // Step 4 final button
    assert.ok(featureGuideCode.includes("'Got it, Start Tracking'"));
    // Step indicator
    assert.ok(featureGuideCode.includes('Step {step} of 4'));
  });

  it('Page integrates FeatureGuideModal with localStorage persistence key qazatrack_feature_guide_seen', () => {
    assert.ok(pageCode.includes('qazatrack_feature_guide_seen'));
    assert.ok(pageCode.includes('FeatureGuideModal'));
    assert.ok(pageCode.includes('handleCloseFeatureGuide'));
    assert.ok(pageCode.includes('handleOpenFeatureGuide'));
  });

  it('SettingsModal includes discreet Feature Guide trigger button', () => {
    assert.ok(settingsModalCode.includes('onOpenFeatureGuide'));
    assert.ok(settingsModalCode.includes('Feature guide') || settingsModalCode.includes('Feature Guide'));
    assert.ok(settingsModalCode.includes('Open Feature Guide'));
  });

  it('FeatureGuideModal adheres to Swiss-minimalist tokens (#FAF9F6, #090D16, hairline borders, nowrap)', () => {
    assert.ok(featureGuideCode.includes('#FAF9F6'));
    assert.ok(featureGuideCode.includes('#090D16'));
    assert.ok(featureGuideCode.includes('border-slate-900/[0.08]'));
    assert.ok(featureGuideCode.includes('dark:border-white/[0.08]'));
    assert.ok(featureGuideCode.includes('whitespace-nowrap'));
    assert.ok(featureGuideCode.includes('isContentEditable') || featureGuideCode.includes('HTMLInputElement'));
  });

  it('Strict Guardrail: Zero feedback forms, star ratings, emoji surveys, or Send Feedback links anywhere', () => {
    const allFiles = [
      { name: 'FeatureGuideModal', code: featureGuideCode },
      { name: 'SettingsModal', code: settingsModalCode },
      { name: 'Dashboard', code: dashboardCode },
      { name: 'Footer', code: footerCode },
      { name: 'Page', code: pageCode },
    ];

    const forbiddenPatterns = [
      /send feedback/i,
      /give feedback/i,
      /rate this app/i,
      /rating prompt/i,
      /star rating/i,
      /emoji survey/i,
      /feedback form/i,
    ];

    for (const file of allFiles) {
      for (const pattern of forbiddenPatterns) {
        assert.equal(
          pattern.test(file.code),
          false,
          `Forbidden feedback pattern ${pattern} found in ${file.name}`,
        );
      }
    }
  });
});
