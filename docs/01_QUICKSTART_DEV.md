# Developer Quick Start Guide — SupliList v2.0

**Duration:** 10 minutes  
**Prerequisites:** Node 24+, npm 10+, Git, code editor  
**Goal:** Get the dev server running with hot reload

---

## Step 1: Clone & Install (3 min)

```bash
# Clone the repository
git clone https://github.com/yourusername/suplilist.git
cd suplilist

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected Output:**
```
suplilist@2.0.0
├── @suplilist/frontend
├── @suplilist/server
├── @suplilist/shared
├── vite@latest
└── vitest@latest
```

---

## Step 2: Start Development Server (2 min)

```bash
# Terminal 1: Frontend with HMR
npm run dev

# Wait for message:
# VITE v5.x.x  ready in 450 ms
# ➜  Local:   http://localhost:5173/
```

**Visit:** http://localhost:5173/

You should see:
- SupliList header with navigation
- Search bar and filters
- Supplement cards grid
- Favorites/Comparator tabs

---

## Step 3: Setup MCP Server (Optional, 3 min)

```bash
# Terminal 2: Navigate to MCP server
cd mcp-server
npm install

# Run MCP server
npm run dev

# Expected: "MCP Server listening on port 3001"
```

**Test in Claude Code:**
```
@suplilist - "What's the top stack for muscle gain with R$300 budget?"
```

---

## Step 4: Verify Hot Module Replacement

Make a quick test edit:

```bash
# Edit src/js/utils/constants.js
# Change APP_NAME = "SupliList" to "SupliList DEV"
```

Expected: Browser refreshes automatically (check browser tab title)

---

## Key Development Commands

| Command | What it does | Terminal |
|---------|-------------|----------|
| `npm run dev` | Frontend dev server with HMR | 1 |
| `npm run dev:server` | Backend + Docker containers | 2 |
| `npm run build` | Production build (dist/) | 3 |
| `npm run test` | Run unit tests (Vitest) | 3 |
| `npm run test:coverage` | Coverage report | 3 |
| `npm run test:e2e` | Browser automation (Playwright) | 3 |
| `npm run lint:js` | Lint JavaScript | 3 |
| `npm run lint:css` | Lint CSS | 3 |

---

## Project Structure Essentials

```
suplilist/
├── frontend/                  # Frontend app (Vite + Vanilla JS)
│   ├── src/
│   │   ├── js/core/          # EventBus, StateManager
│   │   ├── js/features/      # Supplements, Favorites, etc
│   │   ├── js/components/    # UI components
│   │   ├── js/utils/         # Helpers, validators
│   │   └── css/              # Tailwind + custom styles
│   ├── package.json
│   └── vite.config.js
├── server/                    # Backend (Node.js + Express)
├── mcp-server/               # Claude Code integration
├── docs/                      # This documentation
└── database.js               # Supplement database (root)
```

---

## Common First Tasks

### Add a Supplement
Edit `database.js` at project root:
```javascript
{
  id: "vitamin-d3",
  name: "Vitamin D3 4000IU",
  category: "Micronutrients",
  defaultDose: 1,
  unit: "caps",
  costPerDose: 0.50,
  evidenceLevel: "A",
  goals: ["Immune Support", "Bone Health"],
  prices: { shopee: 39.90 },
  links: { shopee: "https://..." }
}
```
Save → Browser auto-reloads

### Edit a Component
All files in `src/` auto-reload:
```javascript
// Edit: src/js/components/supplement-card.js
// Change styling, logic, or DOM structure
// Save → See changes in <2s
```

### Run Tests Locally
```bash
npm run test              # Run all tests
npm run test -- --ui     # Open test UI
npm run test:coverage    # HTML coverage report
```

---

## Debugging Tips

### Browser DevTools
- **F12** or **Ctrl+Shift+I** (Windows/Linux) / **Cmd+Option+I** (Mac)
- **Console** tab for JavaScript errors
- **Application** tab for localStorage inspection
- **Network** tab for API calls

### Check State
```javascript
// In browser console:
localStorage.getItem('suplilist:state:v2') // View entire app state
```

### Clear Cache
```javascript
// In browser console:
localStorage.clear()
window.location.reload()
```

### View Logs
```bash
# In terminal where `npm run dev` runs:
# Look for [EventBus], [StateManager], [Error] messages
```

---

## Troubleshooting

### Port 5173 Already in Use
```bash
# Kill existing process
npx kill-port 5173

# Or use different port
npm run dev -- --port 5174
```

### Module Not Found Error
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Supplements Not Loading
```bash
# Check browser console for errors
# Verify database.js exists at project root
# Ensure LocalStorage has space (open DevTools)
```

### MCP Server Won't Connect
```bash
# Verify it's running on port 3001
netstat -an | grep 3001  # Unix/Linux/Mac
netstat -an | findstr 3001  # Windows

# Restart: Ctrl+C, then npm run dev
```

---

## Next Steps

1. **Read [Architecture Overview](./ARCHITECTURE.md)** — Understand event flow
2. **Check [Supplement Schema](./API.md)** — Learn data structure
3. **Review [Troubleshooting Guide](./TROUBLESHOOTING.md)** — Common issues

---

## Quick Reference

| Concept | File | Key Export |
|---------|------|-----------|
| Event Bus | `src/js/core/eventbus.js` | `eventBus` |
| State Manager | `src/js/core/state-manager.js` | `stateManager` |
| Supplement Repo | `src/js/features/supplements/` | `supplementRepo` |
| Validators | `src/js/types/*.schema.js` | `Schema` objects |
| Constants | `src/js/utils/constants.js` | `CATEGORIES`, etc |

---

**Ready to code?** Start with editing a component or adding a supplement!

Need help? → Check [Troubleshooting Guide](./TROUBLESHOOTING.md) or open a GitHub issue.
