import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Theme, First-Visit Header & Open Source Transparency', () => {
  const layoutPath = path.resolve(__dirname, '../src/app/layout.tsx');
  const pagePath = path.resolve(__dirname, '../src/app/page.tsx');
  const headerPath = path.resolve(__dirname, '../src/components/Header.tsx');
  const onboardingPath = path.resolve(__dirname, '../src/components/OnboardingWizard.tsx');
  const settingsPath = path.resolve(__dirname, '../src/components/SettingsModal.tsx');
  const footerPath = path.resolve(__dirname, '../src/components/Footer.tsx');

  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  const pageCode = fs.readFileSync(pagePath, 'utf8');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  const onboardingCode = fs.readFileSync(onboardingPath, 'utf8');
  const settingsCode = fs.readFileSync(settingsPath, 'utf8');
  const footerCode = fs.readFileSync(footerPath, 'utf8');

  it('layout.tsx enforces Light Mode default without dark-mode flash', () => {
    // Check that default does not apply dark when theme is null/unset
    assert.ok(layoutCode.includes("localStorage.getItem('qazatrack-theme')"));
    assert.ok(layoutCode.includes("classList.remove('dark')"));
    assert.ok(layoutCode.includes("classList.add('dark')"));
  });

  it('Header component supports onboarding mode with ThemeToggle', () => {
    assert.ok(headerCode.includes('isOnboarding'));
    assert.ok(headerCode.includes('ThemeToggle'));
    assert.ok(headerCode.includes('qazatrack-theme'));
    // Ensures when isOnboarding is true, streak / milestone / settings are excluded
    assert.ok(headerCode.includes('!isOnboarding &&'));
  });

  it('page.tsx mounts Header for first-visit setup/onboarding screen', () => {
    assert.ok(pageCode.includes('<Header'));
    assert.ok(pageCode.includes('isOnboarding={!isOnboarded}'));
  });

  it('OnboardingWizard and SettingsModal include discreet open-source verification links', () => {
    const targetLink = 'https://github.com/imrandotenv/qazatrack';
    const targetText = '100% Open-Source — Verify on GitHub ↗';

    assert.ok(onboardingCode.includes(targetLink));
    assert.ok(onboardingCode.includes(targetText));
    assert.ok(onboardingCode.includes('target="_blank"'));
    assert.ok(onboardingCode.includes('rel="noopener noreferrer"'));

    assert.ok(settingsCode.includes(targetLink));
    assert.ok(settingsCode.includes(targetText));
    assert.ok(settingsCode.includes('target="_blank"'));
    assert.ok(settingsCode.includes('rel="noopener noreferrer"'));
  });

  it('page.tsx contains transparency Q&A item in FAQ section and JSON-LD structured data', () => {
    const question = "How do I know my prayer data isn't tracked or uploaded?";
    const answerSnippet = "QazaTrack has no backend, no analytics trackers, and no login.";
    const githubLink = 'https://github.com/imrandotenv/qazatrack';

    // Structured data
    assert.ok(pageCode.includes(question));
    assert.ok(pageCode.includes(answerSnippet));

    // Visible UI details
    assert.ok(pageCode.includes("How do I know my prayer data isn&apos;t tracked or uploaded?"));
    assert.ok(pageCode.includes(githubLink));
    assert.ok(pageCode.includes('target="_blank"'));
    assert.ok(pageCode.includes('rel="noopener noreferrer"'));
  });

  it('Footer contains clean hairline open source link and developer credit', () => {
    assert.ok(footerCode.includes('Open Source (MIT) • View Source on GitHub ↗'));
    assert.ok(footerCode.includes('https://github.com/imrandotenv/qazatrack'));
    assert.ok(footerCode.includes('Built by Imran'));
    assert.ok(footerCode.includes('https://imranstack.com'));
    assert.ok(footerCode.includes('target="_blank"'));
    assert.ok(footerCode.includes('rel="noopener noreferrer"'));
  });

  it('Strict Guardrail: Zero feedback forms or star rating widgets', () => {
    const files = [
      { name: 'Header', code: headerCode },
      { name: 'OnboardingWizard', code: onboardingCode },
      { name: 'SettingsModal', code: settingsCode },
      { name: 'Footer', code: footerCode },
      { name: 'Page', code: pageCode },
    ];

    const forbidden = [
      /send feedback/i,
      /give feedback/i,
      /rate this app/i,
      /rating prompt/i,
      /star rating/i,
      /emoji survey/i,
      /feedback form/i,
    ];

    for (const f of files) {
      for (const pat of forbidden) {
        assert.equal(pat.test(f.code), false, `Forbidden pattern ${pat} in ${f.name}`);
      }
    }
  });
});
