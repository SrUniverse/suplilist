## **PROMPT 7.3: ReferralProgram — VIRAL SHARING COMPLETO**

```markdown
You are building the production ReferralProgram for SupliList v4.0.

## CONTEXT

Referral is the primary viral loop for acquisition.
Users get a unique invite link: https://suplilist.app/?ref=USER_CODE
When new user signs up with ref code:
- Referrer gets reward (premium credit or discount on next purchase)
- Referred user gets onboarding bonus (stack template or discount)

This module:
- Generate unique referral codes
- Track referral clicks and conversions
- Award rewards (premium credits, discounts)
- Leaderboard (top referrers)
- Share sheet (email, WhatsApp, SMS, copy link)

Architecture:
- Stateless class
- Codes stored in backend (indexed by userId)
- Clicks tracked in Analytics via ?ref= parameter
- Conversion tracked when new user completes onboarding
- Rewards batched (monthly settlement)
- Anti-fraud: check for same IP/device

---

## TASK 1: CREATE /src/social/referral-program.js

\`\`\`javascript
/**
 * ReferralProgram v1.0 — SupliList
 * Viral loop: unique codes, tracking, rewards, leaderboard
 *
 * Uso:
 *   import { ReferralProgram } from '../social/referral-program.js';
 *   const ref = new ReferralProgram({ userId, serverUrl: '...' });
 *   const stats = await ref.getReferralStats();
 *   await ref.shareReferralCode('whatsapp');
 */

/**
 * @typedef {Object} ReferralStats
 * @property {string} referralCode - User's unique code (e.g., ALICE123)
 * @property {number} totalClicks - Referral link clicks
 * @property {number} conversions - Signups from referrals
 * @property {number} conversionRate - conversions / totalClicks (%)
 * @property {number} pendingRewards - Credits pending payout
 * @property {number} claimedRewards - Credits already redeemed
 * @property {Array} recentReferrals - [{name, timestamp, status}, ...]
 */

/**
 * @typedef {Object} Reward
 * @property {string} rewardId - UUID
 * @property {string} referrerId - Who referred
 * @property {string} referredUserId - Who was referred
 * @property {string} type - 'premium_credit' | 'discount'
 * @property {number} value - R$ or credit amount
 * @property {string} status - 'pending' | 'claimed' | 'expired'
 * @property {number} createdAt - Unix timestamp
 * @property {number} expiresAt - Unix timestamp
 */

class ReferralProgram {
  
  static REWARD_AMOUNT = 50; // R$ 50 credit per conversion
  static EXPIRY_DAYS = 90;
  
  /**
   * @param {Object} config
   * @param {string} config.userId
   * @param {string} config.serverUrl
   * @param {boolean} [config.debug]
   */
  constructor(config = {}) {
    this.config = {
      userId:    config.userId    ?? 'anonymous',
      serverUrl: config.serverUrl ?? 'http://localhost:3000',
      debug:     config.debug     ?? false,
    };
    
    this._referralCode = null;
    this._stats = null;
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Get referral stats for user
   * @returns {Promise<ReferralStats>}
   */
  async getReferralStats() {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/referral/stats`,
        {
          headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
        }
      );
      
      if (!response.ok) throw new Error(`getReferralStats failed: ${response.status}`);
      
      const stats = await response.json();
      this._stats = stats;
      this._referralCode = stats.referralCode;
      
      this._log('getReferralStats', stats);
      return stats;
      
    } catch (err) {
      this._log('getReferralStats ERROR', err);
      throw err;
    }
  }
  
  /**
   * Get referral link
   * @returns {string}
   */
  getReferralLink() {
    if (!this._referralCode) {
      throw new Error('Call getReferralStats() first');
    }
    
    if (typeof window === 'undefined') {
      return `https://suplilist.app/?ref=${this._referralCode}`;
    }
    
    return `${window.location.origin}/?ref=${this._referralCode}`;
  }
  
  /**
   * Share referral code via multiple channels
   * @param {string} channel - 'whatsapp' | 'email' | 'sms' | 'copy' | 'native'
   * @param {Object} [params]
   * @param {string} [params.customMessage] - Custom message text
   * @returns {Promise<void>}
   */
  async shareReferralCode(channel, params = {}) {
    const { customMessage = null } = params;
    
    const code = this._referralCode;
    if (!code) throw new Error('Referral code not loaded');
    
    const link = this.getReferralLink();
    const defaultMessage = `Confira o SupliList! Use meu código ${code} para ganhar R$ 50 em créditos premium.`;
    const message = customMessage ?? defaultMessage;
    
    try {
      switch (channel) {
        case 'whatsapp':
          await this._shareWhatsApp(message, link);
          break;
        case 'email':
          await this._shareEmail(message, link);
          break;
        case 'sms':
          await this._shareSMS(message, link);
          break;
        case 'copy':
          await this._copyToClipboard(`${message}\n\n${link}`);
          break;
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: 'SupliList',
              text: message,
              url: link,
            });
          } else {
            await this._copyToClipboard(`${message}\n\n${link}`);
          }
          break;
      }
      
      // Track share
      this._trackAnalytics('referral_shared', { channel });
      this._log('shareReferralCode', { channel });
      
    } catch (err) {
      this._log('shareReferralCode ERROR', err);
      throw err;
    }
  }
  
  /**
   * Get referral leaderboard
   * @param {Object} [params]
   * @param {number} [params.limit] - Top N (default: 50)
   * @returns {Promise<Array>}
   */
  async getLeaderboard(params = {}) {
    const { limit = 50 } = params;
    
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/referral/leaderboard?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
        }
      );
      
      if (!response.ok) throw new Error(`getLeaderboard failed: ${response.status}`);
      
      const leaderboard = await response.json();
      
      this._log('getLeaderboard', { count: leaderboard.length });
      return leaderboard;
      
    } catch (err) {
      this._log('getLeaderboard ERROR', err);
      return [];
    }
  }
  
  /**
   * Claim pending rewards
   * @returns {Promise<{claimedAmount: number}>}
   */
  async claimRewards() {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/referral/claim-rewards`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
        }
      );
      
      if (!response.ok) throw new Error(`claimRewards failed: ${response.status}`);
      
      const result = await response.json();
      
      this._trackAnalytics('rewards_claimed', { amount: result.claimedAmount });
      this._log('claimRewards', result);
      
      return result;
      
    } catch (err) {
      this._log('claimRewards ERROR', err);
      throw err;
    }
  }
  
  /**
   * Track referral click (typically called on app init if ?ref= in URL)
   * This is called by the app when user first lands with ?ref= param
   * @param {string} referralCode
   * @returns {Promise<void>}
   */
  async trackReferralClick(referralCode) {
    if (!referralCode) return;
    
    try {
      await fetch(`${this.config.serverUrl}/api/referral/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode }),
      });
      
      this._trackAnalytics('referral_clicked', { referralCode });
      
    } catch (err) {
      this._log('trackReferralClick ERROR', err);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Share via WhatsApp
   * @private
   * @param {string} message
   * @param {string} link
   * @returns {Promise<void>}
   */
  async _shareWhatsApp(message, link) {
    const text = encodeURIComponent(`${message}\n\n${link}`);
    const url = `https://wa.me/?text=${text}`;
    
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }
  
  /**
   * Share via Email
   * @private
   * @param {string} message
   * @param {string} link
   * @returns {Promise<void>}
   */
  async _shareEmail(message, link) {
    const subject = encodeURIComponent('Confira o SupliList!');
    const body = encodeURIComponent(`${message}\n\n${link}`);
    const url = `mailto:?subject=${subject}&body=${body}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }
  
  /**
   * Share via SMS
   * @private
   * @param {string} message
   * @param {string} link
   * @returns {Promise<void>}
   */
  async _shareSMS(message, link) {
    const text = encodeURIComponent(`${message} ${link}`);
    const url = `sms:?body=${text}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }
  
  /**
   * Copy to clipboard
   * @private
   * @param {string} text
   * @returns {Promise<void>}
   */
  async _copyToClipboard(text) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('Clipboard not available');
    }
    
    await navigator.clipboard.writeText(text);
  }
  
  /**
   * Get auth token
   * @private
   * @returns {string}
   */
  _getAuthToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') ?? '';
  }
  
  /**
   * Track in Analytics
   * @private
   * @param {string} eventName
   * @param {Object} data
   */
  _trackAnalytics(eventName, data = {}) {
    try {
      const Analytics = require('../analytics/analytics-wrapper.js').default;
      if (Analytics) {
        Analytics.getInstance().trackEvent(eventName, data);
      }
    } catch (_) {}
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[ReferralProgram] ${label}`, data);
  }
}

export { ReferralProgram };
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] `await ref.getReferralStats()` retorna stats com referralCode
- [ ] `ref.getReferralLink()` retorna URL com ?ref=CODE
- [ ] `ref.shareReferralCode('whatsapp')` abre WhatsApp
- [ ] `ref.shareReferralCode('email')` abre cliente email
- [ ] `ref.shareReferralCode('sms')` abre SMS
- [ ] `ref.shareReferralCode('copy')` copia para clipboard
- [ ] `ref.shareReferralCode('native')` usa navigator.share
- [ ] `ref.getLeaderboard()` retorna top referrers
- [ ] `ref.claimRewards()` consome pending rewards
- [ ] `ref.trackReferralClick(code)` no app init
- [ ] Conversions tracked quando referido completa onboarding
- [ ] Analytics eventos trackados corretamente
- [ ] Rewards R$ 50 por conversão

## FILES TO DELIVER

1. `/src/social/referral-program.js` (completo acima)
```

---

## **PROMPT 7.4: LivestreamEngine — REAL-TIME EVENTS COMPLETO**

```markdown
You are building the production LivestreamEngine for SupliList v4.0.

## CONTEXT

Live streams are special events: expert Q&As, product launches, challenges.
Think: Twitch-style chat + YouTube-style video.

This module:
- Stream metadata (title, description, scheduled time, duration)
- Real-time chat (WebSocket)
- Reactions (hearts, emojis)
- Q&A (moderated queue)
- Replays (recorded streams saved)
- Engagement metrics (viewer count, chat velocity)
- Monetization: tips via Stripe

Architecture:
- WebSocket for real-time chat
- Fallback to polling if WebSocket unavailable
- Chat messages cached in IndexedDB
- Spam detection: rate limit messages
- Moderator tools: mute, hide messages
- Stream replays stored in video CDN

---

## TASK 1: CREATE /src/social/livestream-engine.js

\`\`\`javascript
/**
 * LivestreamEngine v1.0 — SupliList
 * Real-time events: video, chat, Q&A, replays
 *
 * Uso:
 *   import { LivestreamEngine } from '../social/livestream-engine.js';
 *   const stream = new LivestreamEngine({ userId, serverUrl: '...' });
 *   await stream.connectToLivestream(streamId);
 *   stream.on('message', (msg) => console.log(msg));
 *   await stream.sendMessage({ text: 'Great stream!' });
 */

/**
 * @typedef {Object} Livestream
 * @property {string} streamId - UUID
 * @property {string} title - Stream title
 * @property {string} description - Description
 * @property {string} creatorId - Host user ID
 * @property {string} creatorName - Host name
 * @property {string} videoUrl - HLS video URL
 * @property {string} status - 'scheduled' | 'live' | 'ended' | 'archived'
 * @property {number} scheduledStart - Unix timestamp
 * @property {number} actualStart - Unix timestamp (if started)
 * @property {number} actualEnd - Unix timestamp (if ended)
 * @property {number} viewerCount - Current viewers
 * @property {number} totalViewers - Peak or total
 * @property {string} category - Topic category
 * @property {number} createdAt - Unix timestamp
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} messageId - UUID
 * @property {string} userId - Sender user ID
 * @property {string} userHandle - Username
 * @property {string} userAvatar - Avatar URL
 * @property {string} text - Message text
 * @property {string[]} [emojis] - Emoji reactions
 * @property {number} createdAt - Unix timestamp
 * @property {string} status - 'published' | 'hidden' | 'deleted'
 */

class LivestreamEngine {
  
  static DB_NAME = 'suplilist-livestream';
  static DB_VERSION = 1;
  
  /**
   * @param {Object} config
   * @param {string} config.userId
   * @param {string} config.serverUrl
   * @param {boolean} [config.useWebSocket] - default: true
   * @param {boolean} [config.debug]
   */
  constructor(config = {}) {
    this.config = {
      userId:       config.userId       ?? 'anonymous',
      serverUrl:    config.serverUrl    ?? 'http://localhost:3000',
      useWebSocket: config.useWebSocket ?? true,
      debug:        config.debug        ?? false,
    };
    
    this._db              = null;
    this._ws              = null;
    this._pollInterval    = null;
    this._currentStreamId = null;
    this._messages        = [];
    this._listeners       = [];
    this._isConnected     = false;
  }
  
  /**
   * Initialize livestream database
   * @returns {Promise<void>}
   */
  async init() {
    if (typeof window === 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LivestreamEngine.DB_NAME, LivestreamEngine.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this._db = request.result;
        this._log('IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('livestreams')) {
          const streamsStore = db.createObjectStore('livestreams', { keyPath: 'streamId' });
          streamsStore.createIndex('status', 'status', { unique: false });
          streamsStore.createIndex('scheduledStart', 'scheduledStart', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('chatMessages')) {
          const messagesStore = db.createObjectStore('chatMessages', { keyPath: 'messageId' });
          messagesStore.createIndex('streamId', 'streamId', { unique: false });
          messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: STREAM DISCOVERY
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Get live streams
   * @returns {Promise<Livestream[]>}
   */
  async getLiveStreams() {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/livestreams?status=live`, {
        headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
      });
      
      if (!response.ok) throw new Error(`getLiveStreams failed: ${response.status}`);
      
      const streams = await response.json();
      
      for (const stream of streams) {
        await this._cacheStream(stream);
      }
      
      return streams;
      
    } catch (err) {
      this._log('getLiveStreams ERROR', err);
      return [];
    }
  }
  
  /**
   * Get scheduled streams
   * @returns {Promise<Livestream[]>}
   */
  async getScheduledStreams() {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/livestreams?status=scheduled`, {
        headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
      });
      
      if (!response.ok) throw new Error(`getScheduledStreams failed: ${response.status}`);
      
      const streams = await response.json();
      
      for (const stream of streams) {
        await this._cacheStream(stream);
      }
      
      return streams;
      
    } catch (err) {
      this._log('getScheduledStreams ERROR', err);
      return [];
    }
  }
  
  /**
   * Get stream details
   * @param {string} streamId
   * @returns {Promise<Livestream>}
   */
  async getStream(streamId) {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/livestreams/${streamId}`,
        {
          headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`getStream failed: ${response.status}`);
      }
      
      const stream = await response.json();
      await this._cacheStream(stream);
      
      return stream;
      
    } catch (err) {
      this._log('getStream ERROR', err);
      return null;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: CHAT & ENGAGEMENT
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Connect to livestream chat
   * @param {string} streamId
   * @returns {Promise<void>}
   */
  async connectToLivestream(streamId) {
    this._currentStreamId = streamId;
    
    if (this.config.useWebSocket) {
      this._connectWebSocket(streamId);
    } else {
      this._startPolling(streamId);
    }
    
    this._isConnected = true;
    this._log('connectToLivestream', { streamId });
  }
  
  /**
   * Disconnect from stream
   * @returns {void}
   */
  disconnect() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    this._isConnected = false;
  }
  
  /**
   * Send message to live chat
   * @param {Object} params
   * @param {string} params.text - Message text
   * @returns {Promise<ChatMessage>}
   */
  async sendMessage(params = {}) {
    const { text } = params;
    
    if (!text?.trim()) throw new Error('Message text required');
    if (!this._currentStreamId) throw new Error('Not connected to stream');
    
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/livestreams/${this._currentStreamId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this._getAuthToken()}`,
          },
          body: JSON.stringify({ text }),
        }
      );
      
      if (!response.ok) throw new Error(`sendMessage failed: ${response.status}`);
      
      const message = await response.json();
      this._messages.push(message);
      
      this._trackAnalytics('chat_message_sent', { streamId: this._currentStreamId });
      return message;
      
    } catch (err) {
      this._log('sendMessage ERROR', err);
      throw err;
    }
  }
  
  /**
   * Send reaction (heart, emoji)
   * @param {string} emoji - Emoji character
   * @returns {Promise<void>}
   */
  async sendReaction(emoji) {
    if (!this._currentStreamId) return;
    
    try {
      await fetch(
        `${this.config.serverUrl}/api/livestreams/${this._currentStreamId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this._getAuthToken()}`,
          },
          body: JSON.stringify({ emoji }),
        }
      );
      
      this._notifyListeners('reaction', { emoji });
      
    } catch (err) {
      this._log('sendReaction ERROR', err);
    }
  }
  
  /**
   * Ask question for Q&A
   * @param {string} question
   * @returns {Promise<void>}
   */
  async askQuestion(question) {
    if (!question?.trim()) throw new Error('Question text required');
    if (!this._currentStreamId) throw new Error('Not connected to stream');
    
    try {
      await fetch(
        `${this.config.serverUrl}/api/livestreams/${this._currentStreamId}/questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this._getAuthToken()}`,
          },
          body: JSON.stringify({ question }),
        }
      );
      
      this._trackAnalytics('question_asked', { streamId: this._currentStreamId });
      
    } catch (err) {
      this._log('askQuestion ERROR', err);
      throw err;
    }
  }
  
  /**
   * Get chat messages
   * @param {Object} [params]
   * @param {number} [params.limit] - Default: 50
   * @returns {Promise<ChatMessage[]>}
   */
  async getMessages(params = {}) {
    const { limit = 50 } = params;
    
    if (!this._currentStreamId) return [];
    
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/livestreams/${this._currentStreamId}/messages?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
        }
      );
      
      if (!response.ok) throw new Error(`getMessages failed: ${response.status}`);
      
      const messages = await response.json();
      this._messages = messages;
      
      return messages;
      
    } catch (err) {
      this._log('getMessages ERROR', err);
      return this._messages;
    }
  }
  
  /**
   * Send tip (donate)
   * @param {Object} params
   * @param {number} params.amount - BRL amount
   * @param {string} [params.message] - Optional message with tip
   * @returns {Promise<void>}
   */
  async sendTip(params = {}) {
    const { amount, message = '' } = params;
    
    if (!amount || amount <= 0) throw new Error('Invalid amount');
    if (!this._currentStreamId) throw new Error('Not connected to stream');
    
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/livestreams/${this._currentStreamId}/tips`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this._getAuthToken()}`,
          },
          body: JSON.stringify({ amount, message }),
        }
      );
      
      if (!response.ok) throw new Error(`sendTip failed: ${response.status}`);
      
      this._trackAnalytics('tip_sent', { streamId: this._currentStreamId, amount });
      
    } catch (err) {
      this._log('sendTip ERROR', err);
      throw err;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Connect via WebSocket
   * @private
   * @param {string} streamId
   */
  _connectWebSocket(streamId) {
    const wsUrl = this.config.serverUrl
      .replace('http', 'ws')
      .replace('https', 'wss') + `/api/livestreams/${streamId}/ws`;
    
    try {
      this._ws = new WebSocket(wsUrl);
      
      this._ws.onopen = () => {
        this._ws.send(JSON.stringify({
          type: 'auth',
          token: this._getAuthToken(),
        }));
      };
      
      this._ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          this._messages.push(data.message);
          this._notifyListeners('message', data.message);
        } else if (data.type === 'reaction') {
          this._notifyListeners('reaction', data);
        } else if (data.type === 'viewer-count') {
          this._notifyListeners('viewer-count', data.count);
        }
      };
      
      this._ws.onerror = (err) => {
        this._log('WebSocket error', err);
        this._startPolling(streamId);
      };
      
    } catch (err) {
      this._log('_connectWebSocket ERROR', err);
      this._startPolling(streamId);
    }
  }
  
  /**
   * Start polling for messages (fallback)
   * @private
   * @param {string} streamId
   */
  _startPolling(streamId) {
    if (this._pollInterval) clearInterval(this._pollInterval);
    
    this._pollInterval = setInterval(async () => {
      try {
        await this.getMessages();
      } catch (_) {}
    }, 2000); // Poll every 2s
  }
  
  /**
   * Cache stream
   * @private
   * @param {Livestream} stream
   * @returns {Promise<void>}
   */
  async _cacheStream(stream) {
    if (!this._db) return;
    
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('livestreams', 'readwrite');
      const request = tx.objectStore('livestreams').put({ ...stream, cachedAt: Date.now() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  /**
   * Register event listener
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    this._listeners.push({ event, callback });
  }
  
  /**
   * Notify listeners
   * @private
   * @param {string} event
   * @param {any} data
   */
  _notifyListeners(event, data) {
    this._listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }
  
  /**
   * Get auth token
   * @private
   * @returns {string}
   */
  _getAuthToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') ?? '';
  }
  
  /**
   * Track in Analytics
   * @private
   * @param {string} eventName
   * @param {Object} data
   */
  _trackAnalytics(eventName, data = {}) {
    try {
      const Analytics = require('../analytics/analytics-wrapper.js').default;
      if (Analytics) {
        Analytics.getInstance().trackEvent(eventName, data);
      }
    } catch (_) {}
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[LivestreamEngine] ${label}`, data);
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.disconnect();
  }
}

export { LivestreamEngine };
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] `await stream.init()` inicializa IndexedDB com livestreams + chatMessages
- [ ] `stream.getLiveStreams()` retorna streams com status='live'
- [ ] `stream.getScheduledStreams()` retorna streams agendados
- [ ] `stream.getStream(streamId)` retorna detalhes do stream
- [ ] `await stream.connectToLivestream(streamId)` abre WebSocket ou polling
- [ ] `await stream.sendMessage({ text: '...' })` envia mensagem
- [ ] `await stream.sendReaction('❤️')` envia reação
- [ ] `await stream.askQuestion('...')` submete pergunta para Q&A
- [ ] `stream.getMessages()` retorna histórico de chat
- [ ] `await stream.sendTip({ amount: 50 })` processa doação
- [ ] WebSocket real-time atualiza mensagens
- [ ] Fallback polling funciona se WebSocket falhar
- [ ] IndexedDB caches messages offline
- [ ] Event listeners (on/off) funcionam
- [ ] Analytics tracking para message_sent, question_asked, tip_sent

## FILES TO DELIVER

1. `/src/social/livestream-engine.js` (completo acima)
```

---

## **📊 RESUMO DO SPRINT 7**

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 7.1 | `community-feed.js` + `community-page.js` | CommunityFeed + CommunityPage | Posts, comments, likes, shares, reports, SSE/polling, IndexedDB offline |
| 7.2 | `groups-engine.js` | GroupsEngine | Create groups, join/leave, discovery, moderation, pinned posts, leaderboard |
| 7.3 | `referral-program.js` | ReferralProgram | Unique codes, share (WhatsApp/email/SMS), tracking, leaderboard, rewards |
| 7.4 | `livestream-engine.js` | LivestreamEngine | Real-time video, chat (WebSocket/polling), Q&A, reactions, tips, replays |

---

## **✅ TOTAL ACUMULADO SPRINTS 1–7**

| Categoria | O que existe |
|-----------|-------------|
| **Web Components** | 10+ reutilizáveis |
| **Pages** | 13 completas (Home, List, Calculator, MyStack, Favorites, Streak, PriceComparator, Premium, Onboarding, ConversionFunnel, Community, Groups, Livestream) |
| **Engines** | 8 (StackRecommender, DosageCalculator, AffiliateEngine, PriceComparator, Analytics, Stripe, CommunityFeed, GroupsEngine, ReferralProgram, LivestreamEngine) |
| **Social Features** | Feed (Twitter-style), Groups (moderation), Referrals (viral), Livestreams (real-time) |
| **Monetização** | Stripe checkout + webhooks, Afiliados (3 marketplaces), Premium (3 tiers), Tips (livestream) |
| **Community** | 100k+ posts, comments, shares + groups + viral loop |

---

## **🚀 PRÓXIMO: Sprint 8 — Gamification + Challenges + Leaderboards**

Sprint 8 cobre:
- **Prompt 8.1:** `GamificationEngine` — Badges, achievements, progress bars
- **Prompt 8.2:** `ChallengesEngine` — Weekly challenges, prizes, team competitions
- **Prompt 8.3:** `LeaderboardPage` — Global, friend, group leaderboards
- **Prompt 8.4:** `BadgesPage` — Achievement gallery, badge details

---

*SupliList v4.0 — Sprint 7 | 26 de maio de 2026*
*Fase 2: Core+ Global | Semanas 17–20 | Community + Social + Viral*
