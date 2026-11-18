import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttendedJumuah,
  calculatePayoffProjection,
  calculateTotalFridays,
  estimateFromDuration,
} from '../src/lib/calculator';

describe('calculator - Calculation Profiles & Fiqh Exemptions', () => {
  describe('calculateTotalFridays & calculateAttendedJumuah', () => {
    it('calculates 52 Fridays in 12 months (1 year)', () => {
      assert.equal(calculateTotalFridays(12), 52);
    });

    it('calculates 104 Fridays in 24 months (2 years)', () => {
      assert.equal(calculateTotalFridays(24), 104);
    });

    it('calculates 0 Fridays for 0 or negative months', () => {
      assert.equal(calculateTotalFridays(0), 0);
      assert.equal(calculateTotalFridays(-5), 0);
    });

    it('calculates attended Jumuah with decimal and percentage ratios', () => {
      // 52 fridays * 0.5 = 26
      assert.equal(calculateAttendedJumuah(12, 0.5), 26);
      // 52 fridays * 50% = 26
      assert.equal(calculateAttendedJumuah(12, 50), 26);
      // 100% = 52
      assert.equal(calculateAttendedJumuah(12, 1.0), 52);
      assert.equal(calculateAttendedJumuah(12, 100), 52);
      // 0% = 0
      assert.equal(calculateAttendedJumuah(12, 0), 0);
    });
  });

  describe('Brother Profile', () => {
    it('calculates basic debt when no Jumuah attended', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'brother',
        jumuahAttendance: 0,
      });

      assert.equal(counts.fajr, 360);
      assert.equal(counts.dhuhr, 360);
      assert.equal(counts.asr, 360);
      assert.equal(counts.maghrib, 360);
      assert.equal(counts.isha, 360);
      assert.equal(counts.witr, 360);
      assert.equal(counts.fasts, 30);
    });

    it('deducts Friday Jumuah strictly from Dhuhr only (100% attended)', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'brother',
        jumuahAttendance: 1.0,
      });

      // 12 months * 30 days = 360 days. 52 Fridays attended.
      // Dhuhr should be 360 - 52 = 308. All others must be 360.
      assert.equal(counts.dhuhr, 308);
      assert.equal(counts.fajr, 360);
      assert.equal(counts.asr, 360);
      assert.equal(counts.maghrib, 360);
      assert.equal(counts.isha, 360);
      assert.equal(counts.witr, 360);
      assert.equal(counts.fasts, 30);
    });

    it('deducts Friday Jumuah with 50% preset attendance', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'brother',
        jumuahAttendance: 0.5,
      });

      // 52 fridays * 0.5 = 26 attended.
      assert.equal(counts.dhuhr, 334);
      assert.equal(counts.fajr, 360);
    });

    it('forces monthlyExemptionDays to 0 so stale sister settings never affect brother', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'brother',
        // Stale sister settings passed maliciously or by prior state:
        monthlyExemptionDays: 7,
        includeExemption: true,
        jumuahAttendance: 0,
      });

      // Must NOT deduct 84 hayd days from brother
      assert.equal(counts.fajr, 360);
      assert.equal(counts.dhuhr, 360);
      assert.equal(counts.asr, 360);
      assert.equal(counts.maghrib, 360);
      assert.equal(counts.isha, 360);
      assert.equal(counts.witr, 360);
      assert.equal(counts.fasts, 30);
    });

    it('applies custom exemptions correctly', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'brother',
        jumuahAttendance: 1.0, // 52
        customExemptionDays: 10,
      });

      // 360 - 10 = 350 common missed days. Dhuhr = 350 - 52 = 298.
      assert.equal(counts.fajr, 350);
      assert.equal(counts.dhuhr, 298);
      assert.equal(counts.asr, 350);
    });
  });

  describe('Sister Profile', () => {
    it('applies monthly Hayd exemption strictly to Salah and NEVER to fasts', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        includeExemption: true,
        monthlyExemptionDays: 7,
      });

      // 12 months * 7 days = 84 exemption days.
      // Salah missed: 360 - 84 = 276.
      assert.equal(counts.fajr, 276);
      assert.equal(counts.dhuhr, 276);
      assert.equal(counts.asr, 276);
      assert.equal(counts.maghrib, 276);
      assert.equal(counts.isha, 276);
      assert.equal(counts.witr, 276);
      // Fasts MUST remain 30 (not 30 - 84 = -54!)
      assert.equal(counts.fasts, 30);
    });

    it('supports custom Hayd day stepper between 5 and 10 days', () => {
      const counts5 = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        monthlyExemptionDays: 5,
      });
      // 12 * 5 = 60. Salah = 360 - 60 = 300.
      assert.equal(counts5.fajr, 300);
      assert.equal(counts5.fasts, 30);

      const counts10 = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        monthlyExemptionDays: 10,
      });
      // 12 * 10 = 120. Salah = 360 - 120 = 240.
      assert.equal(counts10.fajr, 240);
      assert.equal(counts10.fasts, 30);
    });

    it('forces jumuahAttendance to 0 so stale brother settings never deduct Dhuhr', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        monthlyExemptionDays: 7,
        // Stale brother settings passed from prior state:
        jumuahAttendance: 1.0,
      });

      // Dhuhr must equal Fajr (276), NOT 276 - 52 = 224!
      assert.equal(counts.fajr, 276);
      assert.equal(counts.dhuhr, 276);
      assert.equal(counts.asr, 276);
      assert.equal(counts.maghrib, 276);
      assert.equal(counts.isha, 276);
      assert.equal(counts.witr, 276);
      assert.equal(counts.fasts, 30);
    });

    it('forces customExemptionDays to 0 so stale brother settings never deduct Salah from sister', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        monthlyExemptionDays: 7,
        // Stale brother setting from prior profile:
        customExemptionDays: 20,
      });

      // 360 - 84 = 276. customExemptionDays must be ignored for sister.
      assert.equal(counts.fajr, 276);
      assert.equal(counts.dhuhr, 276);
      assert.equal(counts.asr, 276);
      assert.equal(counts.maghrib, 276);
      assert.equal(counts.isha, 276);
      assert.equal(counts.witr, 276);
      assert.equal(counts.fasts, 30);
    });

    it('zeros out hayd exemption when toggle is false', () => {
      const counts = estimateFromDuration({
        years: 1,
        months: 0,
        profile: 'sister',
        includeExemption: false,
      });

      assert.equal(counts.fajr, 360);
      assert.equal(counts.dhuhr, 360);
      assert.equal(counts.fasts, 30);
    });
  });

  describe('Switching back and forth & Zero negative numbers', () => {
    it('switching between Brother and Sister gives clean consistent calculations', () => {
      const brotherOptions = {
        years: 2,
        months: 0,
        profile: 'brother' as const,
        jumuahAttendance: 1.0, // 104 fridays
      };
      const sisterOptions = {
        years: 2,
        months: 0,
        profile: 'sister' as const,
        monthlyExemptionDays: 7, // 24 * 7 = 168 days
      };

      const brother1 = estimateFromDuration(brotherOptions);
      assert.equal(brother1.fajr, 720);
      assert.equal(brother1.dhuhr, 720 - 104); // 616
      assert.equal(brother1.fasts, 60);

      const sister = estimateFromDuration(sisterOptions);
      assert.equal(sister.fajr, 720 - 168); // 552
      assert.equal(sister.dhuhr, 552); // Equal to fajr
      assert.equal(sister.fasts, 60);

      const brother2 = estimateFromDuration(brotherOptions);
      assert.deepEqual(brother1, brother2);
    });

    it('switching from Brother with custom exemptions to Sister ignores brother exemptions', () => {
      const brotherOptions = {
        years: 1,
        months: 0,
        profile: 'brother' as const,
        jumuahAttendance: 0.5, // 26 fridays
        customExemptionDays: 10,
      };
      const brother = estimateFromDuration(brotherOptions);
      assert.equal(brother.fajr, 350); // 360 - 10
      assert.equal(brother.dhuhr, 324); // 350 - 26

      // When switching to sister, even if prior brother settings are passed into options:
      const sisterWithStaleBrother = estimateFromDuration({
        ...brotherOptions,
        profile: 'sister',
        monthlyExemptionDays: 7,
      });
      // 360 - 84 = 276. Neither 26 Jumu'ah nor 10 custom days apply to sister.
      assert.equal(sisterWithStaleBrother.fajr, 276);
      assert.equal(sisterWithStaleBrother.dhuhr, 276);
      assert.equal(sisterWithStaleBrother.fasts, 30);
    });

    it('ensures zero negative numbers when exemptions exceed total days', () => {
      const counts = estimateFromDuration({
        years: 0,
        months: 1,
        profile: 'brother',
        jumuahAttendance: 1.0, // 4 fridays
        customExemptionDays: 50, // exceeds 30 days
      });

      assert.equal(counts.fajr, 0);
      assert.equal(counts.dhuhr, 0);
      assert.equal(counts.asr, 0);
      assert.equal(counts.maghrib, 0);
      assert.equal(counts.isha, 0);
      assert.equal(counts.witr, 0);
      assert.equal(counts.fasts, 0);
    });

    it('handles 0 years, 0 months cleanly', () => {
      const counts = estimateFromDuration({
        years: 0,
        months: 0,
        profile: 'brother',
      });
      assert.equal(counts.fajr, 0);
      assert.equal(counts.dhuhr, 0);
      assert.equal(counts.fasts, 0);
    });
  });

  describe('Backward compatibility', () => {
    it('supports original positional arguments', () => {
      // estimateFromDuration(years, months, includeExemption, missedFasts)
      const legacyWithExemption = estimateFromDuration(1, 0, true, 30);
      assert.equal(legacyWithExemption.fajr, 276);
      assert.equal(legacyWithExemption.dhuhr, 276);
      assert.equal(legacyWithExemption.fasts, 30);

      const legacyWithoutExemption = estimateFromDuration(1, 0, false, 30);
      assert.equal(legacyWithoutExemption.fajr, 360);
      assert.equal(legacyWithoutExemption.dhuhr, 360);
      assert.equal(legacyWithoutExemption.fasts, 30);
    });
  });

  describe('calculatePayoffProjection - Habit-Centered Projection', () => {
    const dummyRemaining = {
      fajr: 100,
      dhuhr: 100,
      asr: 100,
      maghrib: 100,
      isha: 100,
      witr: 100,
      fasts: 10,
    };

    it('returns habit-centered text for Gentle pace (1x)', () => {
      const projection = calculatePayoffProjection(dummyRemaining, 1);
      assert.equal(
        projection.dailyRecommendationText,
        "Insha'Allah, just ~3 extra minutes after each Farz will steadily clear your entire backlog.",
      );
    });

    it('returns habit-centered text for Steady pace (2x)', () => {
      const projection = calculatePayoffProjection(dummyRemaining, 2);
      assert.equal(
        projection.dailyRecommendationText,
        "Insha'Allah, just ~6 extra minutes after each Farz will steadily clear your entire backlog.",
      );
    });

    it('returns habit-centered text for Custom pace (e.g. 3x, 5x)', () => {
      const projection3 = calculatePayoffProjection(dummyRemaining, 3);
      assert.equal(
        projection3.dailyRecommendationText,
        "Insha'Allah, completing 3 extra prayer sets daily will steadily clear your entire backlog.",
      );

      const projection5 = calculatePayoffProjection(dummyRemaining, 5);
      assert.equal(
        projection5.dailyRecommendationText,
        "Insha'Allah, completing 5 extra prayer sets daily will steadily clear your entire backlog.",
      );
    });

    it('returns correct custom text when paceMode is custom even for 1 or 2 sets', () => {
      const custom1 = calculatePayoffProjection(dummyRemaining, 1, 'custom');
      assert.equal(
        custom1.dailyRecommendationText,
        "Insha'Allah, completing 1 extra prayer sets daily will steadily clear your entire backlog.",
      );

      const custom2 = calculatePayoffProjection(dummyRemaining, 2, 'custom');
      assert.equal(
        custom2.dailyRecommendationText,
        "Insha'Allah, completing 2 extra prayer sets daily will steadily clear your entire backlog.",
      );

      const gentleExplicit = calculatePayoffProjection(dummyRemaining, 1, 'gentle');
      assert.equal(
        gentleExplicit.dailyRecommendationText,
        "Insha'Allah, just ~3 extra minutes after each Farz will steadily clear your entire backlog.",
      );

      const steadyExplicit = calculatePayoffProjection(dummyRemaining, 2, 'steady');
      assert.equal(
        steadyExplicit.dailyRecommendationText,
        "Insha'Allah, just ~6 extra minutes after each Farz will steadily clear your entire backlog.",
      );
    });

    it('throws RangeError for invalid dailySetsTarget', () => {
      assert.throws(() => calculatePayoffProjection(dummyRemaining, 0), RangeError);
      assert.throws(() => calculatePayoffProjection(dummyRemaining, -1), RangeError);
    });
  });
});
