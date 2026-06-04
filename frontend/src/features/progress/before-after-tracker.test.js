import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProgressRecord,
  calculateTransformation,
  getMotivationMessage,
  correlateStackWithResults,
  estimateDaysToGoal,
  getPhotoComparisonConfig,
  generateTimeline,
} from './before-after-tracker.js';

describe('Before/After Progress Tracker', () => {
  let mockPhoto;
  let beforeMeasurements;
  let afterMeasurements;
  let beforeRecord;
  let afterRecord;

  beforeEach(() => {
    mockPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...';

    beforeMeasurements = {
      weight: 80,
      chest: 98,
      waist: 88,
      arms: 32,
      thighs: 56,
      bodyfat: 15,
    };

    afterMeasurements = {
      weight: 85,
      chest: 102,
      waist: 86,
      arms: 33,
      thighs: 58,
      bodyfat: 14,
    };

    beforeRecord = createProgressRecord(
      'before',
      mockPhoto,
      beforeMeasurements,
      JSON.stringify([{ supplementId: 'whey' }, { supplementId: 'creatine' }]),
      'bulk'
    );

    afterRecord = createProgressRecord(
      'after',
      mockPhoto,
      afterMeasurements,
      JSON.stringify([{ supplementId: 'whey' }, { supplementId: 'creatine' }]),
      'bulk'
    );
  });

  describe('createProgressRecord', () => {
    it('should create a before phase record', () => {
      const record = createProgressRecord(
        'before',
        mockPhoto,
        beforeMeasurements,
        '[]',
        'bulk'
      );

      expect(record.phase).toBe('before');
      expect(record.goal).toBe('bulk');
      expect(record.measurements.weight).toBe(80);
    });

    it('should create an after phase record', () => {
      const record = createProgressRecord(
        'after',
        mockPhoto,
        afterMeasurements,
        '[]',
        'bulk'
      );

      expect(record.phase).toBe('after');
      expect(record.measurements.weight).toBe(85);
    });

    it('should reject invalid phase', () => {
      expect(() => {
        createProgressRecord('midway', mockPhoto, beforeMeasurements, '[]', 'bulk');
      }).toThrow();
    });

    it('should reject missing photo', () => {
      expect(() => {
        createProgressRecord('before', '', beforeMeasurements, '[]', 'bulk');
      }).toThrow();
    });

    it('should require weight measurement', () => {
      const invalidMeasurements = {
        chest: 98,
        waist: 88,
      };

      expect(() => {
        createProgressRecord('before', mockPhoto, invalidMeasurements, '[]', 'bulk');
      }).toThrow('weight');
    });

    it('should require chest measurement', () => {
      const invalidMeasurements = {
        weight: 80,
        waist: 88,
      };

      expect(() => {
        createProgressRecord('before', mockPhoto, invalidMeasurements, '[]', 'bulk');
      }).toThrow('chest');
    });

    it('should require waist measurement', () => {
      const invalidMeasurements = {
        weight: 80,
        chest: 98,
      };

      expect(() => {
        createProgressRecord('before', mockPhoto, invalidMeasurements, '[]', 'bulk');
      }).toThrow('waist');
    });

    it('should make optional measurements optional', () => {
      const minimalMeasurements = {
        weight: 80,
        chest: 98,
        waist: 88,
      };

      const record = createProgressRecord('before', mockPhoto, minimalMeasurements, '[]', 'bulk');

      expect(record.measurements.arms).toBeNull();
      expect(record.measurements.bodyfat).toBeNull();
    });

    it('should assign unique ID with timestamp', () => {
      const record1 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');
      const record2 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');

      expect(record1.id).not.toBe(record2.id);
      expect(record1.id).toMatch(/^progress_[0-9a-f-]{36}$/);
    });

    it('should store stack snapshot as-is', () => {
      const stack = JSON.stringify([{ supplementId: 'whey' }]);
      const record = createProgressRecord('before', mockPhoto, beforeMeasurements, stack, 'bulk');

      expect(record.stackSnapshot).toBe(stack);
    });
  });

  describe('calculateTransformation', () => {
    it('should calculate weight change for bulk', () => {
      const transformation = calculateTransformation(beforeRecord, afterRecord, 30);

      expect(transformation.weightChange).toBe(5);
      expect(transformation.weightChangePercent).toBe(6.3);
    });

    it('should calculate measurements changes', () => {
      const transformation = calculateTransformation(beforeRecord, afterRecord, 30);

      expect(transformation.chestChange).toBeCloseTo(4, 1);
      expect(transformation.waistChange).toBeCloseTo(-2, 1);
      expect(transformation.armsChange).toBeCloseTo(1, 1);
    });

    it('should detect bulk phase', () => {
      const transformation = calculateTransformation(beforeRecord, afterRecord, 30);

      expect(transformation.phase).toBe('bulk');
    });

    it('should detect cut phase', () => {
      const cutBefore = createProgressRecord('before', mockPhoto, { weight: 85, chest: 102, waist: 88, arms: 33 }, '[]', 'cut');
      const cutAfter = createProgressRecord('after', mockPhoto, { weight: 78, chest: 99, waist: 83, arms: 31 }, '[]', 'cut');

      const transformation = calculateTransformation(cutBefore, cutAfter, 30);

      expect(transformation.phase).toBe('cut');
    });

    it('should detect recomposition', () => {
      const recBefore = createProgressRecord('before', mockPhoto, { weight: 80, chest: 98, waist: 88, arms: 32 }, '[]', 'general');
      const recAfter = createProgressRecord('after', mockPhoto, { weight: 80, chest: 101, waist: 86, arms: 33 }, '[]', 'general');

      const transformation = calculateTransformation(recBefore, recAfter, 30);

      expect(transformation.phase).toBe('recomp');
    });

    it('should handle null records', () => {
      expect(calculateTransformation(null, afterRecord, 30)).toBeNull();
      expect(calculateTransformation(beforeRecord, null, 30)).toBeNull();
    });

    it('should round changes to 1 decimal', () => {
      const transformation = calculateTransformation(beforeRecord, afterRecord, 30);

      expect(transformation.chestChange).toBe(Math.round(4 * 10) / 10);
      expect(transformation.bodyfatChange).toBe(Math.round(-1 * 10) / 10);
    });
  });

  describe('getMotivationMessage', () => {
    it('should show first-time message when no transformation', () => {
      const message = getMotivationMessage(null, 'bulk');

      expect(message).toContain('Capture your first');
    });

    it('should show consistency message for bulk', () => {
      const transformation = calculateTransformation(beforeRecord, afterRecord, 30);
      const message = getMotivationMessage(transformation, 'bulk');

      expect(message).toContain('bulk') || expect(message).toContain('Ganho');
    });

    it('should show consistency message for cut', () => {
      const cutBefore = createProgressRecord('before', mockPhoto, { weight: 85, chest: 102, waist: 88 }, '[]', 'cut');
      const cutAfter = createProgressRecord('after', mockPhoto, { weight: 78, chest: 99, waist: 83 }, '[]', 'cut');

      const transformation = calculateTransformation(cutBefore, cutAfter, 30);
      const message = getMotivationMessage(transformation, 'cut');

      expect(message).toContain('Perda');
    });
  });

  describe('correlateStackWithResults', () => {
    it('should correlate supplements with transformation results', () => {
      const supplements = [
        { supplementId: 'whey', name: 'Whey Protein' },
        { supplementId: 'creatine', name: 'Creatina' },
      ];

      const correlation = correlateStackWithResults(beforeRecord, afterRecord, supplements);

      expect(correlation.length).toBeGreaterThan(0);
      expect(correlation[0].supplementId).toBeDefined();
      expect(correlation[0].roi).toBeDefined();
    });

    it('should rate supplements based on phase', () => {
      const supplements = [
        { supplementId: 'whey', name: 'Whey Protein' },
        { supplementId: 'bcaa', name: 'BCAA' },
      ];

      const correlation = correlateStackWithResults(beforeRecord, afterRecord, supplements);

      const wheyCorr = correlation.find(c => c.supplementId === 'whey');
      expect(wheyCorr.roi).toBeGreaterThan(50);
    });

    it('should handle invalid stack snapshot', () => {
      const badRecord = createProgressRecord('before', mockPhoto, beforeMeasurements, 'invalid json', 'bulk');
      const supplements = [{ supplementId: 'whey', name: 'Whey' }];

      const correlation = correlateStackWithResults(badRecord, afterRecord, supplements);

      expect(correlation.length).toBe(0);
    });

    it('should mark high ROI supplements as likely effective', () => {
      const supplements = [{ supplementId: 'whey', name: 'Whey' }];
      const correlation = correlateStackWithResults(beforeRecord, afterRecord, supplements);

      const whey = correlation.find(c => c.supplementId === 'whey');
      expect(whey.likely_effective).toBe(true);
    });
  });

  describe('estimateDaysToGoal', () => {
    it('should estimate days to reach weight goal', () => {
      const targetMeasurements = {
        weight: 90,
        chest: 106,
        waist: 84,
      };

      const days = estimateDaysToGoal(beforeRecord, afterRecord, targetMeasurements);

      expect(days).toBeGreaterThan(0);
    });

    it('should return 0 if already at goal', () => {
      const targetMeasurements = {
        weight: 85,
        chest: 102,
        waist: 86,
      };

      const days = estimateDaysToGoal(beforeRecord, afterRecord, targetMeasurements);

      expect(days).toBe(0);
    });

    it('should return null if velocity is 0', () => {
      const noChangeBefore = createProgressRecord('before', mockPhoto, afterMeasurements, '[]', 'bulk');
      const days = estimateDaysToGoal(noChangeBefore, afterRecord, { weight: 100 });

      expect(days).toBeNull();
    });

    it('should handle null inputs gracefully', () => {
      expect(estimateDaysToGoal(null, afterRecord, { weight: 90 })).toBeNull();
      expect(estimateDaysToGoal(beforeRecord, null, { weight: 90 })).toBeNull();
    });
  });

  describe('getPhotoComparisonConfig', () => {
    it('should return comparison config', () => {
      const config = getPhotoComparisonConfig(beforeRecord, afterRecord);

      expect(config.beforePhoto).toBe(mockPhoto);
      expect(config.afterPhoto).toBe(mockPhoto);
      expect(config.transitionEffect).toBeDefined();
    });

    it('should format dates in pt-BR locale', () => {
      const config = getPhotoComparisonConfig(beforeRecord, afterRecord);

      expect(config.beforeDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(config.afterDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should return null for missing records', () => {
      expect(getPhotoComparisonConfig(null, afterRecord)).toBeNull();
      expect(getPhotoComparisonConfig(beforeRecord, null)).toBeNull();
    });
  });

  describe('generateTimeline', () => {
    it('should generate timeline for multiple records', () => {
      const record1 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');
      const record2 = createProgressRecord('after', mockPhoto, { weight: 82, chest: 100, waist: 87, arms: 32 }, '[]', 'bulk');
      const record3 = createProgressRecord('after', mockPhoto, afterMeasurements, '[]', 'bulk');

      const timeline = generateTimeline([record1, record2, record3]);

      expect(timeline.length).toBe(2);
    });

    it('should sort records chronologically', () => {
      const record1 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');
      // Manually create record with different timestamp
      const record2 = {
        ...record1,
        recordedAt: record1.recordedAt - (10 * 24 * 60 * 60 * 1000), // 10 days before
      };

      const timeline = generateTimeline([record1, record2]);

      expect(timeline[0].from).toBeDefined();
    });

    it('should calculate duration in days', () => {
      const record1 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');
      const record2 = createProgressRecord('after', mockPhoto, afterMeasurements, '[]', 'bulk');

      const timeline = generateTimeline([record1, record2]);

      expect(timeline[0].duration).toBeCloseTo(0, 1); // Should be ~0 since created at same time in tests
    });

    it('should include transformation data in timeline', () => {
      const record1 = createProgressRecord('before', mockPhoto, beforeMeasurements, '[]', 'bulk');
      const record2 = createProgressRecord('after', mockPhoto, afterMeasurements, '[]', 'bulk');

      const timeline = generateTimeline([record1, record2]);

      expect(timeline[0].transformation).toBeDefined();
      expect(timeline[0].transformation.weightChange).toBeDefined();
    });

    it('should handle empty array', () => {
      const timeline = generateTimeline([]);
      expect(timeline.length).toBe(0);
    });

    it('should handle null', () => {
      const timeline = generateTimeline(null);
      expect(timeline.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full transformation tracking workflow', () => {
      // Create before record
      const before = createProgressRecord('before', mockPhoto, beforeMeasurements, JSON.stringify([{ supplementId: 'whey' }]), 'bulk');
      expect(before).toBeDefined();

      // Create after record
      const after = createProgressRecord('after', mockPhoto, afterMeasurements, JSON.stringify([{ supplementId: 'whey' }]), 'bulk');
      expect(after).toBeDefined();

      // Calculate transformation
      const transformation = calculateTransformation(before, after, 30);
      expect(transformation.weightChange).toBe(5);

      // Get motivation
      const motivation = getMotivationMessage(transformation, 'bulk');
      expect(motivation).toBeTruthy();

      // Correlate with supplements
      const correlation = correlateStackWithResults(before, after, [{ supplementId: 'whey', name: 'Whey' }]);
      expect(correlation.length).toBeGreaterThan(0);

      // Get photo comparison
      const photoConfig = getPhotoComparisonConfig(before, after);
      expect(photoConfig.beforePhoto).toBe(mockPhoto);
    });

    it('should track progress across multiple phases', () => {
      const phase1Before = createProgressRecord('before', mockPhoto, { weight: 75, chest: 95, waist: 85 }, '[]', 'bulk');
      const phase1After = createProgressRecord('after', mockPhoto, { weight: 80, chest: 99, waist: 86 }, '[]', 'bulk');
      const phase2After = createProgressRecord('after', mockPhoto, { weight: 78, chest: 98, waist: 84 }, '[]', 'cut');

      const timeline = generateTimeline([phase1Before, phase1After, phase2After]);

      expect(timeline.length).toBe(2);
      expect(timeline[0].transformation.phase).toBe('bulk');
    });
  });
});
