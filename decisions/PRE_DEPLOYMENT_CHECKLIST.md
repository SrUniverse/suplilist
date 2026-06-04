# Pre-Deployment Testing Checklist

Complete this checklist before merging to main/develop or deploying to production.

## Environment Setup

- [ ] Node.js 24+ installed (`node --version`)
- [ ] npm dependencies installed (`npm install`)
- [ ] Git is clean (`git status`)
- [ ] All changes are committed
- [ ] Branch is up-to-date with main (`git pull origin main`)

## Code Quality

### Linting
- [ ] CSS lint passes: `npm run lint:css`
- [ ] JavaScript lint passes: `npm run lint:js`
- [ ] No `console.log` statements in production code
- [ ] No hardcoded API keys or secrets

### Type Safety
- [ ] TypeScript types are correct (if using TS)
- [ ] No `any` types except in justified cases
- [ ] All function signatures have types

## Build

- [ ] Build succeeds: `npm run build`
- [ ] No build warnings or errors
- [ ] Bundle size is reasonable (check `dist/` folder)
- [ ] Source maps are generated for debugging

## Testing

### Unit Tests
- [ ] Unit tests pass: `npm test`
- [ ] Coverage is ≥ 80% for critical paths
- [ ] All new code has tests

### E2E Tests - Local

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

- [ ] All E2E tests pass
- [ ] No flaky tests
- [ ] Mobile tests pass (iPhone SE, iPhone 12, Galaxy A12)
- [ ] Tablet tests pass (iPad)
- [ ] Desktop tests pass
- [ ] Landscape orientation tests pass
- [ ] Keyboard handling tests pass
- [ ] Touch feedback tests pass
- [ ] Accessibility tests pass (`npm run test:a11y`)

### Performance Tests

```bash
npm run perf:report
```

- [ ] Performance score ≥ 90
- [ ] Accessibility score ≥ 95
- [ ] Best Practices score ≥ 90
- [ ] SEO score ≥ 90
- [ ] LCP ≤ 2500ms
- [ ] CLS ≤ 0.1
- [ ] FID ≤ 100ms

### Manual Testing - Desktop

- [ ] Home page loads correctly
- [ ] Navigation works (all menu items clickable)
- [ ] Responsive at desktop width (1920px+)
- [ ] Dark mode toggle works
- [ ] All pages render without errors
- [ ] Forms submit correctly
- [ ] Error states display properly
- [ ] Loading states appear during data fetching

### Manual Testing - Mobile (iPhone)

```bash
# Use Safari DevTools or Chrome DevTools remote debugging
```

**Portrait Mode (375x667)**:
- [ ] Page loads at correct viewport
- [ ] Touch targets are ≥ 44x44px
- [ ] Text is readable (no zoom needed)
- [ ] Buttons respond to touch
- [ ] Forms are usable without zoom
- [ ] Bottom navigation is accessible
- [ ] Modals fit on screen
- [ ] No horizontal scroll

**Landscape Mode (667x375)**:
- [ ] Layout adjusts for landscape
- [ ] Content doesn't overlap
- [ ] Touch targets remain usable
- [ ] Bottom navigation still accessible
- [ ] Keyboard doesn't break layout

**Virtual Keyboard**:
- [ ] Keyboard appears when tapping input
- [ ] Input auto-scrolls above keyboard
- [ ] No layout shift when keyboard appears
- [ ] Focus moves correctly with Tab
- [ ] Keyboard dismisses on return

**Dark Mode**:
- [ ] Colors are correct in dark mode
- [ ] Text contrast is sufficient
- [ ] Images are visible
- [ ] No white flashes

### Manual Testing - Android

**Touch Feedback**:
- [ ] Buttons show active state on press
- [ ] No 300ms tap delay
- [ ] Smooth interactions

**Virtual Keyboard**:
- [ ] Keyboard handling works
- [ ] Forms are usable
- [ ] No layout issues

**Dark Mode**:
- [ ] Respects system dark mode setting
- [ ] All colors render correctly

## Accessibility (WCAG 2.1 AA)

- [ ] Color contrast ≥ 4.5:1 (text)
- [ ] Color contrast ≥ 3:1 (large text)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Form labels are associated with inputs
- [ ] ARIA roles/labels used where needed
- [ ] Images have alt text
- [ ] Video has captions
- [ ] Page structure is logical (heading hierarchy)

## Security

- [ ] No sensitive data in URLs
- [ ] HTTPS is enforced (if applicable)
- [ ] No mixed content (HTTP + HTTPS)
- [ ] CSP headers are set (if applicable)
- [ ] Input validation is present
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Dependencies are up-to-date (`npm audit`)

## Documentation

- [ ] README is up-to-date
- [ ] API documentation is current
- [ ] Setup instructions are accurate
- [ ] Known issues are documented
- [ ] CHANGELOG is updated

## Performance Optimization

- [ ] Images are optimized (WebP format)
- [ ] Lazy loading is implemented where appropriate
- [ ] Code splitting is effective
- [ ] CSS is minified
- [ ] JavaScript is minified
- [ ] No unused code (dead code removed)
- [ ] Service worker caching is working

## Before Pushing to CI

- [ ] All local tests pass
- [ ] Performance targets are met
- [ ] Accessibility standards are met
- [ ] Code is committed with clear message
- [ ] Branch is named appropriately (feature/*, fix/*, etc.)

## CI/CD Pipeline Expectations

When pushing to GitHub, expect:

**E2E Tests** (15 minutes):
- Run on chromium, firefox, webkit
- Run on desktop and mobile configurations
- Generate test reports and videos on failure

**Performance Check** (10 minutes):
- Run Lighthouse audit
- Test 4 URLs: /, /list, /dosage, /favorites
- Report performance, accessibility, best practices, SEO scores

**Accessibility Check** (10 minutes):
- Verify WCAG 2.1 AA compliance
- Check color contrast
- Validate keyboard navigation

**Report Summary** (2 minutes):
- Consolidate all results
- Provide links to artifacts

**Total time**: ~40 minutes

## Handling Test Failures

### E2E Test Failure
1. Download test artifacts (videos, screenshots, traces)
2. Reproduce locally: `npm run test:e2e:debug`
3. Check for:
   - Timing issues (use `waitFor` instead of hardcoded timeouts)
   - Element visibility
   - Viewport/device specific issues
4. Fix the code or test
5. Verify locally before retrying

### Performance Budget Violation
1. Check Lighthouse report in artifacts
2. Identify bottleneck (image size, JS bundle, rendering)
3. Profile with DevTools
4. Apply optimization from `PERFORMANCE_OPTIMIZATION_GUIDE.md`
5. Verify locally: `npm run perf:report`

### Accessibility Failure
1. Review accessibility test results
2. Check failing audit: `npm run test:a11y`
3. Common issues:
   - Missing alt text
   - Poor color contrast
   - Not keyboard accessible
   - Missing ARIA labels
4. Fix in code
5. Rerun: `npm run test:a11y`

## Post-Deployment

After successful merge to main/develop:

- [ ] Monitor Lighthouse CI results
- [ ] Check Core Web Vitals in production
- [ ] Verify no errors in production logs
- [ ] Confirm deployment is live
- [ ] Update issue tracking system

## Rollback Plan

If critical issues are found:

1. Identify root cause
2. Revert commit: `git revert <commit-hash>`
3. Push revert to main
4. Notify team
5. Fix issue on separate branch
6. Re-test thoroughly before merge

## Quick Command Reference

```bash
# Full pre-deployment test suite
npm run lint:css && npm run lint:js && npm run build && npm test && npm run test:e2e

# Performance audit
npm run perf:report

# Accessibility audit
npm run test:a11y

# Interactive test debugging
npm run test:e2e:ui

# Step-through debugging
npm run test:e2e:debug
```

## Notes

- All tests should be deterministic (not flaky)
- Performance budgets are strict in CI
- Accessibility is not negotiable
- Document any intentional violations
- Keep this checklist updated as project evolves

---

**Last Updated**: 2026-06-02
**Next Review**: When major features are added
