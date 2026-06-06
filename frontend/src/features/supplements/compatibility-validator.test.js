import { describe, it, expect } from 'vitest';
import CompatibilityValidator from './compatibility-validator.js';

describe('CompatibilityValidator', () => {
  it('should detect iron-calcium interaction', () => {
    const interaction = CompatibilityValidator.checkInteraction('iron', 'calcium');
    expect(interaction).toBeDefined();
    expect(interaction.severity).toBe('moderate');
  });

  it('should detect positive vitamin D-calcium synergy', () => {
    const interaction = CompatibilityValidator.checkInteraction('calcium', 'vitamin-d');
    expect(interaction.severity).toBe('positive');
  });

  it('should return null for no interaction', () => {
    const interaction = CompatibilityValidator.checkInteraction('vitamin-a', 'vitamin-b12');
    expect(interaction).toBeNull();
  });

  it('should validate stack with no issues', () => {
    const stack = [
      { supplementId: 'calcium', name: 'Calcium' },
      { supplementId: 'vitamin-d', name: 'Vitamin D' }
    ];
    const result = CompatibilityValidator.validateStack(stack);
    expect(result.isValid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should flag moderate interaction in stack', () => {
    const stack = [
      { supplementId: 'iron', name: 'Iron' },
      { supplementId: 'calcium', name: 'Calcium' }
    ];
    const result = CompatibilityValidator.validateStack(stack);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect critical warfarin-vitamin K interaction', () => {
    const stack = [
      { supplementId: 'vitamin-k', name: 'Vitamin K' },
      { supplementId: 'warfarin', name: 'Warfarin' }
    ];
    const result = CompatibilityValidator.validateStack(stack);
    expect(result.criticalIssues.length).toBeGreaterThan(0);
  });

  it('should check contraindications for pregnancy', () => {
    const stack = [
      { supplementId: 'vitamin-a-high-dose', name: 'High Dose Vitamin A' }
    ];
    const contraindications = CompatibilityValidator.checkContraindications(
      stack,
      ['pregnancy']
    );
    expect(contraindications.length).toBeGreaterThan(0);
  });

  it('should not flag contraindication for different condition', () => {
    const stack = [
      { supplementId: 'vitamin-d', name: 'Vitamin D' }
    ];
    const contraindications = CompatibilityValidator.checkContraindications(
      stack,
      ['pregnancy']
    );
    expect(contraindications.length).toBe(0);
  });

  it('should calculate compatibility score', () => {
    const stack = [
      { supplementId: 'calcium', name: 'Calcium' },
      { supplementId: 'magnesium', name: 'Magnesium' }
    ];
    const score = CompatibilityValidator.getCompatibilityScore('vitamin-d', stack);

    expect(score).toHaveProperty('score');
    expect(score).toHaveProperty('compatibility');
    expect(score.score).toBeGreaterThan(50);
  });

  it('should suggest good pairings', () => {
    const stack = [
      { id: 'calcium', name: 'Calcium' }
    ];
    const available = [
      { id: 'vitamin-d', name: 'Vitamin D' },
      { id: 'iron', name: 'Iron' }
    ];

    const suggestions = CompatibilityValidator.getSuggestedPairings(stack, available);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].id).toBe('vitamin-d'); // Should rank higher
  });

  it('should generate comprehensive compatibility report', () => {
    const stack = [
      { supplementId: 'iron', name: 'Iron' },
      { supplementId: 'calcium', name: 'Calcium' },
      { supplementId: 'vitamin-d', name: 'Vitamin D' }
    ];

    const report = CompatibilityValidator.generateReport(stack, []);

    expect(report).toHaveProperty('validationResult');
    expect(report).toHaveProperty('issues');
    expect(report).toHaveProperty('details');
    expect(report.timestamp).toBeDefined();
  });

  it('should provide actionable recommendations', () => {
    const stack = [
      { supplementId: 'iron', name: 'Iron' },
      { supplementId: 'calcium', name: 'Calcium' }
    ];

    const report = CompatibilityValidator.generateReport(stack);
    const recommendations = report.details.recommendations;

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('action');
  });

  it('should handle empty stack', () => {
    const result = CompatibilityValidator.validateStack([]);
    expect(result.isValid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should handle single item stack', () => {
    const stack = [{ supplementId: 'vitamin-d', name: 'Vitamin D' }];
    const result = CompatibilityValidator.validateStack(stack);
    expect(result.isValid).toBe(true);
  });
});
