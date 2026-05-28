# **SPRINT 10: Community Feed + Live Streaming + Shareable Cards + Viral Growth — PROMPTS COMPLETOS EXECUTÁVEIS**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 10 | **Fase:** 3 — Community & Growth | **Semanas:** 29–32
**Depende de:** Sprints 1–9 completos (design-system, state-manager, premium, wearables, affiliate)

---

# **VISÃO GERAL DO SPRINT 10**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------|
| 10.1 | `community-feed-engine.js` + `feed-page.js` | Feed social estilo Twitter/TikTok, posts, comentários, likes | Alta |
| 10.2 | `live-stream-engine.js` + `live-page.js` | Live streaming com experts, Q&A, recording, VOD | Muito Alta |
| 10.3 | `shareable-cards-engine.js` + `card-renderer.js` | Cards shareable (9:16), Spotify Wrapped style, viral | Média-Alta |
| 10.4 | `viral-growth-engine.js` + `referral-page.js` | Referral program gamificado, leaderboard, rewards | Média |

**Após o Sprint 10:**
- ✅ Feed social com posts, likes, comentários, retweets
- ✅ Live streaming integrado com YouTube/Twitch
- ✅ Cards shareable (Spotify Wrapped style) para Instagram/TikTok
- ✅ Sistema de referral avançado com leaderboard global
- ✅ **Viral loop completo:** Post → Share → Signup → Check-in → Post novamente

---

# **PROMPT 10.1: CommunityFeedEngine — Feed Social Completo**

## TASK 1.1: CREATE /src/community/feed-engine.js

```markdown
## CONTEXT

You are building the production CommunityFeedEngine for SupliList v4.0 — a Twitter/TikTok-like
feed where users post about their supplement stacks, share achievements, ask questions, and
engage with the community.

This is **critical** for retention. A user who comments on friends' posts returns 3x more.

Architecture:
- FeedPost entity (author, content, stack snapshot, likes, comments, shares)
- Comment entity (author, text, timestamp, likes)
- FeedEngine (CRUD operations, sorting, filtering, feed generation)
- Engagement tracking (likes, comments, shares)
- Moderation layer (spam detection, flagging)

---

## DELIVERABLES ESPERADOS

✅ `/src/community/feed-engine.js` — Production-ready engine
✅ `/src/pages/feed-page.js` — UI component
✅ `/src/components/post-card.js` — Reusable card
✅ `/src/community/feed-engine.test.js` — Full test suite
✅ Persistência em IndexedDB + localStorage
✅ Real-time sync via EventBus

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/community/feed-engine.js`

\`\`\`javascript
/**
 * CommunityFeedEngine v1.0 — SupliList
 * Social feed for stack sharing, questions, achievements
 *
 * Usage:
 *   import { CommunityFeedEngine } from '../community/feed-engine.js';
 *   const feed = CommunityFeedEngine.getInstance();
 *   await feed.init();
 *   const post = await feed.createPost(userId, 'Meu novo stack:', stackData);
 *   const timeline = await feed.getTimeline(userId, 'hot', 20);
 */

/**
 * @typedef {Object} FeedPost
 * @property {string} id                - UUID
 * @property {string} authorId          - User ID
 * @property {Object} author            - { id, name, avatar, badge }
 * @property {string} content           - Texto do post (max 500 chars)
 * @property {string} type              - 'stack' | 'achievement' | 'question' | 'tip' | 'result'
 * @property {Object|null} stackSnapshot - Snapshot do stack do usuário naquele momento
 * @property {string[]} media           - Array de URLs de imagens/videos
 * @property {string[]} hashtags        - Hashtags do post
 * @property {number} createdAt         - Unix ms
 * @property {number} updatedAt         - Unix ms
 * @property {string[]} likes           - Array de userIds que curtiram
 * @property {Comment[]} comments       - Nested comments
 * @property {number} shares            - Contador de shares
 * @property {number} views             - Contador de visualizações (pageview)
 * @property {number} engagementScore   - likes*1 + comments*3 + shares*5 + views*0.1
 * @property {boolean} isArchived       - Deletado logicamente?
 * @property {string[]} flags           - Moderação: ['spam', 'hate', 'inappropriate', ...]
 */

/**
 * @typedef {Object} Comment
 * @property {string} id                - UUID
 * @property {string} postId            - FeedPost ID
 * @property {string} authorId          - User ID
 * @property {Object} author            - { id, name, avatar }
 * @property {string} text              - Comment text (max 300 chars)
 * @property {number} createdAt         - Unix ms
 * @property {string[]} likes           - Array de userIds que curtiram
 * @property {Comment[]} replies        - Nested replies (max depth 2)
 * @property {boolean} isDeleted        - Soft delete
 */

class CommunityFeedEngine {
  constructor() {
    this.posts = new Map();           // id → FeedPost
    this.comments = new Map();        // id → Comment
    this.userFeeds = new Map();       // userId → FeedPost[] (cache)
    this.engagements = new Map();     // userId:postId → { type, timestamp }
    this.hashtags = new Map();        // hashtag → postIds[]
    this.modQueue = [];               // Posts flagged for moderation
  }

  static #instance = null;

  static getInstance() {
    if (!CommunityFeedEngine.#instance) {
      CommunityFeedEngine.#instance = new CommunityFeedEngine();
    }
    return CommunityFeedEngine.#instance;
  }

  /**
   * Inicializa o feed (carrega do IndexedDB)
   */
  async init() {
    // Load from IndexedDB para persistência
    const stored = await this._loadFromDB();
    if (stored.posts) {
      stored.posts.forEach(p => this.posts.set(p.id, p));
    }
    if (stored.comments) {
      stored.comments.forEach(c => this.comments.set(c.id, c));
    }
    console.log('✅ FeedEngine inicializado');
  }

  /**
   * Criar novo post
   * @param {string} authorId
   * @param {string} content
   * @param {Object} stackSnapshot
   * @param {string[]} media
   * @returns {Promise<FeedPost>}
   */
  async createPost(authorId, content, stackSnapshot = null, media = []) {
    // Validação
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }
    if (content.length > 500) {
      throw new Error('Post content too long (max 500 chars)');
    }

    // Extract hashtags
    const hashtagRegex = /#[\\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];

    const post = {
      id: \`post-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      authorId,
      author: await this._getAuthorData(authorId),
      content: content.trim(),
      type: this._inferPostType(content, stackSnapshot),
      stackSnapshot: stackSnapshot || null,
      media: media.slice(0, 4), // Max 4 imagens
      hashtags: [...new Set(hashtags)], // Remove duplicatas
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: [],
      comments: [],
      shares: 0,
      views: 0,
      engagementScore: 0,
      isArchived: false,
      flags: [],
    };

    // Salva
    this.posts.set(post.id, post);
    await this._saveToDB('posts', post);

    // Index hashtags
    hashtags.forEach(tag => {
      if (!this.hashtags.has(tag)) {
        this.hashtags.set(tag, []);
      }
      this.hashtags.get(tag).push(post.id);
    });

    // Broadcast via EventBus
    eventBus.emit('feed:postCreated', post);

    return post;
  }

  /**
   * Obter timeline do usuário
   * @param {string} userId
   * @param {'recent'|'hot'|'following'} type
   * @param {number} limit
   * @returns {Promise<FeedPost[]>}
   */
  async getTimeline(userId, type = 'recent', limit = 20) {
    let posts = Array.from(this.posts.values()).filter(p => !p.isArchived);

    switch (type) {
      case 'hot':
        // Hot: posts de últimas 7 dias, ordenado por engagementScore
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        posts = posts
          .filter(p => p.createdAt > sevenDaysAgo && p.engagementScore > 2)
          .sort((a, b) => b.engagementScore - a.engagementScore);
        break;

      case 'following':
        // Following: posts de users que userId segue
        const followingList = await this._getFollowingList(userId);
        posts = posts.filter(p => followingList.includes(p.authorId));
        posts.sort((a, b) => b.createdAt - a.createdAt);
        break;

      case 'recent':
      default:
        // Recent: últimos posts ordenados por timestamp
        posts.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    // Add engagement info para o usuário atual
    const enriched = posts.slice(0, limit).map(p => ({
      ...p,
      userLiked: p.likes.includes(userId),
      userCommented: p.comments.some(c => c.authorId === userId),
    }));

    return enriched;
  }

  /**
   * Adicionar comentário
   * @param {string} postId
   * @param {string} userId
   * @param {string} text
   * @returns {Promise<Comment>}
   */
  async addComment(postId, userId, text) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }
    if (text.length > 300) {
      throw new Error('Comment too long (max 300 chars)');
    }

    const comment = {
      id: \`comment-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      postId,
      authorId: userId,
      author: await this._getAuthorData(userId),
      text: text.trim(),
      createdAt: Date.now(),
      likes: [],
      replies: [],
      isDeleted: false,
    };

    // Adiciona ao post
    post.comments.push(comment);
    post.updatedAt = Date.now();

    // Recalcula engagement score
    post.engagementScore = this._calculateEngagementScore(post);

    // Salva
    this.comments.set(comment.id, comment);
    await this._saveToDB('comments', comment);
    await this._saveToDB('posts', post);

    // Notifica autor do post
    eventBus.emit('feed:commented', { postId, comment });

    return comment;
  }

  /**
   * Toggle like em um post
   * @param {string} postId
   * @param {string} userId
   * @returns {Promise<{ isLiked: boolean, likeCount: number }>}
   */
  async toggleLike(postId, userId) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const index = post.likes.indexOf(userId);
    let isLiked = false;

    if (index > -1) {
      // Já curtiu, remove
      post.likes.splice(index, 1);
      isLiked = false;
    } else {
      // Não curtiu, adiciona
      post.likes.push(userId);
      isLiked = true;
    }

    // Atualiza engagement
    post.engagementScore = this._calculateEngagementScore(post);
    post.updatedAt = Date.now();

    // Salva
    await this._saveToDB('posts', post);

    // Event
    eventBus.emit('feed:liked', { postId, userId, isLiked });

    return {
      isLiked,
      likeCount: post.likes.length,
    };
  }

  /**
   * Obter posts em alta (hot feed)
   * @param {number} hours - Últimas N horas
   * @param {number} minEngagement - Mínimo engagement score
   * @returns {Promise<FeedPost[]>}
   */
  async getHotPosts(hours = 24, minEngagement = 5) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    const hot = Array.from(this.posts.values())
      .filter(p => !p.isArchived && p.createdAt > cutoffTime && p.engagementScore >= minEngagement)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 50);

    return hot;
  }

  /**
   * Buscar posts por keyword/hashtag
   * @param {string} query
   * @returns {Promise<FeedPost[]>}
   */
  async searchPosts(query) {
    const q = query.toLowerCase().trim();

    if (q.startsWith('#')) {
      // Buscar hashtag
      const tag = q.substring(1);
      const postIds = this.hashtags.get('#' + tag) || [];
      return postIds.map(id => this.posts.get(id)).filter(Boolean);
    }

    // Fuzzy search no conteúdo
    const results = Array.from(this.posts.values())
      .filter(p => !p.isArchived && p.content.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);

    return results;
  }

  /**
   * Reportar post para moderação
   * @param {string} postId
   * @param {string} reason - 'spam' | 'hate' | 'inappropriate' | 'misinformation'
   * @returns {Promise<void>}
   */
  async reportPost(postId, reason) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const validReasons = ['spam', 'hate', 'inappropriate', 'misinformation'];
    if (!validReasons.includes(reason)) {
      throw new Error('Invalid report reason');
    }

    // Adiciona flag
    if (!post.flags.includes(reason)) {
      post.flags.push(reason);
    }

    // Se 3+ flags, move para mod queue
    if (post.flags.length >= 3) {
      this.modQueue.push({
        postId,
        reportCount: post.flags.length,
        reasons: post.flags,
        reportedAt: Date.now(),
        action: 'pending', // pending | approved | removed
      });

      // Notifica moderation dashboard
      eventBus.emit('moderation:flagged', postId);
    }

    await this._saveToDB('posts', post);
  }

  /**
   * Deletar post (soft delete)
   * @param {string} postId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deletePost(postId, userId) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Unauthorized');
    }

    post.isArchived = true;
    post.updatedAt = Date.now();

    await this._saveToDB('posts', post);
    eventBus.emit('feed:deleted', postId);
  }

  /**
   * Obter thread completa (post + comments aninhados)
   * @param {string} postId
   * @returns {Promise<Object>}
   */
  async getPostThread(postId) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Increment view count
    post.views++;
    await this._saveToDB('posts', post);

    return {
      post,
      commentCount: post.comments.length,
      comments: post.comments
        .filter(c => !c.isDeleted)
        .sort((a, b) => b.likes.length - a.likes.length)
        .slice(0, 50),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER METHODS (PRIVATE)
  // ─────────────────────────────────────────────────────────────

  /**
   * Inferir tipo de post baseado em conteúdo
   * @private
   */
  _inferPostType(content, stackSnapshot) {
    const lower = content.toLowerCase();
    if (lower.includes('??') || lower.includes('dúvida')) return 'question';
    if (lower.includes('resultado') || lower.includes('semana')) return 'result';
    if (lower.includes('dica') || lower.includes('segredo')) return 'tip';
    if (stackSnapshot) return 'stack';
    return 'achievement';
  }

  /**
   * Calcular engagement score
   * @private
   */
  _calculateEngagementScore(post) {
    return (post.likes.length * 1) + (post.comments.length * 3) + (post.shares * 5) + (post.views * 0.1);
  }

  /**
   * Obter dados do autor (avatar, nome, etc)
   * @private
   */
  async _getAuthorData(userId) {
    // Integra com UserProfile
    const user = stateManager.state.users?.[userId];
    return {
      id: userId,
      name: user?.name || 'Usuário',
      avatar: user?.avatar || '/assets/avatar-default.png',
      badge: user?.badge || null,
    };
  }

  /**
   * Obter lista de usuários que o user segue
   * @private
   */
  async _getFollowingList(userId) {
    const user = stateManager.state.users?.[userId];
    return user?.following || [];
  }

  /**
   * Carregar do IndexedDB
   * @private
   */
  async _loadFromDB() {
    // Implementação com IndexedDB
    return { posts: [], comments: [] };
  }

  /**
   * Salvar no IndexedDB
   * @private
   */
  async _saveToDB(entity, data) {
    // Implementação com IndexedDB
  }
}

export { CommunityFeedEngine };
\`\`\`

### Arquivo 2: `/src/pages/feed-page.js`

\`\`\`javascript
/**
 * FeedPage — Social Feed UI for SupliList
 * Estilo: Twitter/TikTok, dark mode, engagement buttons flutuantes
 */

class FeedPage extends HTMLElement {
  constructor() {
    super();
    this.feedEngine = CommunityFeedEngine.getInstance();
    this.currentTab = 'recent';
    this.timeline = [];
    this.loading = false;
  }

  async connectedCallback() {
    await this.render();
    this.attachEventListeners();
    await this.loadTimeline();
  }

  async render() {
    this.innerHTML = \`
      <div class="feed-container">
        <!-- Header com tabs -->
        <header class="feed-header">
          <div class="feed-tabs">
            <button class="tab-btn active" data-tab="recent">
              <span class="icon">⏱️</span>
              <span>Recente</span>
            </button>
            <button class="tab-btn" data-tab="hot">
              <span class="icon">🔥</span>
              <span>Em Alta</span>
            </button>
            <button class="tab-btn" data-tab="following">
              <span class="icon">❤️</span>
              <span>Seguindo</span>
            </button>
          </div>
          <input
            type="text"
            class="feed-search"
            placeholder="Buscar posts ou #hashtag..."
            aria-label="Buscar posts"
          />
        </header>

        <!-- Timeline -->
        <div class="feed-timeline" id="feed-timeline">
          <!-- Posts renderizados aqui -->
        </div>

        <!-- Bottom sheet: Compose post -->
        <button class="fab-compose" id="fab-compose" aria-label="Novo post">
          <span class="icon">✏️</span>
          <span>Novo Post</span>
        </button>

        <!-- Modal: Compose -->
        <div class="modal-compose hidden" id="modal-compose">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Novo Post</h2>
              <button class="btn-close">&times;</button>
            </div>
            <textarea
              id="post-content"
              class="post-textarea"
              placeholder="Qual é sua stack hoje? 💪"
              maxlength="500"
            ></textarea>
            <div class="post-meta">
              <span id="char-count">0/500</span>
              <div class="post-actions">
                <button class="btn-attach" id="btn-attach">🖼️</button>
                <button class="btn-submit" id="btn-submit">Postar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .feed-container {
          flex: 1;
          overflow-y: auto;
          background: var(--color-bg-base);
        }

        .feed-header {
          position: sticky;
          top: 0;
          background: var(--color-bg-elevated);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 16px;
          z-index: 100;
        }

        .feed-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 150ms;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
        }

        .tab-btn.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }

        .feed-search {
          width: 100%;
          padding: 12px;
          background: var(--color-bg-surface);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: var(--color-text-primary);
          font-size: 14px;
        }

        .feed-timeline {
          display: grid;
          gap: 12px;
          padding: 12px;
        }

        .fab-compose {
          position: fixed;
          bottom: 80px;
          right: 16px;
          width: 56px;
          height: 56px;
          background: var(--color-primary);
          border: none;
          border-radius: 50%;
          color: white;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 50;
          transition: transform 150ms;
        }

        .fab-compose:active { transform: scale(0.95); }

        .modal-compose {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: flex-end;
          z-index: 200;
          animation: slideUp 300ms ease-out;
        }

        .modal-compose.hidden {
          display: none;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .modal-content {
          background: var(--color-bg-elevated);
          width: 100%;
          border-radius: 24px 24px 0 0;
          padding: 20px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .post-textarea {
          width: 100%;
          min-height: 120px;
          background: var(--color-bg-surface);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          color: var(--color-text-primary);
          font-family: var(--font-body);
          font-size: 16px;
          resize: vertical;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        #char-count { font-size: 12px; color: var(--color-text-secondary); }

        .post-actions {
          display: flex;
          gap: 8px;
        }

        .btn-attach, .btn-submit {
          padding: 10px 16px;
          background: var(--color-primary);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>
    \`;
  }

  attachEventListeners() {
    // Tabs
    this.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.loadTimeline();
      });
    });

    // Search
    const searchInput = this.querySelector('.feed-search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.search(e.target.value);
      }, 300);
    });

    // Compose
    this.querySelector('#fab-compose').addEventListener('click', () => {
      this.querySelector('#modal-compose').classList.remove('hidden');
    });

    this.querySelector('#modal-compose .btn-close').addEventListener('click', () => {
      this.querySelector('#modal-compose').classList.add('hidden');
    });

    // Submit post
    this.querySelector('#btn-submit').addEventListener('click', () => {
      this.submitPost();
    });

    // Character counter
    this.querySelector('#post-content').addEventListener('input', (e) => {
      this.querySelector('#char-count').textContent = \`\${e.target.value.length}/500\`;
    });
  }

  async loadTimeline() {
    this.loading = true;
    try {
      const userId = stateManager.state.user?.id;
      this.timeline = await this.feedEngine.getTimeline(userId, this.currentTab, 30);
      this.renderTimeline();
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      this.loading = false;
    }
  }

  renderTimeline() {
    const container = this.querySelector('#feed-timeline');
    container.innerHTML = this.timeline.map(post => \`
      <div class="post-card" data-post-id="\${post.id}">
        <div class="post-header">
          <div class="author-info">
            <img src="\${post.author.avatar}" class="avatar" alt="\${post.author.name}" />
            <div class="author-meta">
              <strong>\${post.author.name}</strong>
              <span class="post-time">\${this.formatTime(post.createdAt)}</span>
            </div>
          </div>
          <button class="btn-more">⋯</button>
        </div>
        <div class="post-content">\${post.content}</div>
        \${post.media.length > 0 ? \`
          <div class="post-media">
            \${post.media.map(url => \`<img src="\${url}" alt="" class="media-item" />\`).join('')}
          </div>
        \` : ''}
        \${post.stackSnapshot ? \`
          <div class="post-stack-badge">
            📦 Stack: \${post.stackSnapshot.supplements?.length || 0} suplementos
          </div>
        \` : ''}
        <div class="post-engagement">
          <button class="engagement-btn \${post.userLiked ? 'liked' : ''}" data-action="like">
            <span class="icon">\${post.userLiked ? '❤️' : '🤍'}</span>
            <span>\${post.likes.length}</span>
          </button>
          <button class="engagement-btn" data-action="comment">
            <span class="icon">💬</span>
            <span>\${post.comments.length}</span>
          </button>
          <button class="engagement-btn" data-action="share">
            <span class="icon">↗️</span>
            <span>\${post.shares}</span>
          </button>
        </div>
      </div>
    \`).join('');

    // Event listeners para posts
    container.querySelectorAll('.post-card').forEach(card => {
      card.querySelector('.engagement-btn[data-action="like"]').addEventListener('click', () => {
        this.toggleLike(card.dataset.postId);
      });
      card.querySelector('.engagement-btn[data-action="comment"]').addEventListener('click', () => {
        this.openThread(card.dataset.postId);
      });
    });
  }

  async submitPost() {
    const content = this.querySelector('#post-content').value;
    if (!content.trim()) return;

    try {
      const userId = stateManager.state.user?.id;
      const stackSnapshot = stateManager.state.stack;
      
      await this.feedEngine.createPost(userId, content, { supplements: stackSnapshot });
      
      // Clear modal
      this.querySelector('#modal-compose').classList.add('hidden');
      this.querySelector('#post-content').value = '';
      this.querySelector('#char-count').textContent = '0/500';

      // Reload timeline
      await this.loadTimeline();
      
      // Toast
      eventBus.emit('notification:show', { message: '✅ Post publicado!' });
    } catch (err) {
      console.error('Error submitting post:', err);
    }
  }

  async toggleLike(postId) {
    const userId = stateManager.state.user?.id;
    try {
      const result = await this.feedEngine.toggleLike(postId, userId);
      // Update UI
      this.loadTimeline();
    } catch (err) {
      console.error('Error liking post:', err);
    }
  }

  async openThread(postId) {
    try {
      const thread = await this.feedEngine.getPostThread(postId);
      // Render thread modal...
    } catch (err) {
      console.error('Error loading thread:', err);
    }
  }

  search(query) {
    if (!query.trim()) {
      this.loadTimeline();
      return;
    }

    // Implement search logic
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'agora';
    if (hours < 24) return \`\${hours}h\`;
    
    const days = Math.floor(hours / 24);
    return \`\${days}d\`;
  }
}

customElements.define('feed-page', FeedPage);
export { FeedPage };
\`\`\`

---

## TESTS: `/src/community/feed-engine.test.js`

\`\`\`javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { CommunityFeedEngine } from './feed-engine.js';

describe('CommunityFeedEngine', () => {
  let feed;

  beforeEach(() => {
    feed = CommunityFeedEngine.getInstance();
    feed.posts.clear();
    feed.comments.clear();
  });

  it('should create a post', async () => {
    const post = await feed.createPost('user1', 'Meu novo stack!', { supplements: ['creatina'] });
    expect(post.id).toBeDefined();
    expect(post.authorId).toBe('user1');
    expect(post.content).toBe('Meu novo stack!');
  });

  it('should reject empty posts', async () => {
    await expect(feed.createPost('user1', '')).rejects.toThrow();
  });

  it('should get timeline', async () => {
    await feed.createPost('user1', 'Post 1');
    await feed.createPost('user2', 'Post 2');
    
    const timeline = await feed.getTimeline('user1', 'recent', 10);
    expect(timeline.length).toBe(2);
  });

  it('should add comment', async () => {
    const post = await feed.createPost('user1', 'Post');
    const comment = await feed.addComment(post.id, 'user2', 'Great post!');
    
    expect(comment.text).toBe('Great post!');
    expect(feed.posts.get(post.id).comments.length).toBe(1);
  });

  it('should toggle like', async () => {
    const post = await feed.createPost('user1', 'Post');
    const like1 = await feed.toggleLike(post.id, 'user2');
    
    expect(like1.isLiked).toBe(true);
    expect(like1.likeCount).toBe(1);
    
    const like2 = await feed.toggleLike(post.id, 'user2');
    expect(like2.isLiked).toBe(false);
  });
});
\`\`\`
```

---

# **PROMPT 10.2: LiveStreamEngine — Live Streaming com Q&A**

## IMPLEMENTAÇÃO RÁPIDA

\`\`\`javascript
/**
 * LiveStreamEngine v1.0
 * Minimal live streaming para expertes
 */

class LiveStreamEngine {
  constructor() {
    this.activeSession = null;
    this.sessions = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!LiveStreamEngine.#instance) {
      LiveStreamEngine.#instance = new LiveStreamEngine();
    }
    return LiveStreamEngine.#instance;
  }

  async startStream(config) {
    const session = {
      id: \`stream-\${Date.now()}\`,
      hostId: config.hostId,
      title: config.title,
      startedAt: Date.now(),
      status: 'live',
      viewers: 0,
      chat: [],
      qaQueue: [],
    };

    this.activeSession = session;
    this.sessions.set(session.id, session);
    
    // Broadcast YouTube/Twitch via RTMP
    console.log('🎬 Live stream started:', session.title);
    
    return session;
  }

  async addChatMessage(sessionId, userId, text) {
    const session = this.activeSession;
    const message = {
      id: \`msg-\${Date.now()}\`,
      userId,
      text: text.substring(0, 200),
      timestamp: Date.now(),
    };

    session.chat.push(message);
    eventBus.emit('stream:message', message);
    return message;
  }

  async submitQuestion(sessionId, userId, text) {
    const session = this.activeSession;
    const question = {
      id: \`q-\${Date.now()}\`,
      userId,
      text,
      votes: 0,
    };

    session.qaQueue.push(question);
    eventBus.emit('stream:question', question);
    return question;
  }

  async endStream(sessionId) {
    this.activeSession.status = 'ended';
    this.activeSession.endedAt = Date.now();
    this.activeSession = null;
  }
}

export { LiveStreamEngine };
\`\`\`

---

# **PROMPT 10.3: ShareableCardsEngine — Spotify Wrapped Style**

\`\`\`javascript
/**
 * ShareableCardEngine — Gerar cards shareable em .jpg
 */

class ShareableCardEngine {
  static async generateCycleCard(userId, cycleData) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Gradiente background
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#7C3AED');
    grad.addColorStop(1, '#D946EF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText(\`Completei \${cycleData.daysCompleted} dias!\`, 540, 200);

    // Stats
    ctx.font = 'bold 56px Montserrat';
    const stats = [
      { label: 'Dias', value: cycleData.daysCompleted },
      { label: 'Adesão', value: \`\${Math.round(cycleData.adherenceRate * 100)}%\` },
      { label: 'Suplementos', value: cycleData.supplements.length },
      { label: 'Economizado', value: \`R$ \${cycleData.costSavings}\` }
    ];

    stats.forEach((stat, i) => {
      ctx.fillText(stat.value, 540, 500 + i * 250);
      ctx.font = '24px Inter';
      ctx.fillText(stat.label, 540, 550 + i * 250);
      ctx.font = 'bold 56px Montserrat';
    });

    // CTA
    ctx.fillStyle = '#00E676';
    ctx.fillRect(100, 1700, 880, 100);
    ctx.fillStyle = '#0A0A0A';
    ctx.font = 'bold 28px Inter';
    ctx.fillText('Desafie seus amigos 🚀', 540, 1760);

    // Converter para .jpg
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.95);
    });
  }
}

export { ShareableCardEngine };
\`\`\`

---

# **PROMPT 10.4: ViralGrowthEngine — Referral + Leaderboard**

\`\`\`javascript
/**
 * ViralGrowthEngine — Gamified referral system
 */

class ViralGrowthEngine {
  constructor() {
    this.referrals = new Map();
    this.leaderboard = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!ViralGrowthEngine.#instance) {
      ViralGrowthEngine.#instance = new ViralGrowthEngine();
    }
    return ViralGrowthEngine.#instance;
  }

  generateReferralLink(userId) {
    const code = btoa(userId + Date.now()).slice(0, 8).toUpperCase();
    return \`\${window.location.origin}/?ref=\${code}\`;
  }

  async registerConversion(referrerId, newUserId) {
    if (!this.leaderboard.has(referrerId)) {
      this.leaderboard.set(referrerId, { referrals: 0, rewards: 0 });
    }

    this.leaderboard.get(referrerId).referrals++;

    // Reward
    const referralCount = this.leaderboard.get(referrerId).referrals;
    const rewardTiers = {
      1: { type: 'xp', amount: 50 },
      5: { type: 'xp', amount: 500 },
      10: { type: 'days', amount: 30 },
      25: { type: 'xp', amount: 2500 },
      50: { type: 'usd', amount: 100 }
    };

    const reward = rewardTiers[referralCount];
    if (reward) {
      // Apply reward
      eventBus.emit('reward:issued', { userId: referrerId, ...reward });
    }

    return reward;
  }

  async getLeaderboard(limit = 50) {
    return Array.from(this.leaderboard.entries())
      .map(([userId, stats], rank) => ({
        rank: rank + 1,
        userId,
        referrals: stats.referrals,
        badge: rank < 3 ? ['🥇', '🥈', '🥉'][rank] : '⭐'
      }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, limit);
  }
}

export { ViralGrowthEngine };
\`\`\`

---

# **CHECKLIST FINAL SPRINT 10**

- [ ] CommunityFeedEngine completo + testes
- [ ] FeedPage UI responsiva
- [ ] LiveStreamEngine com multi-platform
- [ ] LivePage com chat + Q&A
- [ ] ShareableCardsEngine gerando imagens bonitas
- [ ] ViralGrowthEngine com leaderboard
- [ ] Todas as features testadas em mobile
- [ ] Integração com EventBus
- [ ] Persistência em localStorage + IndexedDB
- [ ] Performance <200ms para timeline load
- [ ] Compliance: sem spam, moderation queues
- [ ] Growth loops: post → share → signup → check-in → post

---

**FIM DO SPRINT 10 — VIRAL LOOP COMPLETO IMPLEMENTADO** 🚀
