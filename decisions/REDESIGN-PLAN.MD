# Home Page Redesign Plan — SupliList 2.0

## Context

The current home page (home-page.js) is functional but lacks the polish and innovation of modern SaaS landing pages. The second image provided shows a more refined vision with:
- Better visual hierarchy and spacing
- Cleaner section organization
- More impactful hero layout
- Improved call-to-action placement
- Modern animation patterns

**Goal**: Redesign the home page to match the target design, using references from high-quality landing pages (Linear, Vercel, Anthropic, Raycast) while maintaining SupliList's existing design system.

---

## Discovery Findings

### Current Design System (Already Exists)
- **Colors**: Dark-first palette with purple brand (#7C3AED)
- **Typography**: Plus Jakarta Sans (display) + Inter (body)
- **Spacing**: Consistent 8px scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- **Components**: Card, button, chip, badge patterns already defined
- **Animations**: Fade-in-up, slide patterns with staggered timing

### Key Improvements Needed
1. **Hero Section**: More breathing room, better visual hierarchy, clearer value prop
2. **Feature Cards**: Simpler design, better affordance, more refined spacing
3. **Step Section**: Redesigned to be more visual/impactful
4. **Marketplace Cards**: Better layout and visual treatment
5. **Overall**: More whitespace, refined padding, improved section separation

---

## Implementation Approach

### Phase 1: Hero Section Redesign
**Current**: Two-column layout with side-by-side product cards (lines 404-416)
**Target**: More polished, with better typography hierarchy and card presentation

**Specific CSS Changes**:
- `.lp-hero`: Increase padding (120px 24px 80px → 140px 24px 100px)
- `.lp-hero__title`: Increase font size (clamp 28px, 8vw, 96px → clamp 36px, 8vw, 112px)
- `.lp-hero__sub`: Increase font size slightly (18px → 19px), increase margin-bottom (36px → 48px)
- `.lp-hero__cta`: Increase gap (14px → 18px), add margin-bottom adjustment (40px → 56px)
- `.lp-mock-card`: Add left border (4px solid var(--color-brand)), reduce gap (12px → 16px)
- `.lp-mock-card`: Add background gradient overlay (subtle), improve shadow on hover
- `.lp-pill`: Improve visibility (margin-bottom 28px → 32px)

**File**: `src/pages/home-page.js` lines 393-472 (`.lp-hero*` and `.lp-mock-*` classes)

### Phase 2: Feature Cards Section
**Current**: Simple 3-card grid (lines 154-165)
**Target**: Refined cards with left accent, improved icons, better hover effects

**Specific CSS Changes**:
- `.lp-card`: Add left border (4px solid var(--color-brand)), increase padding (32px → 36px)
- `.lp-card__icon`: Increase size (52px → 64px), add box-shadow with brand color glow
- `.lp-card__icon`: Add subtle gradient background (linear-gradient with semi-transparent brand color)
- `.lp-card:hover`: More pronounced transform (translateY(-3px) → translateY(-6px)), add box-shadow
- `.lp-grid--3`: Increase gap (20px → 24px)
- `.lp-card__title`: Increase font size (19px → 20px), improve line-height (1.2)
- `.lp-section`: Increase padding (80px 24px → 96px 24px on desktop)

**File**: Same, lines 486-517 (`.lp-card*`, `.lp-grid*`, `.lp-section` classes)

### Phase 3: Steps Section Redesign
**Current**: Simple numbered steps (lines 80-84 in template, 510-517 in CSS)
**Target**: More visual, with better layout and step connectors on desktop

**Specific CSS Changes**:
- `.lp-step__num`: Increase size (44x44 → 56x56), increase font size (20px → 24px)
- `.lp-step`: Add left border (4px solid var(--color-brand)), similar to cards
- `.lp-step`: Increase padding (32px → 36px)
- `.lp-step:hover`: Add glow effect with box-shadow
- Add new `.lp-steps-wrapper` for desktop step connectors (optional visual lines between steps)
- Increase gap in grid (20px → 24px)

**Template changes** (optional visual enhancement):
- Keep HTML structure same, CSS handles new look

**File**: Same, lines 510-517 (`.lp-step*` classes)

### Phase 4: Marketplace Section Redesign  
**Current**: Simple logo + badge (lines 200-211, 535-553)
**Target**: Refined cards with colored left borders and better visual treatment

**Specific CSS Changes**:
- `.lp-market`: Add left border (6px solid var(--mk-color))
- `.lp-market`: Increase padding (28px 32px → 32px 36px)
- `.lp-market`: Add subtle background gradient (linear-gradient with marketplace color at 0.05 opacity)
- `.lp-market:hover`: Add more pronounced glow/shadow effect
- `.lp-market__logo`: Ensure proper sizing, consider slight glow on hover
- `.lp-market__badge`: Improve visibility, consider slight background color change

**File**: Same, lines 535-553 (`.lp-market*` classes)

### Phase 5: Overall Layout & Spacing Polish
**Changes to multiple sections**:
- `.lp-section-wrap--alt`: Adjust background color slightly for better contrast (maybe add subtle gradient)
- `.lp-h2`: Increase font size (clamp 28px, 4.5vw, 48px → clamp 32px, 4.5vw, 56px)
- `.lp-h2`: Improve margin-bottom (56px → 64px)
- `.lp-section`: Increase padding generally (80px 24px → 96px 24px)
- Add subtle borders/separators between major sections
- Improve mobile spacing consistency

**File**: Same, lines 474-481 (`.lp-section*`, `.lp-h2` classes)

### Phase 6: Animations & Interactive Polish
**Changes**:
- Refine `.lp-anim` timing (stagger animations at 0s, .08s, .16s, .24s, .32s)
- Add entrance animations to cards with stagger
- Improve hover animations (smoother, more responsive)
- Add subtle scale effects to buttons on hover
- Ensure animations respect `prefers-reduced-motion` (already implemented at line 680-683)

**File**: Same, lines 644-649 (`@keyframes lp-fade-in-up`), update button and card hover styles

### Phase 7: Mobile Responsiveness Refinements
**Changes**:
- Adjust tablet breakpoint (768px) for new spacing
- Adjust mobile breakpoint (480px) for proper padding
- Ensure cards stack properly with new left borders visible
- Test button accessibility (min 44px touch target)

**File**: Same, lines 651-679 (media queries)

---

## Critical Files to Modify
- **Single file only**: `src/pages/home-page.js`
  - CSS in the `_injectStyle()` method (lines 332-687)
  - HTML template in `_template()` method (lines 59-296)
  - Some tweaks to hero cards generation in `_heroMockupCards()` (lines 302-327)

---

## Reusable Patterns Found
1. **Design tokens**: Already defined as CSS variables (--color-*, --spacing-*, etc.)
2. **Component patterns**: Card, button, chip patterns exist in the design system
3. **Animation patterns**: Fade-in-up animation framework already in place
4. **Responsive breakpoints**: Already defined for 768px, 480px mobile
5. **Icon injection**: SVG icon patterns already established

No new utilities needed — everything can be built within existing patterns.

---

## Verification Plan

### How to Test
1. **Start dev server**: `npm run dev`
2. **Open home page**: http://localhost:5173/home
3. **Visual checks**:
   - Hero section: proper spacing, typography hierarchy, card visibility
   - Feature cards: accent borders visible, hover states work, icon backgrounds prominent
   - Steps section: numbered boxes larger, visual connectors visible (desktop)
   - Marketplace cards: colored borders match brand colors, badges visible
   - Overall: whitespace improved, sections well-separated
4. **Responsive checks**:
   - Desktop (1200px): All 3-column grids visible, full hero layout
   - Tablet (768px): 2-column or single column grids, hero still works
   - Mobile (375px): Single column, proper padding, touch-friendly buttons
5. **Animation checks**:
   - Page load: Staggered fade-in animations work smoothly
   - Interactions: Hover states trigger properly, no visual glitches
6. **Browser DevTools**:
   - Check for console errors
   - Verify responsive breakpoints work at boundaries (860px, 768px, 480px)
   - Ensure animations are smooth (60fps, no jank)

### Success Criteria
- [ ] Home page matches target design vision
- [ ] All responsive breakpoints work correctly
- [ ] Animations are smooth and don't cause layout shifts
- [ ] No console errors
- [ ] Buttons are accessible (min 44x44px touch targets)
- [ ] Text contrast meets WCAG AA standards
- [ ] Page performs well (no Core Web Vitals regressions)

---

## Design Direction Notes

**Key Principles from Modern Landing Pages**:
1. **Generous Whitespace**: More breathing room between elements
2. **Visual Hierarchy**: Clear size/weight contrast between elements
3. **Accent Borders**: Left-side colored borders on cards for visual interest
4. **Subtle Glows**: Soft shadow/glow effects on hover without being distracting
5. **Typography**: Bold, large headlines with tight tracking for impact
6. **Color Usage**: Restrained palette with strategic brand color placement
7. **Smooth Interactions**: Refined hover states and transitions
8. **Section Separation**: Clear visual boundaries (borders, color changes, spacing)

**SupliList-specific approach**:
- Maintain dark-first aesthetic (existing dark theme)
- Use purple brand (#7C3AED) strategically, not everywhere
- Emphasize "evidence-based" messaging through scientific, clean layout
- Add left borders to cards (4-6px) for modern look
- Increase padding/spacing by 10-20% across sections for premium feel
- Refine hover effects: larger lifts, subtle glows instead of heavy shadows
- Typography: Go slightly bolder/larger for headlines (matching Linear/Vercel)
- Keep animations smooth but not excessive

## Additional Change: Onboarding Flow

**Current behavior**: Onboarding page loads automatically on first visit
**Target behavior**: Onboarding button in home page instead (user chooses to start)

**Changes needed**:
1. Update routing logic to NOT auto-redirect to onboarding
2. Verify home page displays as landing page by default
3. "Começar Agora →" button already navigates to onboarding (data-nav="/onboarding")
4. This is likely in `src/core/app.js` or main router logic

**Note**: This may require changes outside `home-page.js`. Will explore routing during implementation.

## Implementation Order
1. **Explore routing logic** to understand onboarding redirect
2. **Disable auto-redirect** to onboarding page
3. **CSS changes** (hero, cards, buttons) — lower risk
4. **Test responsive design** at each breakpoint
5. **Verify animations** don't cause layout shifts
6. **QA accessibility** (contrast, touch targets, keyboard nav)
7. **Final polish** (fine-tune spacing, shadows, colors)

## Estimated Scope
- **Single file**: `src/pages/home-page.js` (~400 lines of CSS changes)
- **Time estimate**: 1-2 hours for CSS + testing
- **Risk**: Low (isolated page, no template restructuring needed)
- **Rollback**: Simple (revert CSS, no database/API changes)