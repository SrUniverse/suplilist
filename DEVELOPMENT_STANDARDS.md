# Development Standards - SupliList

**Data**: 2026-06-02  
**Versão**: 1.0  
**Propósito**: Guiar desenvolvimento consistente e de qualidade

---

## 📋 Overview

Este documento define padrões para:
- ✅ Code style e conventions
- ✅ Testing requirements
- ✅ Git workflow
- ✅ Performance budgets
- ✅ Accessibility standards
- ✅ Documentation requirements
- ✅ Code review process

**Objetivo**: Manter código consistente, testado, acessível e bem documentado.

---

## 1️⃣ Code Style & Conventions

### JavaScript/JSDoc Types

#### Rule: Always add JSDoc for public APIs

```javascript
// ✅ CORRECT
/**
 * Validates a supplement event
 * @param {Object} event - The event to validate
 * @param {string} event.type - Event type (required)
 * @param {number} event.timestamp - Unix timestamp (required)
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateEvent(event) {
  if (!event.type) throw new Error('Missing type');
  return true;
}

// ❌ WRONG - No documentation
function validateEvent(event) {
  if (!event.type) throw new Error('Missing type');
  return true;
}
```

#### Rule: Use consistent naming conventions

```javascript
// Classes: PascalCase
class StateManager { }
class AnalyticsEngine { }

// Functions: camelCase
function updateState() { }
function handleClick() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_ENDPOINT = 'http://...';

// Private: prefix with underscore
function _internalHelper() { }
const _privateData = {};
```

#### Rule: Use descriptive names

```javascript
// ✅ GOOD
const userSupplementStack = [...];
const isCurrentPageLoading = true;
function calculateSupplementDosage(weight, supplement) { }

// ❌ BAD
const data = [...];
const loading = true;
function calc(w, s) { }
```

---

### CSS Naming

#### Rule: Use BEM-like naming

```css
/* Block */
.supplement-card { }

/* Block + Element */
.supplement-card__title { }
.supplement-card__price { }

/* Block + Element + Modifier */
.supplement-card--featured { }
.supplement-card__price--discounted { }

/* Utility classes are OK */
.m-auto { }  /* margin: auto */
.text-center { }
.flex { }
```

#### Rule: Mobile-first responsive

```css
/* Mobile first (base) */
.button {
  padding: 12px 16px;
  font-size: 14px;
}

/* Tablet and above */
@media (min-width: 768px) {
  .button {
    padding: 16px 20px;
    font-size: 16px;
  }
}

/* Desktop and above */
@media (min-width: 1200px) {
  .button {
    padding: 20px 24px;
    font-size: 18px;
  }
}
```

---

### Comments & Documentation

#### Rule: Comment WHY, not WHAT

```javascript
// ❌ BAD - Describes what code does (obvious from reading)
// Increment i
i++;

// Check if user exists
if (user) { }

// ✅ GOOD - Explains WHY
// Virtual scroll requires the list to be visible before rendering
// to calculate item heights. This ensures viewport dimensions are set.
if (isVisible) {
  calculateItemHeights();
}

// Rate limit to prevent DDoS and excess analytics events
const MAX_EVENTS_PER_MINUTE = 100;
```

#### Rule: Keep comments up to date

```javascript
// ✅ GOOD - Updated when code changes
// Timeout increased from 5s to 10s due to slow network on 4G
const FETCH_TIMEOUT = 10000;

// ❌ BAD - Outdated comment
// Timeout is 5 seconds (but it's actually 10000ms now)
const FETCH_TIMEOUT = 10000;
```

---

## 2️⃣ Testing Requirements

### Unit Tests

#### Rule: Test public APIs

```javascript
// ✅ GOOD
describe('calculateDosage', () => {
  it('should calculate correct dosage for weight', () => {
    const result = calculateDosage(70, 'creatine');
    expect(result).toBe(5); // 70kg * 5g/kg = 350g (that's wrong lol but example)
  });

  it('should throw error for invalid weight', () => {
    expect(() => calculateDosage(-10, 'creatine')).toThrow();
  });
});
```

#### Rule: 60% minimum coverage for critical code

```bash
# Check coverage
npm run test:coverage

# Target:
# statements: 60%
# branches: 50%
# functions: 60%
# lines: 60%
```

#### Rule: Test edge cases

```javascript
// GOOD edge cases
describe('parseUserInput', () => {
  it('should handle empty string', () => { });
  it('should handle null', () => { });
  it('should handle undefined', () => { });
  it('should handle special characters', () => { });
  it('should handle very long strings', () => { });
});
```

---

### E2E Tests

#### Rule: Test critical user journeys

```typescript
// GOOD critical paths
test('User can add supplement to stack', async ({ page }) => {
  // 1. Load page
  // 2. Search for supplement
  // 3. Click add
  // 4. Verify added to stack
  // 5. Verify persisted
});

test('Check-in flow works on mobile', async ({ page }) => {
  // Mobile-specific flow
});
```

#### Rule: Every feature requires tests

```
Before shipping:
- [ ] Unit tests pass (80%+ coverage for new code)
- [ ] E2E tests pass
- [ ] Lighthouse score OK
- [ ] Accessibility tests pass
- [ ] Code review passed
- [ ] Manual testing on device
```

---

## 3️⃣ Git Workflow

### Commit Messages

#### Rule: Clear, descriptive commits

```bash
# ✅ GOOD
git commit -m "feat: add dosage calculator for whey protein

- Implement calculateProteinDosage function
- Add validation for user weight
- Display results in calculator page
- Add tests for edge cases"

# ❌ BAD
git commit -m "fix stuff"
git commit -m "updates"
```

### Branch Naming

```bash
# Features
git checkout -b feature/add-dosage-calculator

# Fixes
git checkout -b fix/virtual-scroll-crash

# Refactor
git checkout -b refactor/consolidate-analytics

# Docs
git checkout -b docs/architecture-guide

# Chore
git checkout -b chore/update-dependencies
```

### Code Review Checklist

```markdown
Before merging:
- [ ] Tests added (80%+ coverage)
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] JSDoc added for public APIs
- [ ] Accessibility checked
- [ ] Performance checked (Lighthouse)
- [ ] Code style follows standards
- [ ] No breaking changes (or documented)
- [ ] CHANGELOG updated
```

---

## 4️⃣ Performance Budgets

### Web Vitals Targets

```
Target Metrics:
- FCP (First Contentful Paint): < 1800ms ✅
- LCP (Largest Contentful Paint): < 2500ms ✅
- CLS (Cumulative Layout Shift): < 0.1 ✅
- FID (First Input Delay): < 100ms ✅
- TTFB (Time to First Byte): < 600ms ✅

Rules:
- [ ] Each new feature must not decrease metrics
- [ ] Bundle size < 70KB (gzipped)
- [ ] Lighthouse score ≥ 90
- [ ] Accessibility score ≥ 95
```

### Optimization Checklist

```
For each feature:
- [ ] Images optimized (WebP format)
- [ ] Lazy loading where applicable
- [ ] Code splitting considered
- [ ] Lighthouse audited
- [ ] Mobile 4G tested
- [ ] No unnecessary re-renders
- [ ] CSS minified
- [ ] No memory leaks
```

---

## 5️⃣ Accessibility Standards

### WCAG 2.1 Level AA Compliance

#### Rule: Touch targets ≥ 44×44px

```html
<!-- ✅ GOOD -->
<button style="width: 48px; height: 48px;">Add</button>

<!-- ❌ BAD -->
<button style="width: 28px; height: 28px;">Add</button>
```

#### Rule: Font size ≥ 12px (16px on iOS)

```css
/* ✅ GOOD */
.button { font-size: 16px; }
.text { font-size: 14px; }

/* ❌ BAD */
.button { font-size: 10px; }
```

#### Rule: Color contrast ≥ 4.5:1 for normal text

```css
/* ✅ GOOD - 8.2:1 contrast */
color: #333333;
background: #ffffff;

/* ❌ BAD - 2.1:1 contrast (fails) */
color: #999999;
background: #ffffff;
```

#### Rule: Keyboard navigation required

```javascript
// ✅ GOOD - All interactive elements tabbable
<button>Click me</button>
<input type="text">
<a href="...">Link</a>

// ❌ BAD - <div> not keyboard accessible
<div onclick="action()">Not accessible</div>
// Use: <button onclick="action()">Click me</button>
```

#### Rule: ARIA labels for form inputs

```html
<!-- ✅ GOOD -->
<label for="weight">Weight (kg):</label>
<input id="weight" type="number">

<!-- ❌ BAD -->
<input type="number"> <!-- No label -->
```

---

## 6️⃣ Documentation Requirements

### JSDoc Template

```javascript
/**
 * Brief description of what function does
 *
 * Longer description if needed. Explain:
 * - What it does
 * - Why you'd use it
 * - Any important notes
 *
 * @param {type} paramName - Description of parameter
 * @param {type} [optionalParam] - Optional parameter (brackets)
 * @returns {type} Description of return value
 * @throws {ErrorType} When this error is thrown
 *
 * @example
 * const result = myFunction('value');
 * console.log(result); // output
 */
function myFunction(paramName, optionalParam) {
  // implementation
}
```

### README Requirements

```markdown
- Project overview (1 paragraph)
- Features list
- Tech stack
- Setup instructions
- How to run tests
- How to build
- Project structure
- Contributing guidelines
- License
```

### Architecture Documentation

```
For complex systems:
- [ ] Data flow diagram
- [ ] Component interactions
- [ ] State shape definition
- [ ] Event types listed
- [ ] External dependencies explained
```

---

## 7️⃣ Code Review Process

### Reviewer Checklist

```
Functionality:
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Errors are handled
- [ ] No infinite loops

Quality:
- [ ] Tests added/updated
- [ ] No console.log statements
- [ ] Follows code style
- [ ] No duplicated code
- [ ] JSDoc added

Performance:
- [ ] No performance regressions
- [ ] Bundle size checked
- [ ] Lighthouse OK
- [ ] No memory leaks

Accessibility:
- [ ] Keyboard navigable
- [ ] Color contrast OK
- [ ] Touch targets OK
- [ ] ARIA labels present

Documentation:
- [ ] JSDoc added
- [ ] README updated
- [ ] Architecture docs updated
```

### Author Checklist

Before requesting review:
- [ ] All tests pass locally
- [ ] Linting passes
- [ ] Code style matches standards
- [ ] Bundle size checked
- [ ] Lighthouse score OK
- [ ] Manual testing done on device
- [ ] No merge conflicts
- [ ] Commit messages are clear

---

## 8️⃣ Common Patterns & Anti-Patterns

### DO: Use Event-Driven Updates

```javascript
// ✅ GOOD
function updateSupplement(supplement) {
  StateManager.dispatch(ACTIONS.UPDATE, supplement);
  EventBus.emit(EVENTS.SUPPLEMENT_UPDATED, supplement);
}

// ❌ BAD - Direct DOM manipulation
function updateSupplement(supplement) {
  document.getElementById('name').textContent = supplement.name;
}
```

### DO: Abstract Storage Access

```javascript
// ✅ GOOD
StorageManager.setItem('supplements', data);

// ❌ BAD - Direct localStorage
localStorage.setItem('supplements', JSON.stringify(data));
```

### DO: Validate Early

```javascript
// ✅ GOOD
function saveSupplement(supplement) {
  if (!isValid(supplement)) throw new Error('Invalid');
  // ... continue
}

// ❌ BAD - No validation
function saveSupplement(supplement) {
  // Hope it's valid...
}
```

### DON'T: Use Global Variables

```javascript
// ❌ BAD
window.globalData = {};

// ✅ GOOD
const data = {}; // In module scope
export function getData() { return data; }
```

### DON'T: Hardcode Values

```javascript
// ❌ BAD
const MAX_RETRIES = 3; // What if we need to change this?

// ✅ GOOD
const MAX_RETRIES = CONFIG.MAX_RETRIES;
// Centralized configuration
```

---

## 📊 Definition of Done

A feature is DONE when:

```checklist
Code Quality:
- [ ] Tests written (80%+ coverage)
- [ ] Code review passed
- [ ] Linting passes
- [ ] JSDoc added
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No merge conflicts

Performance:
- [ ] Lighthouse ≥ 90
- [ ] FCP < 1800ms
- [ ] LCP < 2500ms
- [ ] CLS < 0.1
- [ ] Bundle size OK

Accessibility:
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigable
- [ ] Color contrast OK
- [ ] Touch targets OK
- [ ] ARIA labels present

Testing:
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Tested on real device
- [ ] Manual QA passed

Documentation:
- [ ] README updated (if needed)
- [ ] JSDoc complete
- [ ] Architecture updated (if changed)
- [ ] CHANGELOG updated

Deployment:
- [ ] Ready to merge
- [ ] No broken changes (or documented)
- [ ] Migration planned (if needed)
```

---

## 🚀 Onboarding Checklist for New Developers

```
Day 1:
- [ ] Clone repository
- [ ] npm install
- [ ] npm run dev
- [ ] Read README
- [ ] Read this document

Day 2:
- [ ] Read CODEBASE_HEALTH_REPORT.md
- [ ] Read CURRENT_ARCHITECTURE.md
- [ ] Explore folder structure
- [ ] Run tests: npm test

Day 3:
- [ ] Pick a small task
- [ ] Make a PR
- [ ] Get code review
- [ ] Ask questions!

Week 1:
- [ ] Understand state management
- [ ] Understand routing
- [ ] Understand analytics
- [ ] Make first real contribution

Week 2:
- [ ] Make a feature PR
- [ ] Refactor small part
- [ ] Understand E2E tests
- [ ] Contributing independently
```

---

## ✅ Implementation Checklist

For your team to follow these standards:

```
Setup:
- [ ] All standards documented (this file)
- [ ] ESLint configured (.eslintrc.js)
- [ ] Stylelint configured (.stylelintrc.json)
- [ ] Prettier configured (prettier.config.js)
- [ ] Git pre-commit hooks (lint before commit)
- [ ] CI/CD checks (tests + linting in CI)

Team:
- [ ] Standards explained to team
- [ ] Code review process documented
- [ ] Definition of Done reviewed
- [ ] Questions answered

Automation:
- [ ] npm run test:coverage (for tests)
- [ ] npm run lint:js (for code)
- [ ] npm run lint:css (for styles)
- [ ] Lighthouse integrated in CI
- [ ] Accessibility checks in CI
```

---

## 📞 Questions?

If you have questions about these standards:
1. Check the relevant document (ARCHITECTURE, HEALTH_REPORT, etc)
2. Ask in code review
3. Update standards if needed

Standards should evolve with the project.

---

**Document**: Development Standards  
**Version**: 1.0  
**Effective**: 2026-06-02  
**Status**: ✅ READY

Everyone on the team should read this before making commits.
