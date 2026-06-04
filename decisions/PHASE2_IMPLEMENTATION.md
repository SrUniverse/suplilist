# PHASE 2 Implementation Guide - New Features

**Duration**: August 1 - September 30, 2026 (8 weeks)  
**Effort**: 155 hours  
**Investment**: ~$7,750  
**Goal**: Build feature-rich app with 5,000+ users

---

## 📊 Phase 2 Overview

| Task | Hours | Timeline | Priority |
|------|-------|----------|----------|
| 2.1 - Real-time Notifications | 40h | 1 week | 🟡 Medium |
| 2.2 - Social Sharing | 30h | 5 days | 🟡 Medium |
| 2.3 - Advanced Search | 35h | 1 week | 🟡 Important |
| 2.4 - Premium Features | 50h | 1+ weeks | 🟢 Medium |
| **Total** | **155h** | **8 weeks** | - |

---

## ✅ TASK 2.1: Real-Time Notifications (40 hours)

### Features
- Daily reminder notifications
- Streak tracking notifications
- Milestone achievements
- Price drop alerts

### Technical Implementation

#### 2.1.1 Web Notifications API (8h)
```javascript
// Create: src/features/notifications/notification-service.js

class NotificationService {
  async requestPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  async sendNotification(title, options = {}) {
    if (Notification.permission !== 'granted') return;
    return new Notification(title, {
      icon: '/logo.png',
      badge: '/badge.png',
      ...options
    });
  }

  async scheduleDaily(title, hour = 9) {
    // Schedule using service worker
    const registration = await navigator.serviceWorker.ready;
    // Implementation with showNotification
  }
}
```

#### 2.1.2 Service Worker Integration (12h)
```javascript
// Update: src/core/pwa-handler.js

self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/badge.png',
    tag: data.tag,
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
```

#### 2.1.3 User Preferences (8h)
```javascript
// Create: src/features/notifications/notification-preferences.js

/**
 * @typedef {Object} NotificationPreferences
 * @property {boolean} enabled - Notifications enabled
 * @property {number} dailyReminderHour - 0-23 (hour of day)
 * @property {boolean} streakNotifications - Show streak milestones
 * @property {boolean} priceDropAlerts - Show price alerts
 * @property {number} priceDropThreshold - % drop to trigger
 */

class NotificationPreferences {
  getPreferences() {
    return StorageManager.getItem('notification_prefs') || {
      enabled: true,
      dailyReminderHour: 9,
      streakNotifications: true,
      priceDropAlerts: true,
      priceDropThreshold: 10
    };
  }

  savePreferences(prefs) {
    StorageManager.setItem('notification_prefs', prefs);
    EventBus.emit('PREFERENCES_CHANGED', prefs);
  }
}
```

#### 2.1.4 Notification Tests (12h)
```javascript
// Create: src/features/notifications/notifications.test.js

describe('NotificationService', () => {
  test('should request permission', async () => {
    const service = new NotificationService();
    const perm = await service.requestPermission();
    expect(perm).toBe(true);
  });

  test('should send notification', async () => {
    const service = new NotificationService();
    const notif = await service.sendNotification('Test');
    expect(notif).toBeDefined();
  });

  test('should schedule daily', async () => {
    const service = new NotificationService();
    await service.scheduleDaily('Daily reminder', 9);
    // Verify scheduled
  });
});
```

### Task 2.1 Checklist
- [ ] Web Notifications API integrated
- [ ] Service worker pushes working
- [ ] User preferences stored
- [ ] Tests pass (80%+ coverage)
- [ ] E2E tested on real device
- [ ] Code review passed

---

## ✅ TASK 2.2: Social Sharing (30 hours)

### Features
- Share stack with friends
- WhatsApp/Telegram integration
- QR code for sharing
- Share check-in streak

### Implementation

#### 2.2.1 Share API (10h)
```javascript
// Create: src/features/sharing/share-service.js

class ShareService {
  async shareStack(stack) {
    const text = this.formatStackText(stack);
    const url = `${window.location.origin}?stack=${btoa(JSON.stringify(stack))}`;
    
    if (navigator.share) {
      return navigator.share({
        title: 'My Supplement Stack',
        text: text,
        url: url
      });
    }
    
    // Fallback: copy to clipboard
    return this.copyToClipboard(url);
  }

  formatStackText(stack) {
    return stack.map(s => `${s.name} (${s.dosage}g)`).join('\n');
  }

  async copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
  }
}
```

#### 2.2.2 QR Code Generation (8h)
```javascript
// Create: src/features/sharing/qr-generator.js

import QRCode from 'qrcode';

class QRGenerator {
  async generateStackQR(stack) {
    const url = `${window.location.origin}?stack=${btoa(JSON.stringify(stack))}`;
    return QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: '#000', light: '#fff' }
    });
  }

  async generateStreakQR(userId, streakDays) {
    const url = `${window.location.origin}/streak/${userId}/${streakDays}`;
    return QRCode.toDataURL(url);
  }
}
```

#### 2.2.3 WhatsApp/Telegram Integration (8h)
```javascript
// Create: src/features/sharing/messaging-share.js

class MessagingShare {
  shareViaWhatsApp(stack) {
    const text = this.formatStackText(stack);
    const encoded = encodeURIComponent(text);
    return `https://wa.me/?text=${encoded}`;
  }

  shareViaTelegram(stack) {
    const text = this.formatStackText(stack);
    const encoded = encodeURIComponent(text);
    return `https://t.me/share/url?text=${encoded}`;
  }

  openMessaging(platform, stack) {
    const url = platform === 'whatsapp' 
      ? this.shareViaWhatsApp(stack)
      : this.shareViaTelegram(stack);
    window.open(url);
  }
}
```

#### 2.2.4 Sharing Tests & E2E (4h)
- Share API tests
- QR generation tests
- Messaging integration tests
- E2E share flow

### Task 2.2 Checklist
- [ ] Share API implemented
- [ ] QR code generation working
- [ ] WhatsApp integration working
- [ ] Telegram integration working
- [ ] Tests pass (80%+ coverage)
- [ ] E2E tested
- [ ] Code review passed

---

## ✅ TASK 2.3: Advanced Search (35 hours)

### Features
- Fuzzy search on supplements
- Filter by evidence level
- Filter by price range
- Filter by benefits
- Search history

### Implementation

#### 2.3.1 Enhanced Fuse.js Integration (12h)
```javascript
// Refactor: src/core/search.js

import Fuse from 'fuse.js';

class SearchEngine {
  constructor(supplements) {
    this.fuse = new Fuse(supplements, {
      keys: ['name', 'benefits', 'category'],
      threshold: 0.3,
      includeScore: true
    });
  }

  search(query) {
    return this.fuse.search(query);
  }

  searchWithFilters(query, filters = {}) {
    let results = this.search(query);
    
    if (filters.evidenceLevel) {
      results = results.filter(r => 
        r.item.evidenceLevel === filters.evidenceLevel
      );
    }
    
    if (filters.priceRange) {
      results = results.filter(r =>
        r.item.price >= filters.priceRange.min &&
        r.item.price <= filters.priceRange.max
      );
    }
    
    return results;
  }
}
```

#### 2.3.2 Filter UI Component (10h)
```javascript
// Create: src/features/search/search-filters.js

class SearchFilters {
  render() {
    return `
      <div class="search-filters">
        <!-- Evidence level filter -->
        <select id="evidence-level">
          <option value="">All Evidence Levels</option>
          <option value="high">High Evidence</option>
          <option value="medium">Medium Evidence</option>
          <option value="low">Low Evidence</option>
        </select>

        <!-- Price range filter -->
        <input type="range" id="price-min" min="0" max="100">
        <input type="range" id="price-max" min="0" max="100">

        <!-- Benefits filter -->
        <div id="benefits-filter">
          ${this.renderBenefitCheckboxes()}
        </div>
      </div>
    `;
  }

  getSelectedFilters() {
    return {
      evidenceLevel: document.getElementById('evidence-level').value,
      priceRange: {
        min: parseInt(document.getElementById('price-min').value),
        max: parseInt(document.getElementById('price-max').value)
      },
      benefits: this.getSelectedBenefits()
    };
  }
}
```

#### 2.3.3 Search History (8h)
```javascript
// Create: src/features/search/search-history.js

class SearchHistory {
  addSearch(query) {
    const history = StorageManager.getItem('search_history') || [];
    history.unshift({ query, timestamp: Date.now() });
    StorageManager.setItem('search_history', history.slice(0, 20)); // Keep 20
  }

  getHistory() {
    return StorageManager.getItem('search_history') || [];
  }

  clearHistory() {
    StorageManager.removeItem('search_history');
  }
}
```

#### 2.3.4 Search Tests & E2E (5h)
- Search functionality tests
- Filter tests
- History tests
- E2E search flow
- Performance tests (search <500ms)

### Task 2.3 Checklist
- [ ] Fuzzy search enhanced
- [ ] Filters implemented
- [ ] Search history working
- [ ] Performance <500ms
- [ ] Tests pass (80%+ coverage)
- [ ] E2E tested
- [ ] Code review passed

---

## ✅ TASK 2.4: Premium Features (50 hours)

### Features
- Ad-free experience
- Advanced analytics dashboard
- Custom reports
- Priority support
- Offline sync

### Implementation

#### 2.4.1 Feature Flagging (15h)
```javascript
// Create: src/core/feature-flags.js

class FeatureFlags {
  constructor() {
    this.flags = {
      premiumEnabled: true,
      adFree: false, // Enabled for premium users
      advancedAnalytics: false,
      customReports: false,
      prioritySupport: false
    };
  }

  isEnabled(flag) {
    if (flag === 'adFree') {
      return StateManager.getState().user?.isPremium;
    }
    return this.flags[flag] === true;
  }

  setFlags(flags) {
    this.flags = { ...this.flags, ...flags };
    EventBus.emit('FLAGS_CHANGED', this.flags);
  }
}
```

#### 2.4.2 Premium UI Components (15h)
```javascript
// Create: src/features/premium/premium-upsell.js

class PremiumUpsell {
  render() {
    if (StateManager.getState().user?.isPremium) {
      return ''; // Already premium
    }

    return `
      <div class="premium-banner">
        <h3>Go Premium</h3>
        <p>Remove ads, get advanced analytics, custom reports</p>
        <button onclick="premiumUpsell.openPayment()">
          Upgrade - $2.99/month
        </button>
      </div>
    `;
  }

  openPayment() {
    // Integration with payment provider
    window.location.href = '/payment/premium';
  }
}
```

#### 2.4.3 Analytics Dashboard (12h)
```javascript
// Create: src/features/premium/analytics-dashboard.js

class AnalyticsDashboard {
  renderDashboard() {
    if (!StateManager.getState().user?.isPremium) {
      return this.renderUpsell();
    }

    const stats = this.getStats();
    return `
      <div class="analytics-dashboard">
        <div class="stat-card">
          <h4>Total Check-ins</h4>
          <p class="big">${stats.totalCheckins}</p>
        </div>
        <div class="stat-card">
          <h4>Average Adherence</h4>
          <p class="big">${stats.adherence}%</p>
        </div>
        <div class="stat-card">
          <h4>Most Used Supplement</h4>
          <p class="big">${stats.mostUsed}</p>
        </div>
        <div class="chart-card">
          ${this.renderChart()}
        </div>
      </div>
    `;
  }

  getStats() {
    const state = StateManager.getState();
    return {
      totalCheckins: Object.keys(state.checkins).length,
      adherence: this.calculateAdherence(),
      mostUsed: this.getMostUsedSupplement()
    };
  }
}
```

#### 2.4.4 Premium Tests (8h)
- Feature flag tests
- Premium UI tests
- Analytics dashboard tests
- Payment integration tests

### Task 2.4 Checklist
- [ ] Feature flagging working
- [ ] Premium UI components built
- [ ] Analytics dashboard working
- [ ] Payment integration ready
- [ ] Tests pass (80%+ coverage)
- [ ] E2E tested
- [ ] Code review passed

---

## 🎯 Phase 2 Success Criteria

- [ ] 5,000+ monthly active users
- [ ] 80% feature adoption
- [ ] <2s load time
- [ ] 95%+ Lighthouse score
- [ ] <2% error rate
- [ ] All tests pass
- [ ] Code review passed
- [ ] Documentation updated

---

## 📊 Phase 2 Timeline

**Week 1**: Notifications foundation (20h)  
**Week 2**: Notifications + Social (25h)  
**Week 3**: Search advanced (20h)  
**Week 4**: Premium features (25h)  
**Week 5**: Testing & polish (35h)  
**Week 6**: Code review & deployment  
**Week 7-8**: Monitor & iterate

---

**Phase 2 Status**: 🔴 NOT STARTED  
**Expected Completion**: September 30, 2026  
**Next**: PHASE 3 - Scale & Backend
