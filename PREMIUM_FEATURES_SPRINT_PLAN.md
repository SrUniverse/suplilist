# Premium Features Implementation Plan
## Grupo A (PRO) + Grupo B (ELITE) + Full Test & Validation

**Timeline:** 5-7 dias  
**Objective:** Implement features, test everything, ensure no regressions  
**Owner:** Cássio

---

## 📋 Overview

```
SPRINT A1 (Day 1-2): Implement Grupo A Features
├─ Feature 1: Aderência Real (30-day chart)
├─ Feature 2: Alertas de Reposição
├─ Feature 3: Histórico por Suplemento
└─ Feature 4: Dosage Optimizer

SPRINT A2 (Day 3): Test & Validate Grupo A
├─ Unit tests
├─ E2E tests
├─ UI/UX review
└─ Performance check

SPRINT B1 (Day 4-5): Implement Grupo B Features
├─ Feature 1: AI Stack Optimizer
└─ Feature 2: Before/After Tracker

SPRINT B2 (Day 6): Test & Validate Grupo B
├─ Unit tests
├─ E2E tests
└─ Integration tests

SPRINT C (Day 7): Full System Validation
├─ Regression tests (all existing features)
├─ Performance audit
├─ Security check
├─ Monitoring setup
└─ Documentation
```

---

## SPRINT A1: Grupo A Features Implementation (Days 1-2)

### Feature 1: Aderência Real (Day 1 — 4 hours)

**Files to Create/Modify:**
- `frontend/src/features/analytics/adherence-tracker.js` (new)
- `frontend/src/features/analytics/adherence-tracker.test.js` (new)
- `frontend/src/features/profile/profile-page.js` (modify)
- `frontend/src/state/state-manager.js` (add action)

**Implementation:**
```javascript
// adherence-tracker.js
/**
 * Calculate adherence % for each supplement
 * Returns: { supplementId: { taken: 25, missed: 5, percentage: 83% } }
 */
export class AdherenceTracker {
  static calculate(checkins, days = 30) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const relevant = checkins.filter(c => c.timestamp > cutoff);
    
    // Group by supplementId
    const grouped = {};
    for (const checkin of relevant) {
      if (!grouped[checkin.supplementId]) {
        grouped[checkin.supplementId] = new Set();
      }
      const date = new Date(checkin.timestamp).toDateString();
      grouped[checkin.supplementId].add(date);
    }
    
    // Calculate percentages
    const result = {};
    for (const [suppId, dates] of Object.entries(grouped)) {
      result[suppId] = {
        taken: dates.size,
        missed: days - dates.size,
        percentage: Math.round((dates.size / days) * 100)
      };
    }
    return result;
  }

  /**
   * Render 30-day chart (green/red calendar view)
   */
  static renderChart(supplementId, checkins, container) {
    const chart = document.createElement('div');
    chart.className = 'adherence-chart';
    
    const days = 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const hasCheckin = checkins.some(
        c => new Date(c.timestamp).toDateString() === dateStr && 
             c.supplementId === supplementId
      );
      
      const day = document.createElement('div');
      day.className = `chart-day ${hasCheckin ? 'taken' : 'missed'}`;
      day.title = dateStr;
      chart.appendChild(day);
    }
    
    container.appendChild(chart);
  }
}
```

**UI Layout:**
- Profile page → "Sua Aderência" section
- Show top 5 supplements by adherence
- Color-coded 30-day calendar (green = taken, red = missed)
- % badge for each supplement

**Test Cases:**
- Calculate adherence for 0, 15, 30 days
- Handle missing checkins
- Render chart correctly

---

### Feature 2: Alertas de Reposição (Day 1.5 — 4 hours)

**Files to Create/Modify:**
- `frontend/src/features/profile/refill-alerts.js` (new)
- `frontend/src/features/profile/refill-alerts.test.js` (new)
- `frontend/src/state/state-manager.js` (add TRACK_PURCHASE action)
- `frontend/src/features/profile/profile-page.js` (modify)

**Data Structure:**
```javascript
// state: user.purchases
{
  supplementId: "creatine",
  quantity: 300, // grams
  purchasedAt: 1780520900000,
  dailyConsumption: 5, // grams/day
  source: "Amazon", // optional
  price: 45.90
}
```

**Implementation:**
```javascript
export class RefillAlerts {
  static calculateRefillDate(purchase) {
    const daysUntilEmpty = Math.floor(
      purchase.quantity / purchase.dailyConsumption
    );
    return new Date(
      purchase.purchasedAt + (daysUntilEmpty * 24 * 60 * 60 * 1000)
    );
  }

  static getAlerts(purchases) {
    return purchases
      .map(p => ({
        supplementId: p.supplementId,
        daysUntilRefill: Math.ceil(
          (this.calculateRefillDate(p) - Date.now()) / (24 * 60 * 60 * 1000)
        ),
        alertLevel: this._getAlertLevel(daysUntilRefill)
      }))
      .filter(a => a.daysUntilRefill <= 30)
      .sort((a, b) => a.daysUntilRefill - b.daysUntilRefill);
  }

  static _getAlertLevel(days) {
    if (days <= 3) return 'critical'; // red
    if (days <= 10) return 'warning';  // yellow
    return 'info';                     // blue
  }
}
```

**UI:**
- Dashboard: "Reposição Necessária em 15 dias" card
- Show supplement name, current price, best store
- "Adicionar ao Carrinho" button (links to best store)

**Test Cases:**
- Calculate refill date with different daily consumptions
- Alert levels: critical, warning, info
- Filter alerts for next 30 days only

---

### Feature 3: Histórico por Suplemento (Day 2 — 2 hours)

**Files to Modify:**
- `frontend/src/features/supplements/supplement-detail.js` (new)
- Create modal when user clicks on a supplement from stack

**UI:**
- Show all purchases of that supplement (when, price, quantity)
- Total spent: "R$1.240 em 4 compras"
- Average price per gram: "R$0.82/g"
- Timeline: "Começou em 15 de março, tomando há 80 dias"

**Implementation:**
Simple: filter `state.user.purchases` by supplementId, sum/calculate stats.

---

### Feature 4: Dosage Optimizer (Day 2 — 3 hours)

**Files to Create:**
- `frontend/src/features/supplements/dosage-optimizer.js` (new)

**Logic:**
```javascript
export class DosageOptimizer {
  /**
   * Based on weight + goal, return recommended dosage
   * Creatine: 3-5g/day depending on weight
   * Whey: 1.6-2.2g protein per kg
   * etc.
   */
  static getRecommended(supplementId, weight, goal) {
    const dosages = {
      creatine: { cutting: 3, bulking: 5 }, // grams/day
      whey: { cutting: 1.6 * weight, bulking: 2.2 * weight }, // grams protein
      // ... etc
    };
    return dosages[supplementId]?.[goal] || null;
  }

  /**
   * Compare user's actual dosage vs recommended
   * Return: { actual: 7, recommended: 5, status: 'too_high', diff: '+40%' }
   */
  static compare(supplementId, userDosage, weight, goal) {
    const recommended = this.getRecommended(supplementId, weight, goal);
    if (!recommended) return null;

    const percentage = Math.round((userDosage / recommended) * 100);
    let status = 'optimal';
    if (percentage > 105) status = 'too_high';
    if (percentage < 95) status = 'too_low';

    return {
      actual: userDosage,
      recommended,
      status,
      percentage,
      message: this._getMessage(status, percentage)
    };
  }

  static _getMessage(status, percentage) {
    if (status === 'too_high') {
      return `Você tá tomando ${percentage}% do recomendado. Pode reduzir sem perder resultados.`;
    }
    if (status === 'too_low') {
      return `Você tá tomando ${percentage}% do recomendado. Aumente para melhores resultados.`;
    }
    return 'Dosagem está perfeita! 👏';
  }
}
```

**UI:**
- When viewing stack: show dosage check next to each supplement
- ⚠️ icon if not optimal
- Click to see recommendation

---

## SPRINT A2: Test & Validate Grupo A (Day 3 — 6 hours)

### Unit Tests
```bash
npm run test -- adherence-tracker.test.js
npm run test -- refill-alerts.test.js
npm run test -- dosage-optimizer.test.js
```

**Coverage targets:**
- Adherence: 90%+
- Refill alerts: 85%+
- Dosage: 80%+

### E2E Tests
Create: `e2e/premium-features-a.spec.ts`

```javascript
test('User can view adherence chart for 30 days', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="profile-link"]');
  await page.waitForSelector('.adherence-chart');
  const days = await page.$$('.chart-day');
  expect(days.length).toBe(30);
});

test('Refill alert shows for supplement with 15 days left', async ({ page }) => {
  // Add purchase with 15-day remaining
  // Navigate to dashboard
  // Check alert appears with correct timing
});

test('Dosage optimizer shows warning if too high', async ({ page }) => {
  // Add supplement with high dosage
  // View stack
  // Check warning appears
});
```

### UI/UX Review
- [ ] Adherence chart is readable (colors clear, layout responsive)
- [ ] Refill alerts are prominent but not annoying
- [ ] Historical data loads quickly (<500ms)
- [ ] Dosage tips are clear and actionable

### Performance Check
```bash
npm run build
# Check bundle size increase
# Lighthouse audit
# Local load time test
```

**Target:** No more than 10KB gzip increase per feature

---

## SPRINT B1: Grupo B Features Implementation (Days 4-5)

### Feature 1: AI Stack Optimizer (Day 4 — 6 hours)

**Concept:**
- User has stack of 5 supplements
- Backend rule engine analyzes:
  - Overlapping benefits (redundancy)
  - Missing critical supplements (for their goal)
  - Cost optimization
- Suggests: Remove X (low ROI), Add Y (high ROI)

**Implementation (Simplified):**
```javascript
export class StackOptimizer {
  /**
   * Analyze stack for goal, suggest improvements
   */
  static analyze(stack, goal, budget) {
    const analysis = {
      redundant: [], // supplements with overlapping benefits
      missing: [],   // recommended for goal
      overbudget: false,
      savings: 0,
      suggestion: ""
    };

    // Check for redundancy
    // Creatine + BCAA = some overlap? Flag creatine (cheaper)
    // Whey + Casein = maybe only need one?

    // Check missing for goal
    // If goal = bulking and no carbs: suggest oats/maltodextrin
    // If goal = cutting and no thermogenic: suggest caffeine/green tea

    // Calculate savings
    // "Remove BCAA (R$80), add Carbs (R$40) = save R$40/month"

    return analysis;
  }

  static render(analysis, container) {
    const html = `
      <div class="stack-optimizer">
        <h3>Otimização de Stack</h3>
        ${analysis.redundant.length ? `
          <div class="redundant">
            <h4>Redundância:</h4>
            <p>Você toma ${analysis.redundant.join(' + ')}. Pode remover ${analysis.redundant[0]} e economizar.</p>
          </div>
        ` : ''}
        ${analysis.missing.length ? `
          <div class="missing">
            <h4>Complementos Sugeridos:</h4>
            <ul>${analysis.missing.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
        ` : ''}
        <p class="savings">💰 Economia potencial: R$${analysis.savings}/mês</p>
      </div>
    `;
    container.innerHTML = html;
  }
}
```

**UI:**
- Modal on stack page: "Otimizar seu Stack"
- Shows analysis + suggestion
- "Aplicar Mudanças" button (removes redundant, adds missing)

---

### Feature 2: Before/After Tracker (Day 5 — 4 hours)

**Data Structure:**
```javascript
{
  date: 1780520900000,
  weight: 75,
  chest: 98,
  waist: 82,
  arm: 32,
  photos: ["url1", "url2"], // before/after
  stack: [...supplements at this time],
  goal: "bulking"
}
```

**UI:**
- Timeline view: "15 de março (75kg, 32cm arm)" → "1 de junho (77kg, 33cm arm)"
- Show correlations: "Ganhou 0.5cm de braço, stack era Creatine + Whey"
- Before/after photo comparison
- +/- badges for improvements

**Implementation:**
Simple data entry form + timeline rendering.

---

## SPRINT B2: Test & Validate Grupo B (Day 6 — 6 hours)

### Unit Tests
- Stack optimizer logic: edge cases
- Before/after calculations: weight gain tracking

### E2E Tests
- Full stack optimizer flow
- Photo upload and comparison
- Timeline navigation

### Integration Tests
- Stack optimizer affects refill alerts (if removed supplement)
- Before/after uses correct stack data from that time

---

## SPRINT C: Full System Validation (Day 7 — 8 hours)

### Regression Tests
Run full E2E suite to ensure no breaks:

```bash
npm run test:e2e
```

**Coverage:**
- ✅ Existing features (list, search, favorites, checkins, notifications)
- ✅ New Grupo A features
- ✅ New Grupo B features
- ✅ Offline mode still works
- ✅ Mobile responsive

### Performance Audit
```bash
npm run build
npm run analyze

# Check:
# - Bundle size (target: <80KB gzip, +15KB from features)
# - Build time (target: <5s)
# - Lighthouse scores (target: >90 all metrics)
# - Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
```

### Security Check
- [ ] No XSS in new modals/inputs
- [ ] No injection in data display
- [ ] Purchase data not exposed in localStorage unencrypted

### Monitoring Setup
- [ ] New feature usage tracked
- [ ] Errors logged
- [ ] Performance monitored

### Documentation
- [ ] User-facing docs: "How to use Adherence"
- [ ] Support guide: common questions
- [ ] Developer docs: new components/functions

---

## ✅ Definition of Done

All features complete when:
- [ ] All unit tests pass (>80% coverage per feature)
- [ ] All E2E tests pass
- [ ] No regressions in existing features
- [ ] Bundle size <80KB gzip (only +15KB from new features)
- [ ] Lighthouse >90 all routes
- [ ] Mobile responsive (tested on 375px, 768px, 1024px)
- [ ] Offline mode still works
- [ ] No console errors in production build
- [ ] Monitoring/analytics configured
- [ ] Team trained on new features
- [ ] Docs completed

---

## 🎯 Success Metrics

**After implementation:**
- PRO features are compelling enough that users want to pay
- No performance degradation
- 0 critical bugs
- All existing features still work perfectly

---

## 📅 Timeline Summary

| Day | Sprint | Time | Deliverable |
|-----|--------|------|-------------|
| 1-2 | A1 | 16h | 4 PRO features implemented |
| 3 | A2 | 6h | All tests pass, UI reviewed |
| 4-5 | B1 | 10h | 2 ELITE features implemented |
| 6 | B2 | 6h | All tests pass, integrated |
| 7 | C | 8h | Full validation, zero regressions |
| **Total** | - | **46h** | **Ready for monetization** |

---

## 🚀 Next Steps After This Plan

Once all Grupo A + Grupo B features are implemented and tested:
1. Deploy features to production
2. Implement Fase 3 (Backend + Stripe payments)
3. Charge for features
4. Monitor conversion rate & churn

---

**Owner:** Cássio  
**Status:** Ready to start  
**Last Updated:** 2026-06-03
