# Contributing to SupliList

Thank you for considering contributing to SupliList! This guide will help you get started.

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful to all contributors.

---

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork:** `git clone https://github.com/yourusername/suplilist.git`
3. **Create a branch:** `git checkout -b feature/my-feature`
4. **Install dependencies:** `npm install`
5. **Start developing:** `npm run dev`
6. **Run tests:** `npm test`

---

## Development Workflow

### 1. Before You Start

- Check [GitHub Issues](https://github.com/suplilist/suplilist/issues) for existing work
- Create an issue if it doesn't exist (discuss before large changes)
- Get feedback from maintainers on the approach

### 2. Branch Naming

Use descriptive branch names:

```
feature/add-notifications      # New feature
bugfix/stack-sorting-issue     # Bug fix
refactor/event-bus             # Code refactoring
docs/api-reference             # Documentation
test/improve-coverage          # Test improvements
```

### 3. Make Changes

Follow the code style and patterns documented in ARCHITECTURE.md.

**Key principles:**
- Write clean, readable code
- Add JSDoc comments to public methods
- Keep methods small and focused
- Use descriptive variable names
- Test your changes

### 4. Commit Messages

Use clear, descriptive commit messages:

```
feat: add push notification reminders

- Implement notification-service.js
- Add permission request flow
- Update StateManager to track notification preferences
- Tests: 100% coverage

Closes #123
```

**Format:**
```
<type>: <subject>

<body (optional)>

<footer (optional, e.g., "Closes #123")>
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code refactoring
- `docs:` — Documentation
- `test:` — Test additions/updates
- `chore:` — Build, dependencies, etc.
- `perf:` — Performance improvement

### 5. Code Style

#### JavaScript Style Guide

```javascript
// ✓ GOOD

/**
 * Calculate monthly dosage cost.
 * @param {number} dailyGrams - Daily dosage in grams
 * @param {number} pricePerGram - Price per gram in BRL
 * @returns {number} Monthly cost
 */
function calculateMonthlyCost(dailyGrams, pricePerGram) {
  return dailyGrams * pricePerGram * 30;
}

// ✗ BAD (no JSDoc, unclear variable names)
function calc(x, y) {
  return x * y * 30;
}
```

#### Naming Conventions

```javascript
// Constants: SCREAMING_SNAKE_CASE
const MAX_SUPPLEMENTS = 500;
const DEFAULT_DOSAGE_UNIT = 'g';

// Variables: camelCase
let currentUser = { name: 'João' };
const supplementId = 'creatine';

// Functions: camelCase
function addSupplementToStack() { }

// Classes: PascalCase
class EventBus { }
class ListPage { }

// Private methods: _leadingUnderscore
class MyPage {
  _handleClick() { }
  _renderContent() { }
}

// Booleans: is/has prefix
let isValid = true;
let hasError = false;
```

#### Formatting

Run **Prettier** before committing:

```bash
npm run format
```

Or configure your editor to auto-format on save.

**Rules:**
- 2-space indentation
- Single quotes
- 80-character line limit
- Trailing commas in multi-line objects
- No semicolons (configured in `.prettierrc`)

#### Error Handling

```javascript
// ✓ GOOD
try {
  const events = await analyticsStorage.getEvents();
  return events.filter(e => e.timestamp > startTime);
} catch (err) {
  logger.error('[MyComponent] Failed to load events:', err);
  return [];  // Graceful fallback
}

// ✗ BAD (silent failure)
const events = await analyticsStorage.getEvents();
return events.filter(e => e.timestamp > startTime);
```

#### Immutability

```javascript
// ✓ GOOD (immutable update)
stateManager.dispatch({
  type: 'UPDATE_SETTINGS',
  payload: {
    ...currentSettings,
    theme: 'dark'
  }
});

// ✗ BAD (mutation)
currentSettings.theme = 'dark';
stateManager.dispatch({ type: 'UPDATE_SETTINGS', payload: currentSettings });
```

---

## Testing

### Writing Tests

All features must have unit tests. Use Jest.

```javascript
// __tests__/utils/dosage-converter.test.js
import { convertDosage } from '../../src/utils/dosage-converter.js';

describe('convertDosage', () => {
  it('should convert mg to g', () => {
    expect(convertDosage(1000, 'mg', 'g')).toBe(1);
  });

  it('should convert g to mg', () => {
    expect(convertDosage(5, 'g', 'mg')).toBe(5000);
  });

  it('should handle edge cases', () => {
    expect(convertDosage(0, 'g', 'mg')).toBe(0);
    expect(convertDosage(0.001, 'g', 'mg')).toBe(1);
  });
});
```

### Test Coverage

Target **80%+ coverage**:

```bash
npm test -- --coverage
```

Check `coverage/` folder for detailed reports.

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- state-manager  # Single file
npm test -- --coverage     # With coverage
```

---

## Pull Request Process

### 1. Push to Your Fork

```bash
git push origin feature/my-feature
```

### 2. Create a Pull Request

On GitHub:
- **Title:** Clear, descriptive (e.g., "Add notification service")
- **Description:** Explain what changed and why
- **Link issues:** "Closes #123"

**Template:**
```markdown
## Description
Brief summary of the changes.

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [x] Unit tests added
- [x] Tests passing locally
- [x] Coverage maintained (80%+)

## Checklist
- [x] Code formatted (`npm run format`)
- [x] Tests passing (`npm test`)
- [x] No console errors
- [x] JSDoc comments added
- [x] Commit messages clear

## Screenshots (if UI change)
_Add screenshots of the new feature._
```

### 3. Code Review

- Maintainers will review your code
- Address feedback in new commits (don't force-push)
- Keep discussions professional

### 4. Merge

Once approved, maintainers will merge your PR. 🎉

---

## Common Contribution Scenarios

### Adding a New Page

1. **Create component** (`src/pages/new-page.js`):
```javascript
export default class NewPage {
  constructor(container) { this.container = container; }
  mount() { /* render */ }
  unmount() { /* cleanup */ }
}
```

2. **Register in router** (`src/core/router.js`)

3. **Add tests** (`__tests__/pages/new-page.test.js`)

4. **Update docs** if user-facing

### Fixing a Bug

1. **Create issue** describing the bug
2. **Create test** that reproduces the bug
3. **Fix the code**
4. **Verify test passes**
5. **Submit PR** with "Fixes #XYZ"

### Improving Performance

1. **Measure baseline** (Chrome DevTools → Lighthouse)
2. **Make changes**
3. **Measure improvement** (% faster)
4. **Document in PR**

### Adding Analytics Metric

1. **Add metric calculation** in `src/analytics/metrics-aggregator.js`
2. **Add JSDoc** explaining the metric
3. **Add tests** with sample data
4. **Document in API.md**

---

## Documentation

### When to Document

- **New feature:** Update ARCHITECTURE.md, API.md, or SETUP.md
- **API change:** Update API.md immediately
- **Bug fix:** No docs needed (unless it fixes documented behavior)
- **New module:** Add JSDoc comments + reference in ARCHITECTURE.md

### Writing Good Docs

```markdown
# Clear Title

Brief 1-sentence summary.

## Purpose
Why does this exist?

## Usage
Code example showing typical usage.

## Example
Real-world scenario.

## See Also
Links to related docs.
```

---

## Git Workflow

### Sync With Upstream

```bash
git fetch upstream
git rebase upstream/main
```

### Squash Commits (optional, for cleanup)

```bash
git rebase -i HEAD~3  # Interactive rebase last 3 commits
```

### Update PR After Review

```bash
# Make changes
git add .
git commit -m "Address review feedback"
git push origin feature/my-feature
# PR updates automatically
```

---

## Reporting Bugs

When reporting a bug, include:

1. **Reproduction steps**
   ```
   1. Go to /list
   2. Search "creatine"
   3. Click add to stack
   4. Expected: supplement added
   5. Actual: error in console
   ```

2. **Device/Browser info**
   ```
   Chrome 120.0 on Windows 11
   ```

3. **Console errors**
   ```
   Uncaught TypeError: Cannot read property 'push' of undefined
   at addSupplement (my-stack-page.js:42)
   ```

4. **Screenshots** (if UI-related)

---

## Requesting Features

Before requesting a feature:

1. Check if it already exists
2. Consider: Does it align with SupliList's goals?
3. Provide use case: "I want to... so that..."

**Good feature request:**
```
Title: Add supplement comparison view

Description:
Users want to compare supplements side-by-side before adding to stack.

Use case:
I have 3 creatine options and want to see price/dosage/evidence differences.

Acceptance criteria:
- Can select 2-3 supplements
- Shows columns: name, category, dosage, evidence, price
- Can sort by each column
```

---

## Questions?

- **GitHub Discussions** — Ask questions
- **GitHub Issues** — Report bugs
- **Email** — Contact maintainers (see README)

---

## Code Review Checklist

Self-review before submitting PR:

- [ ] Code follows style guide
- [ ] JSDoc comments added to public methods
- [ ] No `console.log()` statements
- [ ] No hardcoded values (use constants)
- [ ] Error handling implemented
- [ ] Edge cases considered
- [ ] Tests added and passing
- [ ] Coverage maintained (80%+)
- [ ] No breaking changes documented
- [ ] Commit messages clear and descriptive

---

## Performance Guidelines

### Before Optimizing

```bash
npm test -- --coverage        # What's tested?
npm run build                 # How big is the bundle?
```

### Optimization Areas

1. **Virtual Scrolling** — Use for lists 100+ items
2. **Event Batching** — Already done in EventPipeline
3. **CSS-in-JS** — Cache styles, don't recreate per render
4. **Debouncing** — Search input, window resize events
5. **Lazy Loading** — Load features on-demand

### Measuring Improvements

```javascript
console.time('operation');
// ... code to measure
console.timeEnd('operation');
// operation: 42.5ms
```

---

## License

By contributing, you agree your code is licensed under the project's license (see LICENSE file).

---

## Security

Found a security vulnerability? **Don't** open a public issue.

Instead:
1. Email security@suplilist.dev (or see SECURITY.md)
2. Include: description, reproduction steps, impact
3. Allow time for fix before public disclosure

---

## Changelog

Changes are documented in **CHANGELOG.md**. Use commit types to auto-generate entries:

```
feat: Add feature           → Features
fix: Fix bug                → Fixes
docs: Update docs           → (no entry)
BREAKING CHANGE: ...        → Breaking Changes
```

---

## Recognition

Contributors are recognized in:
- **README.md** — Contributors section
- **CHANGELOG.md** — Version entries
- **GitHub insights** — Automatic

---

Thank you for helping make SupliList better! 🚀
