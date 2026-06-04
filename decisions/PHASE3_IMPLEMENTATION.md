# PHASE 3 Implementation Guide - Scale & Backend

**Duration**: October 1 - November 30, 2026 (8 weeks)  
**Effort**: 360 hours  
**Investment**: ~$18,000 + backend dev  
**Goal**: 10,000+ users, multi-device sync, user accounts

---

## 📊 Phase 3 Overview

| Task | Hours | Timeline | Priority |
|------|-------|----------|----------|
| 3.1 - Backend Integration | 150h | 3 weeks | 🔴 Critical |
| 3.2 - User Accounts | 80h | 2 weeks | 🔴 Critical |
| 3.3 - Sync Across Devices | 60h | 1+ weeks | 🟡 Important |
| 3.4 - Backend Analytics | 70h | 1+ weeks | 🟡 Important |
| **Total** | **360h** | **8 weeks** | - |

---

## ✅ TASK 3.1: Backend Integration (150 hours)

### Architecture

```
Frontend (Current App)
      ↓ API calls
Backend Server (Node/Python/Go)
      ↓ 
PostgreSQL + Redis
```

### Tech Stack Decision

**Options**:
- **Node.js + Express** (Recommended) - JS everywhere, easy migration
- **Python + Django** - Mature, good ORM
- **Go** - Fast, concurrent, good for scale

**Recommendation**: Node.js + Express for faster iteration

### Implementation

#### 3.1.1 API Server Setup (30h)
```javascript
// Backend: server.js

const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(auth);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// User routes
app.post('/api/users/register', require('./routes/auth').register);
app.post('/api/users/login', require('./routes/auth').login);
app.get('/api/users/me', require('./routes/users').getMe);

// Sync routes
app.post('/api/sync/stack', require('./routes/sync').syncStack);
app.post('/api/sync/checkins', require('./routes/sync').syncCheckins);

// Analytics routes
app.post('/api/analytics/events', require('./routes/analytics').postEvents);
app.get('/api/analytics/summary', require('./routes/analytics').getSummary);

app.listen(3000, () => console.log('API listening on 3000'));
```

#### 3.1.2 Database Schema (25h)
```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- stacks table
CREATE TABLE user_stacks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  supplement_id VARCHAR(255),
  dosage DECIMAL,
  frequency VARCHAR(50),
  created_at TIMESTAMP,
  UNIQUE(user_id, supplement_id)
);

-- checkins table
CREATE TABLE checkins (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  supplement_id VARCHAR(255),
  date DATE,
  checked_in BOOLEAN,
  UNIQUE(user_id, supplement_id, date)
);

-- analytics table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_name VARCHAR(255),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_user_date ON events(user_id, created_at);
```

#### 3.1.3 Authentication (25h)
```javascript
// Backend: middleware/auth.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthService {
  async register(email, password) {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash: hash });
    return this.generateToken(user);
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');
    return this.generateToken(user);
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}
```

#### 3.1.4 API Client Update (20h)
```javascript
// Frontend: src/core/api-client.js

class APIClient {
  constructor(baseURL = 'https://api.suplilist.com') {
    this.baseURL = baseURL;
    this.token = StorageManager.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    StorageManager.setItem('auth_token', token);
  }

  async request(method, path, data = null) {
    const url = `${this.baseURL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    };

    if (data) options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  async register(email, password) {
    const { token } = await this.request('POST', '/api/users/register', {
      email, password
    });
    this.setToken(token);
    return token;
  }

  async login(email, password) {
    const { token } = await this.request('POST', '/api/users/login', {
      email, password
    });
    this.setToken(token);
    return token;
  }

  async syncStack(stack) {
    return this.request('POST', '/api/sync/stack', { stack });
  }

  async syncCheckins(checkins) {
    return this.request('POST', '/api/sync/checkins', { checkins });
  }
}
```

#### 3.1.5 Backend Tests & Deployment (30h)
- API integration tests
- Database tests
- Authentication tests
- Load testing (1000+ users)
- Deployment to staging
- Production deployment

### Task 3.1 Checklist
- [ ] Backend API deployed
- [ ] Database created & migrated
- [ ] Authentication working
- [ ] API client integrated
- [ ] Tests pass (85%+ coverage)
- [ ] Load tested (1000+ concurrent)
- [ ] Code review passed
- [ ] Monitoring configured

---

## ✅ TASK 3.2: User Accounts (80 hours)

### Features
- User registration/login
- Account settings
- Profile management
- Account deletion (GDPR)
- Password reset

### Implementation

#### 3.2.1 Login/Register UI (20h)
```javascript
// Frontend: src/pages/auth-page.js

class AuthPage {
  render() {
    return this.isLogin ? this.renderLogin() : this.renderRegister();
  }

  renderLogin() {
    return `
      <div class="auth-page">
        <form onsubmit="authPage.handleLogin(event)">
          <input type="email" id="email" placeholder="Email" required>
          <input type="password" id="password" placeholder="Password" required>
          <button type="submit">Login</button>
          <button type="button" onclick="authPage.switchToRegister()">
            No account? Register
          </button>
        </form>
      </div>
    `;
  }

  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      await APIClient.login(email, password);
      StateManager.dispatch('SET_USER_LOGGED_IN', { email });
      Router.navigate('/home');
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

#### 3.2.2 Account Settings (20h)
```javascript
// Frontend: src/pages/account-settings-page.js

class AccountSettingsPage {
  render() {
    const user = StateManager.getState().user;
    return `
      <div class="account-settings">
        <div class="setting">
          <h3>Email</h3>
          <p>${user.email}</p>
          <button onclick="this.changeEmail()">Change</button>
        </div>

        <div class="setting">
          <h3>Password</h3>
          <button onclick="this.changePassword()">Change Password</button>
        </div>

        <div class="setting">
          <h3>Data Export</h3>
          <button onclick="this.exportData()">Download my data</button>
        </div>

        <div class="setting danger">
          <h3>Delete Account</h3>
          <p>Permanently delete your account and all data</p>
          <button onclick="this.deleteAccount()">Delete Account</button>
        </div>
      </div>
    `;
  }

  async changePassword() {
    const oldPassword = prompt('Current password:');
    const newPassword = prompt('New password:');
    await APIClient.request('POST', '/api/users/change-password', {
      oldPassword, newPassword
    });
    this.showSuccess('Password changed');
  }

  async deleteAccount() {
    const confirm = prompt('Type DELETE to confirm');
    if (confirm !== 'DELETE') return;
    await APIClient.request('DELETE', '/api/users/me');
    StorageManager.clear();
    Router.navigate('/home');
  }
}
```

#### 3.2.3 Profile Management (20h)
```javascript
// Backend: routes/users.js

router.get('/api/users/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ user });
});

router.put('/api/users/me', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, req.body);
  res.json({ user });
});

router.post('/api/users/change-password', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  const valid = await bcrypt.compare(req.body.oldPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });
  
  user.password_hash = await bcrypt.hash(req.body.newPassword, 10);
  await user.save();
  res.json({ success: true });
});

router.delete('/api/users/me', auth, async (req, res) => {
  // Delete all user data (GDPR)
  await User.deleteOne({ _id: req.userId });
  await UserStack.deleteMany({ user_id: req.userId });
  await Checkin.deleteMany({ user_id: req.userId });
  res.json({ success: true });
});
```

#### 3.2.4 Account Tests (20h)
- Login/register flow tests
- Account settings tests
- Password change tests
- Account deletion tests
- E2E authentication flow

### Task 3.2 Checklist
- [ ] Login/register working
- [ ] Account settings working
- [ ] Profile management working
- [ ] Password reset working
- [ ] GDPR compliant deletion
- [ ] Tests pass (85%+ coverage)
- [ ] E2E tested
- [ ] Code review passed

---

## ✅ TASK 3.3: Sync Across Devices (60 hours)

### Architecture

```
Device A (offline)
    ↓
Backend (source of truth)
    ↓
Device B (syncs when online)
```

### Implementation

#### 3.3.1 Conflict Resolution (20h)
```javascript
// Frontend: src/core/sync-manager.js

class SyncManager {
  async syncStack(localStack) {
    // Get server version
    const serverStack = await APIClient.getStack();
    
    // Compare timestamps
    const merged = this.merge(localStack, serverStack);
    
    // Save locally
    StateManager.dispatch('UPDATE_STACK', merged);
    
    // Save to server
    await APIClient.syncStack(merged);
  }

  merge(local, server) {
    // Merge strategy: server wins if newer
    const merged = { ...local };
    
    for (const supplement of server) {
      const localVersion = local.find(s => s.id === supplement.id);
      if (!localVersion || supplement.updatedAt > localVersion.updatedAt) {
        merged[supplement.id] = supplement;
      }
    }
    
    return merged;
  }
}
```

#### 3.3.2 Offline Queue (20h)
```javascript
// Frontend: src/core/offline-queue.js

class OfflineQueue {
  async queueAction(action, data) {
    const queue = StorageManager.getItem('offline_queue') || [];
    queue.push({ action, data, timestamp: Date.now() });
    StorageManager.setItem('offline_queue', queue);
  }

  async processQueue() {
    const queue = StorageManager.getItem('offline_queue') || [];
    
    for (const item of queue) {
      try {
        await this.executeAction(item);
        queue.shift(); // Remove processed item
      } catch (error) {
        console.error('Queue error:', error);
        break; // Stop on first error, retry later
      }
    }
    
    StorageManager.setItem('offline_queue', queue);
  }

  async executeAction(item) {
    switch (item.action) {
      case 'sync-stack':
        return await SyncManager.syncStack(item.data);
      case 'sync-checkin':
        return await SyncManager.syncCheckin(item.data);
      default:
        throw new Error('Unknown action: ' + item.action);
    }
  }
}
```

#### 3.3.3 Real-time Sync with WebSocket (12h)
```javascript
// Frontend: src/core/websocket-sync.js

class WebSocketSync {
  constructor(userId) {
    this.userId = userId;
    this.ws = null;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`wss://api.suplilist.com/sync/${this.userId}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleSync(data);
    };

    this.ws.onclose = () => {
      // Reconnect after 5s
      setTimeout(() => this.connect(), 5000);
    };
  }

  handleSync(data) {
    // Update local state with server changes
    StateManager.dispatch('APPLY_REMOTE_SYNC', data);
    EventBus.emit('SYNCED', data);
  }

  sendUpdate(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      OfflineQueue.queueAction('sync-update', data);
    }
  }
}
```

#### 3.3.4 Sync Tests (8h)
- Conflict resolution tests
- Offline queue tests
- WebSocket sync tests
- E2E multi-device sync

### Task 3.3 Checklist
- [ ] Conflict resolution working
- [ ] Offline queue processing
- [ ] WebSocket real-time sync
- [ ] Device sync working
- [ ] Tests pass (85%+ coverage)
- [ ] E2E tested
- [ ] Code review passed

---

## ✅ TASK 3.4: Backend Analytics (70 hours)

### Features
- Server-side event collection
- Funnel tracking
- Cohort analysis
- User retention metrics
- A/B testing support

### Implementation

#### 3.4.1 Event Ingestion (20h)
```javascript
// Backend: routes/analytics.js

router.post('/api/analytics/events', auth, async (req, res) => {
  const { events } = req.body;
  
  // Validate
  for (const event of events) {
    if (!event.event || !event.timestamp) {
      return res.status(400).json({ error: 'Invalid event' });
    }
  }
  
  // Save to database
  await Event.insertMany(
    events.map(e => ({
      ...e,
      user_id: req.userId,
      created_at: new Date()
    }))
  );
  
  res.json({ success: true, count: events.length });
});
```

#### 3.4.2 Metrics Aggregation (20h)
```javascript
// Backend: services/analytics-service.js

class AnalyticsService {
  async getRetention() {
    // D1, D7, D30 retention
    const users = await User.find();
    return {
      d1: this.calculateRetention(users, 1),
      d7: this.calculateRetention(users, 7),
      d30: this.calculateRetention(users, 30)
    };
  }

  async getFunnelConversion(funnel) {
    // Analyze conversion through funnel steps
    const steps = funnel.steps;
    const conversions = [];
    
    for (let i = 0; i < steps.length - 1; i++) {
      const from = await Event.countDocuments({ event: steps[i] });
      const to = await Event.countDocuments({ event: steps[i + 1] });
      conversions.push({ from: steps[i], to: steps[i + 1], rate: to / from });
    }
    
    return conversions;
  }

  async getCohortAnalysis(cohortDate) {
    // Cohort = users created on cohortDate
    // Track their retention over time
    return {
      cohortDate,
      retention: this.calculateCohortRetention(cohortDate)
    };
  }
}
```

#### 3.4.3 Analytics Dashboard API (15h)
```javascript
// Backend: routes/dashboard.js

router.get('/api/dashboard/summary', auth, async (req, res) => {
  const summary = {
    totalUsers: await User.countDocuments(),
    activeUsers: await User.countDocuments({ last_active: { $gte: Date.now() - 24*60*60*1000 } }),
    retention: await AnalyticsService.getRetention(),
    revenue: await PaymentService.getRevenue()
  };
  res.json(summary);
});

router.get('/api/dashboard/funnel/:name', auth, async (req, res) => {
  const funnel = await AnalyticsService.getFunnelConversion(req.params.name);
  res.json(funnel);
});

router.get('/api/dashboard/cohort/:date', auth, async (req, res) => {
  const cohort = await AnalyticsService.getCohortAnalysis(req.params.date);
  res.json(cohort);
});
```

#### 3.4.4 Analytics Tests (15h)
- Event ingestion tests
- Metrics calculation tests
- Funnel tests
- Cohort tests
- API tests

### Task 3.4 Checklist
- [ ] Event ingestion working
- [ ] Metrics aggregated
- [ ] Funnel tracking
- [ ] Cohort analysis
- [ ] Dashboard API working
- [ ] Tests pass (85%+ coverage)
- [ ] Code review passed

---

## 🎯 Phase 3 Success Criteria

- [ ] 10,000+ monthly active users
- [ ] Multi-device sync working
- [ ] User accounts functional
- [ ] Server cost <$100/month
- [ ] 99.9% uptime
- [ ] All tests pass
- [ ] Code review passed
- [ ] Documentation updated

---

**Phase 3 Status**: 🔴 NOT STARTED  
**Expected Completion**: November 30, 2026  
**Next**: PHASE 4 - Polish & Launch
