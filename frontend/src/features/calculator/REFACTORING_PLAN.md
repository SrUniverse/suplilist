# Calculator Page Refactoring Plan

## Current State
- **File:** `calculator-page.js`
- **Size:** 860 lines
- **Issue:** Complex calculation logic mixed with DOM rendering

## Problem
Calculator pages typically mix:
1. **Business logic** — Dose calculations, unit conversions, validations
2. **UI rendering** — Forms, results display, animations
3. **State management** — Form state, result caching

This makes it hard to:
- Test calculation logic independently
- Reuse calculations in other contexts (API, workers)
- Update UI without touching calculations

---

## Target Architecture

### 1. calculator-engine.js (~200 lines)
**Pure business logic — zero DOM dependencies**

```javascript
/**
 * Pure calculator engine with no DOM dependencies
 * All functions are pure and easily testable
 */

/**
 * Calculate daily supplement dosage based on user profile
 * @param {Object} profile - User profile
 * @param {string} supplementId - Supplement ID
 * @param {string} objective - Training objective
 * @returns {Object} { dosage, unit, timing, warnings }
 */
export function calculateDosage(profile, supplementId, objective) {
  // Weight-based calculation
  // Objective-specific adjustments
  // Unit conversions
  // Safety checks
  return { dosage, unit, timing, warnings };
}

/**
 * Convert between supplement units (g, mg, mcg, caps, ml)
 * @param {number} amount - Amount to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted amount
 */
export function convertUnits(amount, fromUnit, toUnit) {
  // Handle all unit conversions
}

/**
 * Calculate monthly cost based on daily dosage
 * @param {number} dailyDosage - Daily dosage amount
 * @param {string} unit - Dosage unit
 * @param {number} pricePerUnit - Price per unit
 * @returns {number} Monthly cost in R$
 */
export function calculateMonthlyCost(dailyDosage, unit, pricePerUnit) {
  // Cost estimation
}

/**
 * Validate user input for calculations
 * @param {Object} input - User input
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateInput(input) {
  // Weight range checks
  // Objective validation
  // Supplement existence
}
```

### 2. calculator-formatter.js (~100 lines)
**Presentation logic — formats results for display**

```javascript
/**
 * Format dosage for display
 * @param {number} dosage - Dosage amount
 * @param {string} unit - Unit (g, mg, mcg)
 * @returns {string} Formatted string (e.g., "5.0 g", "500 mg")
 */
export function formatDosage(dosage, unit) {
  // Number formatting
  // Unit display
}

/**
 * Format currency for display
 * @param {number} amount - Amount in R$
 * @returns {string} Formatted string (e.g., "R$ 129,90")
 */
export function formatCurrency(amount) {
  // Brazilian currency formatting
}

/**
 * Format timing recommendations
 * @param {string} timing - Raw timing data
 * @returns {string} User-friendly timing (e.g., "Pré-treino")
 */
export function formatTiming(timing) {
  // Human-readable timing
}
```

### 3. calculator-page.js (~400 lines)
**UI orchestrator — handles rendering and user interactions**

```javascript
import {
  calculateDosage,
  convertUnits,
  calculateMonthlyCost,
  validateInput
} from './calculator-engine.js';
import {
  formatDosage,
  formatCurrency,
  formatTiming
} from './calculator-formatter.js';

/**
 * CalculatorPage — Dosage calculator with separated concerns
 */
export default class CalculatorPage {
  constructor(container) {
    this.container = container;
    this._formState = {};
  }

  mount() {
    this._attachStyles();
    this._render();
    this._attachListeners();
  }

  _onCalculate(event) {
    event.preventDefault();

    // 1. Get form data
    const profile = this._getFormData();

    // 2. Validate (pure function)
    const validation = validateInput(profile);
    if (!validation.valid) {
      this._showErrors(validation.errors);
      return;
    }

    // 3. Calculate (pure function)
    const result = calculateDosage(
      profile,
      this._selectedSupplementId,
      profile.objective
    );

    // 4. Format (pure function)
    const formatted = {
      dosage: formatDosage(result.dosage, result.unit),
      cost: formatCurrency(result.monthlyCost),
      timing: formatTiming(result.timing)
    };

    // 5. Render
    this._renderResult(formatted, result.warnings);
  }

  _render() {
    // UI scaffolding only
    // No calculations here
  }
}
```

### 4. calculator-engine.test.js (~150 lines)
**Pure unit tests — no DOM, fast execution**

```javascript
import { describe, it, expect } from 'vitest';
import {
  calculateDosage,
  convertUnits,
  calculateMonthlyCost,
  validateInput
} from './calculator-engine.js';

describe('Calculator Engine', () => {
  it('calculates creatine dosage for 75kg bulk', () => {
    const result = calculateDosage(
      { weight: 75, biologicalSex: 'M' },
      'creatina-monohidratada',
      'bulk'
    );

    expect(result.dosage).toBe(5);
    expect(result.unit).toBe('g');
    expect(result.timing).toBe('Qualquer hora');
  });

  it('converts 5000mg to 5g', () => {
    expect(convertUnits(5000, 'mg', 'g')).toBe(5);
  });

  it('calculates monthly cost correctly', () => {
    const cost = calculateMonthlyCost(5, 'g', 0.50); // R$ 0.50/g
    expect(cost).toBe(75); // 5g/day * 30 days * R$ 0.50 = R$ 75
  });

  it('validates weight range', () => {
    const result = validateInput({ weight: 300 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Peso fora do intervalo');
  });
});
```

---

## Benefits

### Before (860 lines)
```javascript
// Everything mixed together
class CalculatorPage {
  _onCalculate() {
    // Read form
    // Validate inline
    // Calculate inline
    // Format inline
    // Render inline
    // Hard to test (needs DOM)
  }
}
```

### After (400 + 200 + 100 + 150 lines)
```javascript
// Separated concerns
// calculator-engine.js — Pure logic, easy to test
// calculator-formatter.js — Presentation, easy to test
// calculator-page.js — UI only, integration tests
// calculator-engine.test.js — Fast unit tests
```

**Advantages:**
- ✅ **Testability:** Logic tested without DOM (10x faster)
- ✅ **Reusability:** Engine can be used in API, workers, other pages
- ✅ **Maintainability:** Change calculations without touching UI
- ✅ **Type Safety:** Engine functions have clear JSDoc types
- ✅ **Performance:** Pure functions can be memoized

---

## Implementation Steps

### Step 1: Extract Engine (1 hour)
```bash
# Create calculator-engine.js
# Copy all calculation functions
# Remove DOM dependencies
# Add JSDoc types
# Make all functions pure (no side effects)
```

### Step 2: Extract Formatter (30 min)
```bash
# Create calculator-formatter.js
# Copy all formatting functions
# Ensure pure functions (input → output)
```

### Step 3: Write Engine Tests (1 hour)
```bash
# Create calculator-engine.test.js
# Test all calculation scenarios
# Test edge cases (0 weight, invalid units)
# Test all unit conversions
# Aim for 100% coverage of engine
```

### Step 4: Refactor Page (30 min)
```bash
# Update calculator-page.js imports
# Replace inline calculations with engine calls
# Replace inline formatting with formatter calls
# Keep only UI/DOM logic
```

### Step 5: Verify (15 min)
```bash
# Run all tests
npm test -- calculator

# Manual test in browser
npm run dev
# Navigate to calculator
# Test all form combinations
```

---

## ROI Analysis

**Time investment:** 3 hours  
**Maintenance savings:** 40% faster future changes  
**Test execution:** 10x faster (pure functions vs DOM)  
**Reusability:** Engine can be used in 3+ other contexts

**Medium ROI** because:
- Calculator is not the most-used feature
- But calculation bugs are critical (wrong dosages!)
- Reusable engine opens new possibilities (API, AI chatbot)

---

## Example: Before & After

### Before (mixed concerns)
```javascript
_onCalculate() {
  const weight = parseFloat(this.container.querySelector('#weight').value);
  if (weight < 40 || weight > 150) {
    alert('Peso inválido');
    return;
  }

  let dosage;
  if (this._selectedId === 'creatina') {
    dosage = 5; // hardcoded
  } else if (this._selectedId === 'whey') {
    dosage = weight * 1.5; // inline calculation
  }

  const cost = dosage * 30 * 0.50;
  const formatted = `R$ ${cost.toFixed(2).replace('.', ',')}`;

  this.container.querySelector('#result').innerHTML = `
    <div>Dose: ${dosage}g</div>
    <div>Custo: ${formatted}</div>
  `;
}
```

### After (separated concerns)
```javascript
_onCalculate() {
  // 1. Get form data (UI concern)
  const profile = this._getFormData();

  // 2. Validate (pure function from engine)
  const validation = validateInput(profile);
  if (!validation.valid) {
    this._showErrors(validation.errors);
    return;
  }

  // 3. Calculate (pure function from engine)
  const result = calculateDosage(profile, this._selectedId, profile.objective);

  // 4. Format (pure function from formatter)
  const formatted = {
    dosage: formatDosage(result.dosage, result.unit),
    cost: formatCurrency(result.monthlyCost)
  };

  // 5. Render (UI concern)
  this._renderResult(formatted);
}
```

**Testability comparison:**

**Before:** Need to mock entire DOM, slow, brittle  
**After:** Engine tests are pure functions, fast, reliable

```javascript
// Before: Hard to test
it('calculates dosage', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const page = new CalculatorPage(document.getElementById('app'));
  await page.mount();
  document.getElementById('weight').value = '75';
  document.getElementById('supplement').value = 'creatina';
  document.querySelector('button').click();
  expect(document.querySelector('#result').textContent).toContain('5g');
});

// After: Easy to test
it('calculates dosage', () => {
  const result = calculateDosage({ weight: 75 }, 'creatina', 'bulk');
  expect(result.dosage).toBe(5);
  expect(result.unit).toBe('g');
});
```

---

## Future Enhancements (Enabled by Refactoring)

Once engine is extracted:

1. **API Endpoint:** `POST /api/calculate-dosage`
2. **AI Chatbot:** "Quanto de creatina devo tomar?" → call engine
3. **Background Workers:** Batch calculations for analytics
4. **Mobile App:** Share engine between web/mobile
5. **CLI Tool:** `suplilist calc --weight 75 --supplement creatina`

---

**Estimated time:** 3 hours  
**Priority:** 🟠 ALTA (calculation correctness is critical)  
**ROI:** MÉDIO (niche feature but high stakes)
