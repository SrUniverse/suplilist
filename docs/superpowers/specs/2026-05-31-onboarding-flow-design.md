# Onboarding Flow — Design Spec

**Goal:** Guide new users through a 3-step wizard on first visit, collecting name + fitness goal + confirming an AI-suggested base stack, so they leave with a personalized stack ready for check-in.

**Architecture:** Single `OnboardingPage` class registered at `/onboarding`. Internal step state (1–3) with `this.data` accumulating inputs. `app.js` redirects to `/onboarding` on first visit (no `onboarding:completed` flag in localStorage and stack is empty). On completion, dispatches to `stateManager` and redirects to `/my-stack`.

**Tech Stack:** Vanilla JS, existing `stateManager` + `ACTIONS`, existing `StackRecommender` AI module, CSS classes from design system.

---

## Trigger Logic

In `app.js` `DOMContentLoaded`, after router is created but before `router.start()`:

```js
const onboardingDone = localStorage.getItem('onboarding:completed');
const hasStack = stateManager.stack && stateManager.stack.length > 0;
if (!onboardingDone && !hasStack) {
  window.history.replaceState(null, null, '/onboarding');
}
```

Then `router.start()` reads `/onboarding` and mounts `OnboardingPage`.

The `body--landing` class already hides the nav/sidebar. `/onboarding` is added to the landing-mode check in `applyLandingMode()`.

---

## Route

`app.js` routes array:
```js
{ path: '/onboarding', load: () => import('../pages/onboarding-page.js') }
```

---

## OnboardingPage — Step Structure

### Step 1: Bem-vindo
- Heading: "Bem-vindo ao SupliList"
- Subtitle: "Vamos montar seu stack personalizado em 2 minutos."
- Input: nome do usuário (placeholder "Seu nome")
- CTA: "Começar →" — disabled until input has ≥1 char
- Stores: `this.data.name`

### Step 2: Objetivo Fitness
- Heading: "Qual é seu principal objetivo?"
- 5 selectable cards (single-select):
  - 💪 Hipertrofia → `bulk`
  - ⚡ Força → `strength`
  - 🔥 Emagrecimento → `cut`
  - 🏃 Resistência → `endurance`
  - 🛡️ Saúde Geral → `general`
- CTA: "Continuar →" — disabled until a card is selected
- Stores: `this.data.goal` using the `targets` key from SUPPLEMENTS_DB: `bulk | strength | cut | endurance | general`
- These keys are passed as `recommender.recommend({ objective: this.data.goal })` — field name is `objective`, not `goal`

### Step 3: Seu Stack Inicial
- Heading: "Seu stack recomendado"
- Subtitle: "Baseado no seu objetivo. Você pode ajustar depois."
- Calls `StackRecommender.getRecommendations(this.data.goal)` — returns array of supplement objects
- Renders supplement cards, all pre-checked (checkbox per card, toggleable)
- Empty state: "Nenhuma sugestão encontrada. Você pode explorar o catálogo após o cadastro." — CTA still enabled
- CTA: "Adicionar ao meu stack e começar!"
- On confirm:
  1. `stateManager.dispatch(ACTIONS.SET_USER_PROFILE, { name: this.data.name, goal: this.data.goal })`
  2. For each selected supplement: `stateManager.dispatch(ACTIONS.ADD_TO_STACK, supplement)`
  3. `localStorage.setItem('onboarding:completed', '1')`
  4. `window.__router.navigate('/my-stack')`

---

## Navigation Between Steps

- Progress indicator: "1 / 3", "2 / 3", "3 / 3" (simple text, top of card)
- Back button on steps 2 and 3: goes to previous step, preserves `this.data`
- No browser back: on `mount()`, `history.replaceState(null, null, '/onboarding')` locks the URL in place. `popstate` during onboarding is ignored (listener removed on `unmount()`).

---

## Styling

- Full-screen centered card layout (no sidebar, no topbar)
- Reuses existing CSS variables: `--color-surface`, `--color-primary`, `--color-text`
- New classes added to `main.css`: `.onboarding-card`, `.onboarding-goal-grid`, `.onboarding-goal-card`, `.onboarding-goal-card.selected`, `.onboarding-supplement-card`
- Mobile-first, single column

---

## State & Persistence

| What | Where | Notes |
|------|-------|-------|
| `onboarding:completed` | `localStorage` (raw key) | Not cleared by stateManager.reset() — intentional |
| User name + goal | `stateManager` via `SET_USER_PROFILE` | Persisted in `suplilist-state-v4` |
| Stack items | `stateManager` via `ADD_TO_STACK` | Same as adding manually |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| User has existing stack (post-reset scenario) | Guard skips onboarding (`hasStack === true`) |
| `StackRecommender` returns empty array | Shows empty state message, CTA enabled, adds nothing |
| User refreshes mid-onboarding | Stays on `/onboarding` (flag not yet set) |
| User navigates back with browser button | `popstate` suppressed during onboarding mount |
| Name field is whitespace only | CTA stays disabled (trim check) |

---

## Files

| File | Action |
|------|--------|
| `src/pages/onboarding-page.js` | **Create** — full wizard implementation |
| `src/core/app.js` | **Modify** — add route, landing mode, redirect guard |
| `src/css/main.css` | **Modify** — add onboarding-specific CSS classes |
| `src/pages/onboarding-page.test.js` | **Create** — unit tests |

---

## Tests

- Guard: redirects to `/onboarding` when flag absent and stack empty
- Guard: does NOT redirect when `onboarding:completed` is set
- Guard: does NOT redirect when stack has items
- Step navigation: clicking Continuar advances step, data preserved
- Step navigation: clicking Voltar goes back, data preserved
- Submit: dispatches `SET_USER_PROFILE` with correct name + goal
- Submit: dispatches `ADD_TO_STACK` for each selected supplement
- Submit: sets `onboarding:completed` in localStorage
- Empty StackRecommender: renders empty state, submit still works
