# Home Page — Reordenação de Seções: Instagram Após CTA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover a seção Instagram para depois do CTA final, eliminando a interrupção do funil de conversão.

**Architecture:** Mudança puramente de ordem de seções no método `_template()` de `src/pages/home-page.js`. Nenhum CSS, nenhum dado, nenhuma lógica nova — apenas trocar a posição de dois blocos HTML no template string. O fluxo correto passa a ser: Hero → Features → Como Funciona → Objetivos → Marketplaces → CTA Final → Instagram → Footer.

**Tech Stack:** Vanilla JS (sem framework), CSS-in-JS via `_injectStyle()`.

---

## Mapa de Arquivos

| Arquivo | O que muda |
|---|---|
| `src/pages/home-page.js` | Trocar ordem de `.lp-instagram` e `.lp-cta` dentro de `_template()` |

---

## Task 1: Mover seção Instagram após CTA Final em `home-page.js`

**Files:**
- Modify: `src/pages/home-page.js`

- [ ] **Step 1: Localizar os dois blocos no `_template()`**

Em `src/pages/home-page.js`, dentro do método `_template()`, identificar:

**Bloco A — Instagram** (deve ir para DEPOIS do CTA):
```html
<section class="lp-section lp-instagram" aria-label="Instagram">
  ...
</section>
```

**Bloco B — CTA Final** (deve ficar ANTES do Instagram):
```html
<section class="lp-cta" aria-label="Comece agora">
  <h2 class="lp-cta__title">PARE DE ADIVINHAR.<br>COMECE COM CIÊNCIA.</h2>
  <p class="lp-cta__sub">Sem cadastro. Sem assinatura. Tudo no seu dispositivo.</p>
  <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/list" type="button">Abrir o App →</button>
</section>
```

Atualmente: **Instagram → CTA**. Deve ser: **CTA → Instagram**.

- [ ] **Step 2: Reordenar os blocos no template**

No método `_template()`, mover o bloco `lp-instagram` para DEPOIS do bloco `lp-cta`, imediatamente antes do fechamento de `</main>`. O trecho final de `<main>` deve ficar:

```js
          <div class="lp-section-wrap lp-section-wrap--alt">
          <section class="lp-section" aria-label="Marketplaces">
            ...marketplaces (inalterado)...
          </section>
          </div>

          <section class="lp-cta" aria-label="Comece agora">
            <h2 class="lp-cta__title">PARE DE ADIVINHAR.<br>COMECE COM CIÊNCIA.</h2>
            <p class="lp-cta__sub">Sem cadastro. Sem assinatura. Tudo no seu dispositivo.</p>
            <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/list" type="button">Abrir o App →</button>
          </section>

          <section class="lp-section lp-instagram" aria-label="Instagram">
            <div class="lp-ig__card">
              <div class="lp-ig__inner">
                <div class="lp-ig__left">
                  <div class="lp-ig__icon" aria-hidden="true">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </div>
                  <div>
                    <p class="lp-ig__handle">@suplilist</p>
                    <p class="lp-ig__bio">Suplementação baseada em ciência. Compare preços, calcule doses, monte seu stack. 💊🔬</p>
                  </div>
                </div>
                <a
                  class="lp-btn lp-btn--ig"
                  href="https://www.instagram.com/suplilist/?utm_source=site&utm_medium=landing&utm_campaign=seguir"
                  target="_blank"
                  rel="noopener"
                  aria-label="Seguir @suplilist no Instagram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  Seguir no Instagram
                </a>
              </div>
            </div>
            <p class="lp-ig__cta-text">Dicas semanais de suplementação, promoções e novidades do app — tudo no Instagram.</p>
          </section>

        </main>
```

- [ ] **Step 3: Verificar no browser**

```bash
npm run dev
```

Abrir `http://localhost:5173/`. Scrollar até o fim. Confirmar ordem:
1. Seção Marketplaces
2. "PARE DE ADIVINHAR. COMECE COM CIÊNCIA." + botão "Abrir o App →"
3. Card Instagram @suplilist
4. Footer

O Instagram não deve aparecer antes do CTA.

- [ ] **Step 4: Commit**

```bash
git add src/pages/home-page.js
git commit -m "fix(landing): move instagram section after final CTA to preserve conversion funnel"
```
