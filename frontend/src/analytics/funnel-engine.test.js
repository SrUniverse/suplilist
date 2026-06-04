import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FunnelEngine } from './funnel-engine.js';
import { analyticsStorage } from './storage/analytics-storage.js';

let mockEvents = [];

vi.mock('./storage/analytics-storage.js', () => ({
  analyticsStorage: {
    addEvent: vi.fn(async (event) => {
      mockEvents.push(event);
    }),
    getEventsBetween: vi.fn(async (start, end) => {
      return mockEvents.filter(e => e.timestamp >= start && e.timestamp <= end);
    })
  }
}));

describe('funnel-engine — Progression & Dropoffs', () => {
  let engine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEvents = [];
    engine = new FunnelEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. constructor initializes predefined funnels', () => {
    const funnels = engine.getFunnels();
    expect(funnels.length).toBeGreaterThanOrEqual(4);
    expect(funnels.map(f => f.name)).toContain('free-to-premium');
    expect(funnels.map(f => f.name)).toContain('stack-adoption');
  });

  it('2. defineFunnel() creates custom funnels and validates step lengths', () => {
    engine.defineFunnel('my-custom', ['step1', 'step2', 'step3']);
    const customFunnel = engine.getFunnels().find(f => f.name === 'my-custom');
    expect(customFunnel).toBeDefined();
    expect(customFunnel.steps).toEqual(['step1', 'step2', 'step3']);

    // Validates step length
    expect(() => {
      engine.defineFunnel('too-short', ['step1']);
    }).toThrow('Funnel must have at least 2 steps');
  });

  it('3. trackFunnelStep() stores step progression only for active steps', async () => {
    await engine.trackFunnelStep('session-1', 'free-to-premium', 'app:ready');
    await engine.trackFunnelStep('session-1', 'free-to-premium', 'non-existent-step');

    expect(analyticsStorage.addEvent).toHaveBeenCalledTimes(1);
    expect(mockEvents).toHaveLength(1);
    expect(mockEvents[0].eventName).toBe('analytics:funnelStep');
    expect(mockEvents[0].payload.stepName).toBe('app:ready');
    expect(mockEvents[0].payload.stepIndex).toBe(0);
  });

  it('4. analyzeFunnel() computes progression counts, drops, conversion rates and generates warning/info insights', async () => {
    // Populate fake historical events
    const startMs = new Date('2026-06-01T00:00:00Z').getTime();

    // Session 1 completed all 4 steps
    mockEvents.push({ eventName: 'app:ready', sessionId: 's1', timestamp: startMs + 1000 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's1', timestamp: startMs + 2000 });
    mockEvents.push({ eventName: 'stack:itemAdded', sessionId: 's1', timestamp: startMs + 3000 });
    mockEvents.push({ eventName: 'premium:unlocked', sessionId: 's1', timestamp: startMs + 4000 });

    // Session 2 dropped off at step 3 (stack:itemAdded)
    mockEvents.push({ eventName: 'app:ready', sessionId: 's2', timestamp: startMs + 1000 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's2', timestamp: startMs + 2000 });
    mockEvents.push({ eventName: 'stack:itemAdded', sessionId: 's2', timestamp: startMs + 3000 });

    // Session 3 dropped off at step 2 (user:onboardingComplete)
    mockEvents.push({ eventName: 'app:ready', sessionId: 's3', timestamp: startMs + 1000 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's3', timestamp: startMs + 2000 });

    // Session 4 dropped off at step 1 (app:ready)
    mockEvents.push({ eventName: 'app:ready', sessionId: 's4', timestamp: startMs + 1000 });

    const analysis = await engine.analyzeFunnel('free-to-premium', '2026-06-01', '2026-06-02');

    expect(analysis.cohortSize).toBe(4);
    expect(analysis.totalCompletions).toBe(1); // Only s1 finished
    expect(analysis.conversionRate).toBe(25); // 1 out of 4 (25%)

    // Verify steps counts
    expect(analysis.steps[0].count).toBe(4); // app:ready
    expect(analysis.steps[1].count).toBe(3); // onboarding
    expect(analysis.steps[2].count).toBe(2); // stack
    expect(analysis.steps[3].count).toBe(1); // premium

    // Verify dropoffs
    expect(analysis.dropoffs[0].count).toBe(1); // 4 -> 3
    expect(analysis.dropoffs[0].percentage).toBe(25); // 25% drop rate

    // Verify insights
    expect(analysis.analysis.length).toBeGreaterThan(0);
    expect(analysis.analysis[0].type).toBe('warning');
    expect(analysis.analysis[0].message).toContain('Large dropoff');
  });

  it('5. analyzeFunnel() throws error for unknown funnels', async () => {
    await expect(engine.analyzeFunnel('unknown-funnel', '2026-06-01', '2026-06-02'))
      .rejects.toThrow('Unknown funnel');
  });

  it('6. compareFunnels() compares conversion metrics over two distinct ranges', async () => {
    const start1 = new Date('2026-06-01T00:00:00Z').getTime();
    const start2 = new Date('2026-06-08T00:00:00Z').getTime();

    // Period 1: 50% conversion
    mockEvents.push({ eventName: 'app:ready', sessionId: 's1', timestamp: start1 + 10 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's1', timestamp: start1 + 20 });
    mockEvents.push({ eventName: 'stack:itemAdded', sessionId: 's1', timestamp: start1 + 30 });
    mockEvents.push({ eventName: 'premium:unlocked', sessionId: 's1', timestamp: start1 + 40 });
    mockEvents.push({ eventName: 'app:ready', sessionId: 's2', timestamp: start1 + 10 });

    // Period 2: 100% conversion
    mockEvents.push({ eventName: 'app:ready', sessionId: 's3', timestamp: start2 + 10 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's3', timestamp: start2 + 20 });
    mockEvents.push({ eventName: 'stack:itemAdded', sessionId: 's3', timestamp: start2 + 30 });
    mockEvents.push({ eventName: 'premium:unlocked', sessionId: 's3', timestamp: start2 + 40 });

    const compareRes = await engine.compareFunnels(
      'free-to-premium',
      '2026-06-01', '2026-06-02',
      '2026-06-08', '2026-06-09'
    );

    expect(compareRes.delta.improved).toBe(true);
    expect(compareRes.delta.conversionRateChange).toBe(50); // 100% - 50%
    expect(compareRes.delta.cohortSizeChange).toBe(-1); // 1 cohort compared to 2
  });

  it('7. getStepConversionRate() gets transition percentages between steps', async () => {
    const startMs = new Date('2026-06-01T00:00:00Z').getTime();
    mockEvents.push({ eventName: 'app:ready', sessionId: 's1', timestamp: startMs + 10 });
    mockEvents.push({ eventName: 'user:onboardingComplete', sessionId: 's1', timestamp: startMs + 20 });
    mockEvents.push({ eventName: 'app:ready', sessionId: 's2', timestamp: startMs + 10 }); // Dropped off

    const rate = await engine.getStepConversionRate(
      'free-to-premium',
      'app:ready',
      'user:onboardingComplete',
      '2026-06-01',
      '2026-06-02'
    );

    expect(rate.usersAtFromStep).toBe(2);
    expect(rate.usersAtToStep).toBe(1);
    expect(rate.conversionRate).toBe(50); // 50% conversion

    // Missing transition error
    const errRate = await engine.getStepConversionRate(
      'free-to-premium',
      'app:ready',
      'premium:unlocked', // Non contiguous, not a direct step dropoff
      '2026-06-01',
      '2026-06-02'
    );

    expect(errRate.error).toBeDefined();
  });
});
