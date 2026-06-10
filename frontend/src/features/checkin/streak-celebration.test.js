import { describe, it, expect, beforeEach } from 'vitest';
import { StreakCelebration } from './streak-celebration.js';

describe('StreakCelebration', () => {
  beforeEach(() => {
    localStorage.clear();
    document.getElementById('streak-celebration')?.remove();
    document.getElementById('strc-styles')?.remove();
  });

  describe('nextMilestone', () => {
    it('returns the first milestone above the current streak', () => {
      expect(StreakCelebration.nextMilestone(0)).toBe(3);
      expect(StreakCelebration.nextMilestone(3)).toBe(7);
      expect(StreakCelebration.nextMilestone(10)).toBe(14);
      expect(StreakCelebration.nextMilestone(99)).toBe(100);
    });

    it('returns null beyond the last milestone', () => {
      expect(StreakCelebration.nextMilestone(365)).toBeNull();
      expect(StreakCelebration.nextMilestone(1000)).toBeNull();
    });
  });

  describe('maybeCelebrate', () => {
    it('does nothing below the first milestone', () => {
      expect(StreakCelebration.maybeCelebrate(2)).toBe(false);
      expect(document.getElementById('streak-celebration')).toBeNull();
    });

    it('shows the overlay when a milestone is reached', () => {
      expect(StreakCelebration.maybeCelebrate(3)).toBe(true);
      const overlay = document.getElementById('streak-celebration');
      expect(overlay).not.toBeNull();
      expect(overlay.textContent).toContain('3 dias seguidos');
    });

    it('never repeats the same milestone', () => {
      expect(StreakCelebration.maybeCelebrate(7)).toBe(true);
      document.getElementById('streak-celebration')?.remove();
      expect(StreakCelebration.maybeCelebrate(7)).toBe(false);
      expect(document.getElementById('streak-celebration')).toBeNull();
    });

    it('skips already-passed milestones after a larger one was celebrated', () => {
      expect(StreakCelebration.maybeCelebrate(30)).toBe(true);
      document.getElementById('streak-celebration')?.remove();
      expect(StreakCelebration.maybeCelebrate(14)).toBe(false);
    });

    it('celebrates the next milestone after an earlier one', () => {
      expect(StreakCelebration.maybeCelebrate(3)).toBe(true);
      document.getElementById('streak-celebration')?.remove();
      expect(StreakCelebration.maybeCelebrate(7)).toBe(true);
    });

    it('overlay is dismissible via the close button', () => {
      StreakCelebration.maybeCelebrate(3);
      const overlay = document.getElementById('streak-celebration');
      overlay.querySelector('[data-action="close"]').click();
      // close animates 250ms before removal — class flags the transition
      expect(overlay.classList.contains('strc-out')).toBe(true);
    });
  });
});
