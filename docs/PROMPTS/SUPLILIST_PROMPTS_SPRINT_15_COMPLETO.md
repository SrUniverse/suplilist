# **SPRINT 15: Community & Social Engine — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 15 | **Fase:** 3 — Community Explosion | **Semanas:** 49–52
**Depende de:** Sprints 1–14 completos (todos os engines anteriores)

---

# **VISÃO GERAL DO SPRINT 15**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 15.1 | `social-feed-engine.js` + `activity-renderer.js` | Feed estilo Twitter com posts, comments, likes, shares, mentions | Muito Alta |
| 15.2 | `community-groups-engine.js` + `moderation-ai.js` | Grupos temáticos (bulk, cut, vegan, natty), moderação automática, rules | Muito Alta |
| 15.3 | `user-profile-engine.js` + `achievement-system.js` | Perfis públicos, badges, achievements, stats públicas, followers/following | Alta |
| 15.4 | `content-discovery-engine.js` + `recommendation-algorithm.js` | Recomendação de posts/grupos/pessoas, trending, algoritmo de engajamento | Muito Alta |

**Após o Sprint 15:**
- ✅ Feed social em tempo real com 500+ posts concorrentes
- ✅ Sistema de comentários aninhados (threads de discussão)
- ✅ Likes, shares e retweets com contagem real-time
- ✅ Mentions (@user) com notificações automáticas
- ✅ 10+ grupos temáticos pré-criados (bulk, cut, vegan, strength, natty, etc)
- ✅ Moderação automática via IA (spam, hate speech, medical misinformation)
- ✅ Regras customizáveis por grupo
- ✅ Perfis públicos com bio, avatar, followers, badges conquistadas
- ✅ Achievement system (10 badges: First Stack, Streak Master, Deal Finder, etc)
- ✅ Algoritmo de descoberta (trending posts, pessoas para seguir, grupos recomendados)
- ✅ Feed personalizado baseado em interesses, follows, interações
- ✅ Notification de comentários, likes, mentions, group invites
- ✅ Busca full-text em posts, usuários, grupos
- ✅ **Loop de engajamento completo:** Valor compartilhado → Community → Retenção → Monetização

---

# **PROMPT 15.1: SocialFeedEngine — Feed em Tempo Real**

## TASK 1.1: CREATE /src/social/social-feed-engine.js

```markdown
## CONTEXT

Você está construindo o SocialFeedEngine para SupliList v4.0 — a camada social que transforma
usuários passivos em uma comunidade ativa compartilhando wins, dúvidas, resultados e
ciência de suplementação.

Esta é a diferença entre um app de ferramenta e um app de **comunidade viciante**.
Um feed bem feito = retenção 5x melhor + viralidade orgânica + monetização via publicidade.

Arquitetura:
- Post: Estrutura base (texto, imagem, data, autor)
- Comment: Aninhado (tree structure, pode comentar em comentário)
- Like: React com emoji (👍 👎 💪 🔥 etc)
- Share: Retweet com quote opcional
- Timeline: Ordenação inteligente (chronological, engagement-first, personalized)
- Search: Full-text search em posts + metadata

---

## DELIVERABLES ESPERADOS

✅ `/src/social/social-feed-engine.js` — Core feed engine
✅ `/src/social/post-model.js` — Post structure e validação
✅ `/src/social/comment-model.js` — Comment tree structure
✅ `/src/social/timeline-algorithm.js` — Feed ordering (chrono, engagement, personalized)
✅ `/src/social/mention-parser.js` — Parse @mentions e #hashtags
✅ `/src/social/social-feed-engine.test.js` — Full test suite
✅ Feed em tempo real (WebSocket opcional, fallback polling)
✅ Persistência em IndexedDB (últimas 500 posts)
✅ Performance <300ms para getTimeline()
✅ Suporta 10k+ posts concorrentes
✅ Busca full-text <100ms com Fuse.js

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/social/social-feed-engine.js`

\`\`\`javascript
/**
 * SocialFeedEngine v1.0 — SupliList
 * Real-time social feed with posts, comments, likes, shares
 *
 * Usage:
 *   import { SocialFeedEngine } from '../social/social-feed-engine.js';
 *   const feed = SocialFeedEngine.getInstance();
 *   await feed.init();
 *   const post = await feed.createPost(userId, 'My stack progress!', { image });
 *   const timeline = await feed.getTimeline(userId, 'personalized');
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import FuzzySearch from 'fuse.js';

const eventBus = EventBus.getInstance();

/**
 * @typedef {Object} Post
 * @property {string} id                - UUID
 * @property {string} authorId          - userId
 * @property {string} authorName        - username
 * @property {string} authorAvatar      - URL
 * @property {string} content           - Post text (250 chars max)
 * @property {Object[]} mentions        - [{ userId, username }]
 * @property {string[]} hashtags        - [#bulk, #progress]
 * @property {string[]} mediaUrls       - [imageUrl1, imageUrl2]
 * @property {string} type              - 'text' | 'progress' | 'question' | 'tip' | 'victory'
 * @property {number} createdAt         - Unix ms
 * @property {number} updatedAt
 * @property {Object} stats            - { likes: 0, comments: 0, shares: 0, views: 0 }
 * @property {Object} engagement        - { reactions: {👍: count, ...}, commentCount, shareCount }
 * @property {boolean} isEdited
 * @property {string} editedAt
 * @property {string} replyTo           - Post ID se é reply
 * @property {number} visibility        - 'public' | 'followers' | 'private'
 */

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} postId            - Post que está comentando
 * @property {string} authorId
 * @property {string} authorName
 * @property {string} authorAvatar
 * @property {string} content           - Texto do comentário
 * @property {Object[]} mentions        - @mentions dentro do comentário
 * @property {string} replyToCommentId  - Se responde a outro comentário
 * @property {number} createdAt
 * @property {Object} stats            - { likes: 0, replies: 0 }
 * @property {Comment[]} replies        - Sub-comentários (até 2 níveis)
 */

/**
 * @typedef {Object} Reaction
 * @property {string} emoji             - '👍' | '👎' | '💪' | '🔥' | '❤️' | '🤔'
 * @property {string} userId
 * @property {number} count
 */

class SocialFeedEngine {
  constructor() {
    this.posts = new Map();              // postId → Post
    this.comments = new Map();           // commentId → Comment
    this.reactions = new Map();          // `${postId}:${emoji}` → Set<userId>
    this.userPosts = new Map();          // userId → postIds[]
    this.userFollows = new Map();        // userId → followingIds[]
    this.postIndex = [];                 // Para busca (FuzzySearch)
    this.timeline = new Map();           // userId:algorithm → Timeline (cached)
    this.CACHE_TTL = 5 * 60 * 1000;     // 5 minutos
  }

  static #instance = null;

  static getInstance() {
    if (!SocialFeedEngine.#instance) {
      SocialFeedEngine.#instance = new SocialFeedEngine();
    }
    return SocialFeedEngine.#instance;
  }

  /**
   * Inicializar feed engine
   */
  async init() {
    console.log('📱 Inicializando SocialFeedEngine...');

    const stored = await this._loadFromDB();

    if (stored.posts) {
      stored.posts.forEach(p => this.posts.set(p.id, p));
    }

    if (stored.comments) {
      stored.comments.forEach(c => this.comments.set(c.id, c));
    }

    if (stored.userFollows) {
      stored.userFollows.forEach(f => this.userFollows.set(f.userId, f.followingIds));
    }

    // Constrói índice de busca
    await this._buildSearchIndex();

    // Inicia cleaning de posts antigos (30 dias)
    this._startCleanupScheduler();

    console.log(`✅ SocialFeedEngine pronto: ${this.posts.size} posts em cache`);
  }

  /**
   * Criar novo post
   * @param {string} userId
   * @param {string} content
   * @param {Object} options - { type, mediaUrls, mentions, hashtags, visibility, replyTo }
   * @returns {Promise<Post>}
   */
  async createPost(userId, content, options = {}) {
    // Validações
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }

    if (content.length > 500) {
      throw new Error('Post content cannot exceed 500 characters');
    }

    // Parse mentions e hashtags
    const { mentions, hashtags } = this._parseContent(content);

    const post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authorId: userId,
      authorName: options.authorName || 'User',
      authorAvatar: options.authorAvatar || '/default-avatar.png',
      content,
      mentions: mentions.concat(options.mentions || []),
      hashtags: hashtags.concat(options.hashtags || []),
      mediaUrls: options.mediaUrls || [],
      type: options.type || 'text', // 'text' | 'progress' | 'question' | 'tip' | 'victory'
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { likes: 0, comments: 0, shares: 0, views: 0 },
      engagement: { reactions: {}, commentCount: 0, shareCount: 0 },
      isEdited: false,
      visibility: options.visibility || 'public',
      replyTo: options.replyTo || null,
    };

    // Salva
    this.posts.set(post.id, post);

    // Indexa para busca
    this.postIndex.push({
      id: post.id,
      content: post.content,
      hashtags: post.hashtags,
      authorName: post.authorName,
      createdAt: post.createdAt,
      type: post.type,
    });

    // Track usuário
    if (!this.userPosts.has(userId)) {
      this.userPosts.set(userId, []);
    }
    this.userPosts.get(userId).unshift(post.id);

    // Persist
    await this._saveToDB('posts', post);

    // Notifica mencionados
    for (const mention of mentions) {
      eventBus.emit('social:mentioned', {
        mentionedUserId: mention.userId,
        mentionedBy: userId,
        postId: post.id,
      });
    }

    // Invalida cache de timelines
    this._invalidateTimelineCache();

    eventBus.emit('social:postCreated', post);

    console.log(`✅ Post criado: ${post.id}`);

    return post;
  }

  /**
   * Editar post existente
   * @param {string} postId
   * @param {string} userId - Deve ser autor
   * @param {string} newContent
   */
  async editPost(postId, userId, newContent) {
    const post = this.posts.get(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (post.authorId !== userId) {
      throw new Error('Only post author can edit');
    }

    if (Date.now() - post.createdAt > 24 * 60 * 60 * 1000) {
      throw new Error('Can only edit posts within 24 hours of creation');
    }

    post.content = newContent;
    post.updatedAt = Date.now();
    post.isEdited = true;

    const { mentions, hashtags } = this._parseContent(newContent);
    post.mentions = mentions;
    post.hashtags = hashtags;

    await this._saveToDB('posts', post);
    this._invalidateTimelineCache();

    eventBus.emit('social:postEdited', post);

    return post;
  }

  /**
   * Deletar post
   * @param {string} postId
   * @param {string} userId
   */
  async deletePost(postId, userId) {
    const post = this.posts.get(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (post.authorId !== userId) {
      throw new Error('Only post author can delete');
    }

    // Remove post
    this.posts.delete(postId);
    this.userPosts.get(userId)?.filter(id => id !== postId);

    // Remove comentários
    const relatedComments = Array.from(this.comments.values())
      .filter(c => c.postId === postId);
    relatedComments.forEach(c => this.comments.delete(c.id));

    // Remove reactions
    Array.from(this.reactions.keys())
      .filter(key => key.startsWith(`${postId}:`))
      .forEach(key => this.reactions.delete(key));

    // Persist
    await this._deleteFromDB('posts', postId);

    this._invalidateTimelineCache();

    eventBus.emit('social:postDeleted', { postId, userId });

    return { success: true };
  }

  /**
   * Obter post individual
   * @param {string} postId
   * @returns {Promise<Post>}
   */
  async getPost(postId) {
    const post = this.posts.get(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Incrementa view count
    post.stats.views = (post.stats.views || 0) + 1;

    return this._enrichPost(post);
  }

  /**
   * Obter timeline para um usuário
   * @param {string} userId
   * @param {string} algorithm - 'chronological' | 'engagement' | 'personalized'
   * @param {number} limit - Default 20
   * @param {string} cursor - Para pagination
   * @returns {Promise<{ posts: Post[], nextCursor: string }>}
   */
  async getTimeline(userId, algorithm = 'personalized', limit = 20, cursor = null) {
    const cacheKey = `${userId}:${algorithm}`;
    const cached = this.timeline.get(cacheKey);

    // Check cache
    if (cached && (Date.now() - cached.generatedAt) < this.CACHE_TTL) {
      return this._paginateResults(cached.posts, limit, cursor);
    }

    let posts = [];

    if (algorithm === 'chronological') {
      // Todos os posts, ordenado por recente
      posts = Array.from(this.posts.values())
        .filter(p => p.visibility === 'public')
        .sort((a, b) => b.createdAt - a.createdAt);
    } else if (algorithm === 'engagement') {
      // Posts com mais engagement primeiro
      posts = Array.from(this.posts.values())
        .filter(p => p.visibility === 'public')
        .sort((a, b) => {
          const scoreA = (a.stats.likes || 0) + (a.stats.comments || 0) * 2 + (a.stats.shares || 0) * 3;
          const scoreB = (b.stats.likes || 0) + (b.stats.comments || 0) * 2 + (b.stats.shares || 0) * 3;
          return scoreB - scoreA;
        });
    } else if (algorithm === 'personalized') {
      // Posts de people I follow + trending + descoberta
      const following = this.userFollows.get(userId) || [];
      const followingPosts = Array.from(this.posts.values())
        .filter(p => following.includes(p.authorId) && p.visibility !== 'private')
        .sort((a, b) => b.createdAt - a.createdAt);

      const trendingPosts = Array.from(this.posts.values())
        .filter(p => !following.includes(p.authorId) && p.visibility === 'public')
        .sort((a, b) => {
          const scoreA = (a.stats.likes || 0) * 0.5 + (a.stats.comments || 0);
          const scoreB = (b.stats.likes || 0) * 0.5 + (b.stats.comments || 0);
          return scoreB - scoreA;
        })
        .slice(0, Math.ceil(limit / 3));

      posts = [...followingPosts, ...trendingPosts];
    }

    // Enrich posts
    posts = await Promise.all(posts.map(p => this._enrichPost(p)));

    // Cache
    this.timeline.set(cacheKey, { posts, generatedAt: Date.now() });

    return this._paginateResults(posts, limit, cursor);
  }

  /**
   * Comentar em um post
   * @param {string} postId
   * @param {string} userId
   * @param {string} content
   * @param {string} replyToCommentId - Se responde a outro comentário
   * @returns {Promise<Comment>}
   */
  async createComment(postId, userId, content, replyToCommentId = null) {
    const post = this.posts.get(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (content.length > 500) {
      throw new Error('Comment too long (max 500 chars)');
    }

    const { mentions } = this._parseContent(content);

    const comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postId,
      authorId: userId,
      authorName: 'User',
      authorAvatar: '/default-avatar.png',
      content,
      mentions,
      replyToCommentId,
      createdAt: Date.now(),
      stats: { likes: 0, replies: 0 },
      replies: [],
    };

    this.comments.set(comment.id, comment);

    // Se é resposta a outro comentário, adiciona ao array de replies
    if (replyToCommentId) {
      const parentComment = this.comments.get(replyToCommentId);
      if (parentComment) {
        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(comment);
        parentComment.stats.replies = (parentComment.stats.replies || 0) + 1;
      }
    }

    // Atualiza post stats
    post.stats.comments = (post.stats.comments || 0) + 1;
    post.engagement.commentCount = post.stats.comments;

    await this._saveToDB('comments', comment);
    await this._saveToDB('posts', post);

    // Notifica autor do post
    if (post.authorId !== userId) {
      eventBus.emit('social:commented', {
        postId,
        commentId: comment.id,
        commentedBy: userId,
        postAuthor: post.authorId,
      });
    }

    // Notifica mencionados
    for (const mention of mentions) {
      eventBus.emit('social:mentioned', {
        mentionedUserId: mention.userId,
        mentionedBy: userId,
        context: `comment on post ${postId}`,
      });
    }

    this._invalidateTimelineCache();

    eventBus.emit('social:commentCreated', comment);

    return comment;
  }

  /**
   * Reagir em um post (like, emoji reaction)
   * @param {string} postId
   * @param {string} userId
   * @param {string} emoji - '👍' | '👎' | '💪' | '🔥' | '❤️' | '🤔'
   */
  async addReaction(postId, userId, emoji = '👍') {
    const post = this.posts.get(postId);

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const reactionKey = `${postId}:${emoji}`;

    if (!this.reactions.has(reactionKey)) {
      this.reactions.set(reactionKey, new Set());
    }

    const reactionSet = this.reactions.get(reactionKey);

    // Toggle: se já reagiu, remove; senão adiciona
    if (reactionSet.has(userId)) {
      reactionSet.delete(userId);
      post.stats.likes = Math.max(0, (post.stats.likes || 0) - 1);
    } else {
      reactionSet.add(userId);
      post.stats.likes = (post.stats.likes || 0) + 1;
    }

    if (!post.engagement.reactions) {
      post.engagement.reactions = {};
    }

    post.engagement.reactions[emoji] = reactionSet.size;

    await this._saveToDB('posts', post);

    this._invalidateTimelineCache();

    eventBus.emit('social:reacted', {
      postId,
      userId,
      emoji,
      reactedBy: userId,
      postAuthor: post.authorId,
    });

    return { postId, emoji, count: reactionSet.size };
  }

  /**
   * Compartilhar (share/retweet) um post
   * @param {string} postId
   * @param {string} userId
   * @param {string} quoteText - Opcional, comentário ao compartilhar
   */
  async sharePost(postId, userId, quoteText = '') {
    const originalPost = this.posts.get(postId);

    if (!originalPost) {
      throw new Error(`Post ${postId} not found`);
    }

    // Cria novo post como share
    let shareContent = `🔄 Retweet: "${originalPost.content}"`;
    if (quoteText) {
      shareContent = `${quoteText}\n\n🔄 ${originalPost.content}`;
    }

    const sharedPost = await this.createPost(userId, shareContent, {
      type: 'share',
      replyTo: postId,
      visibility: 'public',
    });

    // Incrementa share count no post original
    originalPost.stats.shares = (originalPost.stats.shares || 0) + 1;

    await this._saveToDB('posts', originalPost);

    eventBus.emit('social:shared', {
      originalPostId: postId,
      sharedBy: userId,
      sharedPostId: sharedPost.id,
    });

    return sharedPost;
  }

  /**
   * Obter comentários de um post
   * @param {string} postId
   * @param {string} sort - 'recent' | 'popular'
   */
  async getComments(postId, sort = 'recent') {
    const comments = Array.from(this.comments.values())
      .filter(c => c.postId === postId && !c.replyToCommentId);

    if (sort === 'popular') {
      comments.sort((a, b) => (b.stats.likes || 0) - (a.stats.likes || 0));
    } else {
      comments.sort((a, b) => b.createdAt - a.createdAt);
    }

    return comments;
  }

  /**
   * Seguir usuário
   * @param {string} userId
   * @param {string} targetUserId
   */
  async followUser(userId, targetUserId) {
    if (userId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    if (!this.userFollows.has(userId)) {
      this.userFollows.set(userId, []);
    }

    const following = this.userFollows.get(userId);

    if (!following.includes(targetUserId)) {
      following.push(targetUserId);
      await this._saveToDB('userFollows', { userId, followingIds: following });

      this._invalidateTimelineCache(userId);

      eventBus.emit('social:followed', { follower: userId, followed: targetUserId });
    }

    return { success: true, following: following.length };
  }

  /**
   * Deixar de seguir
   * @param {string} userId
   * @param {string} targetUserId
   */
  async unfollowUser(userId, targetUserId) {
    const following = this.userFollows.get(userId) || [];
    const idx = following.indexOf(targetUserId);

    if (idx !== -1) {
      following.splice(idx, 1);
      await this._saveToDB('userFollows', { userId, followingIds: following });

      this._invalidateTimelineCache(userId);

      eventBus.emit('social:unfollowed', { unfollower: userId, unfollowed: targetUserId });
    }

    return { success: true, following: following.length };
  }

  /**
   * Buscar posts e usuários
   * @param {string} query
   * @param {number} limit - Default 10
   */
  async search(query, limit = 10) {
    if (!query || query.trim().length === 0) {
      return { posts: [], users: [], hashtags: [] };
    }

    // Search posts por Fuse.js
    const fuse = new FuzzySearch(this.postIndex, {
      keys: ['content', 'hashtags', 'authorName'],
      threshold: 0.3,
    });

    const postResults = fuse.search(query).slice(0, limit);
    const posts = postResults.map(r => this.posts.get(r.item.id));

    // Extract hashtags
    const hashtags = Array.from(new Set(
      this.postIndex.flatMap(p => p.hashtags || [])
    )).filter(h => h.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

    // Search users (simplified)
    const users = Array.from(this.userPosts.entries())
      .filter(([userId, _]) => userId.includes(query))
      .slice(0, limit);

    return {
      posts: posts.filter(Boolean),
      users: users.map(([userId, postIds]) => ({
        userId,
        postCount: postIds.length,
      })),
      hashtags,
    };
  }

  // === PRIVATE HELPERS ===

  _parseContent(content) {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({ username: match[1], userId: match[1].toLowerCase() });
    }

    const hashtags = [];
    const hashtagRegex = /#(\w+)/g;

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(`#${match[1]}`);
    }

    return { mentions, hashtags };
  }

  async _enrichPost(post) {
    // Adiciona comments count, reactions, etc
    const postComments = Array.from(this.comments.values())
      .filter(c => c.postId === post.id && !c.replyToCommentId);

    post.stats.comments = postComments.length;
    post.engagement.commentCount = postComments.length;

    // Reactions
    const reactionKeys = Array.from(this.reactions.keys())
      .filter(key => key.startsWith(`${post.id}:`));

    post.engagement.reactions = {};
    for (const key of reactionKeys) {
      const [, emoji] = key.split(':');
      const reactionSet = this.reactions.get(key);
      post.engagement.reactions[emoji] = reactionSet.size;
    }

    return post;
  }

  _paginateResults(posts, limit, cursor) {
    let startIdx = 0;

    if (cursor) {
      startIdx = posts.findIndex(p => p.id === cursor) + 1;
      if (startIdx === 0) startIdx = 0;
    }

    const results = posts.slice(startIdx, startIdx + limit);
    const nextCursor = results.length === limit ? results[results.length - 1]?.id : null;

    return { posts: results, nextCursor };
  }

  async _buildSearchIndex() {
    this.postIndex = Array.from(this.posts.values()).map(post => ({
      id: post.id,
      content: post.content,
      hashtags: post.hashtags,
      authorName: post.authorName,
      createdAt: post.createdAt,
      type: post.type,
    }));

    console.log(`🔍 Search index built: ${this.postIndex.length} posts`);
  }

  _invalidateTimelineCache(userId = null) {
    if (userId) {
      // Invalida timelines do usuário
      this.timeline.delete(`${userId}:chronological`);
      this.timeline.delete(`${userId}:engagement`);
      this.timeline.delete(`${userId}:personalized`);
    } else {
      // Invalida todas
      this.timeline.clear();
    }
  }

  _startCleanupScheduler() {
    // Remove posts com mais de 30 dias
    setInterval(() => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let cleaned = 0;

      for (const [postId, post] of this.posts) {
        if (post.createdAt < thirtyDaysAgo) {
          this.posts.delete(postId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} old posts`);
      }
    }, 24 * 60 * 60 * 1000); // 1x por dia
  }

  async _loadFromDB() {
    return { posts: [], comments: [], userFollows: [] };
  }

  async _saveToDB(type, data) {
    // Implementar IndexedDB save
  }

  async _deleteFromDB(type, id) {
    // Implementar IndexedDB delete
  }
}

export { SocialFeedEngine };
\`\`\`

---

### Arquivo 2: `/src/social/timeline-algorithm.js`

\`\`\`javascript
/**
 * TimelineAlgorithm v1.0
 * Advanced feed ordering algorithms: chronological, engagement, personalized, discovery
 */

class TimelineAlgorithm {
  /**
   * Chronological: Posts mais recentes primeiro
   */
  static chronological(posts) {
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Engagement: Posts com mais interações primeiro
   * Fórmula: likes + comments*2 + shares*3
   */
  static engagement(posts) {
    return posts.sort((a, b) => {
      const scoreA = (a.stats.likes || 0) + (a.stats.comments || 0) * 2 + (a.stats.shares || 0) * 3;
      const scoreB = (b.stats.likes || 0) + (b.stats.comments || 0) * 2 + (b.stats.shares || 0) * 3;
      const diff = scoreB - scoreA;

      // Tie-breaker: posts mais recentes ganham
      if (diff === 0) {
        return b.createdAt - a.createdAt;
      }

      return diff;
    });
  }

  /**
   * Personalized: Feed customizado para o usuário
   * Prioridades:
   * 1. Posts de people I follow (chronological)
   * 2. Posts com high engagement (trending)
   * 3. Posts descoberta (pessoas novas, topics de interesse)
   */
  static personalized(posts, userId, userFollowing, userInterests) {
    const followingPosts = [];
    const trendingPosts = [];
    const discoveryPosts = [];

    for (const post of posts) {
      if (userFollowing?.includes(post.authorId)) {
        // Pessoa que sigo
        followingPosts.push(post);
      } else if (post.stats.likes >= 5 || post.stats.comments >= 2) {
        // Trending
        trendingPosts.push(post);
      } else {
        // Discovery
        discoveryPosts.push(post);
      }
    }

    // Sort each category
    followingPosts.sort((a, b) => b.createdAt - a.createdAt); // Recent first
    trendingPosts.sort((a, b) => {
      const scoreA = a.stats.likes + a.stats.comments * 2;
      const scoreB = b.stats.likes + b.stats.comments * 2;
      return scoreB - scoreA;
    });

    // Interleave: 60% following, 30% trending, 10% discovery
    const result = [];
    const maxIdx = Math.max(
      Math.ceil(followingPosts.length),
      Math.ceil(trendingPosts.length),
      Math.ceil(discoveryPosts.length)
    );

    for (let i = 0; i < maxIdx; i++) {
      if (i < followingPosts.length) result.push(followingPosts[i]);
      if (result.length % 10 === 0 && trendingPosts.length > 0) {
        result.push(trendingPosts.shift());
      }
      if (result.length % 15 === 0 && discoveryPosts.length > 0) {
        result.push(discoveryPosts.shift());
      }
    }

    return result;
  }

  /**
   * Trending: Posts com mais traction em últimas 24h
   */
  static trending(posts) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return posts
      .filter(p => p.createdAt > oneDayAgo) // Últimas 24h
      .sort((a, b) => {
        const scoreA = a.stats.likes + a.stats.comments * 2 + a.stats.shares * 4;
        const scoreB = b.stats.likes + b.stats.comments * 2 + b.stats.shares * 4;
        return scoreB - scoreA;
      });
  }

  /**
   * Hashtag feed: Posts com uma hashtag específica
   */
  static byHashtag(posts, hashtag) {
    return posts
      .filter(p => p.hashtags?.includes(hashtag))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export { TimelineAlgorithm };
\`\`\`

---

### Arquivo 3: `/src/social/social-feed-engine.test.js`

\`\`\`javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SocialFeedEngine } from './social-feed-engine.js';

describe('SocialFeedEngine', () => {
  let feed;

  beforeEach(async () => {
    feed = SocialFeedEngine.getInstance();
    await feed.init();
  });

  it('should create a post', async () => {
    const post = await feed.createPost('user-1', 'My progress: +5kg! 💪', {
      type: 'victory',
      mediaUrls: ['image-url'],
    });

    expect(post).toHaveProperty('id');
    expect(post.content).toBe('My progress: +5kg! 💪');
    expect(post.stats.likes).toBe(0);
  });

  it('should parse mentions and hashtags', async () => {
    const post = await feed.createPost('user-1', '@user-2 check this #bulk #progress guide', {
      type: 'tip',
    });

    expect(post.mentions.length).toBeGreaterThan(0);
    expect(post.hashtags.length).toBeGreaterThan(0);
  });

  it('should add reaction to post', async () => {
    const post = await feed.createPost('user-1', 'Test post');
    const reaction = await feed.addReaction(post.id, 'user-2', '💪');

    expect(reaction.emoji).toBe('💪');
    expect(reaction.count).toBe(1);
  });

  it('should toggle reaction', async () => {
    const post = await feed.createPost('user-1', 'Test post');

    // Add reaction
    await feed.addReaction(post.id, 'user-2', '👍');
    let updated = await feed.getPost(post.id);
    expect(updated.stats.likes).toBe(1);

    // Remove reaction (toggle)
    await feed.addReaction(post.id, 'user-2', '👍');
    updated = await feed.getPost(post.id);
    expect(updated.stats.likes).toBe(0);
  });

  it('should create comment on post', async () => {
    const post = await feed.createPost('user-1', 'Test post');
    const comment = await feed.createComment(post.id, 'user-2', 'Great tip!');

    expect(comment).toHaveProperty('id');
    expect(comment.postId).toBe(post.id);
    expect(comment.authorId).toBe('user-2');
  });

  it('should get timeline', async () => {
    await feed.createPost('user-1', 'Post 1');
    await feed.createPost('user-2', 'Post 2');
    await feed.createPost('user-3', 'Post 3');

    const { posts, nextCursor } = await feed.getTimeline('user-1', 'chronological', 2);

    expect(posts.length).toBe(2);
    expect(nextCursor).toBeDefined();
  });

  it('should follow/unfollow user', async () => {
    await feed.followUser('user-1', 'user-2');
    let following = feed.userFollows.get('user-1');
    expect(following).toContain('user-2');

    await feed.unfollowUser('user-1', 'user-2');
    following = feed.userFollows.get('user-1');
    expect(following).not.toContain('user-2');
  });

  it('should search posts', async () => {
    await feed.createPost('user-1', 'Best #creatine supplement for strength', { type: 'tip' });
    const { posts, hashtags } = await feed.search('creatine');

    expect(posts.length).toBeGreaterThan(0);
    expect(hashtags.length).toBeGreaterThan(0);
  });

  it('should edit post', async () => {
    const post = await feed.createPost('user-1', 'Original content');
    const edited = await feed.editPost(post.id, 'user-1', 'Updated content');

    expect(edited.content).toBe('Updated content');
    expect(edited.isEdited).toBe(true);
  });

  it('should delete post', async () => {
    const post = await feed.createPost('user-1', 'Post to delete');
    await feed.deletePost(post.id, 'user-1');

    expect(() => feed.getPost(post.id)).rejects.toThrow();
  });

  it('should share post', async () => {
    const original = await feed.createPost('user-1', 'Original post');
    const shared = await feed.sharePost(original.id, 'user-2', 'Great advice!');

    expect(shared.type).toBe('share');
    expect(shared.replyTo).toBe(original.id);
  });
});
\`\`\`

---

## CHECKLIST TASK 1.1

- [ ] SocialFeedEngine classe completa com Singleton
- [ ] Post model com full validation
- [ ] Comment model com tree structure (respostas aninhadas)
- [ ] Reaction system (emoji-based likes)
- [ ] Timeline algorithms (chronological, engagement, personalized, trending)
- [ ] Share/retweet funcionalidade
- [ ] Mention (@user) parsing e notificação
- [ ] Hashtag (#topic) parsing e indexação
- [ ] Follow/unfollow sistema
- [ ] Full-text search em posts (Fuse.js)
- [ ] Edit post (24h window)
- [ ] Delete post (author only)
- [ ] Pagination com cursor
- [ ] Persistência em IndexedDB (últimas 500 posts)
- [ ] Cache de timeline (5 min TTL)
- [ ] Performance <300ms para getTimeline()
- [ ] Suporta 10k+ posts em memória
- [ ] Auto-cleanup de posts antigos (30 dias)
- [ ] EventBus integration (mentioned, commented, reacted, followed)
- [ ] Testes unitários completos

\`\`\`

---

# **PROMPT 15.2: CommunityGroupsEngine — Grupos Temáticos com Moderação**

\`\`\`javascript
/**
 * CommunityGroupsEngine v1.0
 * Themed groups (bulk, cut, vegan, strength, natty, etc)
 * Moderação automática via IA + rules customizáveis
 */

import { EventBus } from '../core/event-bus.js';

const eventBus = EventBus.getInstance();

/**
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} name                - 'Bulk Gang', 'Cutting Edge', 'Vegan Gains'
 * @property {string} description
 * @property {string} icon                - Emoji ou URL
 * @property {string} topic               - 'bulk' | 'cut' | 'strength' | 'vegan' | 'natty' | 'female' | 'beginner'
 * @property {string[]} moderators        - userIds de mods
 * @property {number} memberCount
 * @property {Object[]} rules              - Regras do grupo
 * @property {string[]} blockedWords       - Palavras proibidas
 * @property {number} createdAt
 * @property {number} postCount
 * @property {number} commentCount
 */

class CommunityGroupsEngine {
  constructor() {
    this.groups = new Map();              // groupId → Group
    this.groupMembers = new Map();        // groupId → Set<userId>
    this.groupPosts = new Map();          // groupId → postIds[]
    this.defaultGroups = [
      {
        id: 'group-bulk',
        name: 'Bulk Gang 💪',
        description: 'Ganho de massa muscular, nutrição, treino pesado',
        icon: '💪',
        topic: 'bulk',
        rules: [
          { id: 1, text: 'Respeite todos os membros' },
          { id: 2, text: 'Sem propagandas de produtos sem link afiliado transparente' },
          { id: 3, text: 'Fonte científica para claims de saúde' },
          { id: 4, text: 'Sem imagens explícitas' },
        ],
      },
      {
        id: 'group-cut',
        name: 'Cutting Edge 🔪',
        description: 'Perda de gordura, dietas, cardio',
        icon: '🔪',
        topic: 'cut',
      },
      {
        id: 'group-strength',
        name: 'Strength First 🏋️',
        description: 'Força, powerlifting, treinos pesados',
        icon: '🏋️',
        topic: 'strength',
      },
      {
        id: 'group-vegan',
        name: 'Vegan Gains 🌱',
        description: 'Nutrição plant-based, suplementação vegan',
        icon: '🌱',
        topic: 'vegan',
      },
      {
        id: 'group-natty',
        name: 'Natural Only 🚫💉',
        description: 'Suplementação natural, sem PEDs',
        icon: '🚫',
        topic: 'natty',
      },
      {
        id: 'group-female',
        name: 'Women Gains 👩',
        description: 'Treino e nutrição feminina',
        icon: '👩',
        topic: 'female',
      },
      {
        id: 'group-beginner',
        name: 'Beginners Academy 📚',
        description: 'Iniciantes em musculação',
        icon: '📚',
        topic: 'beginner',
      },
    ];
  }

  static #instance = null;

  static getInstance() {
    if (!CommunityGroupsEngine.#instance) {
      CommunityGroupsEngine.#instance = new CommunityGroupsEngine();
    }
    return CommunityGroupsEngine.#instance;
  }

  async init() {
    console.log('👥 Inicializando CommunityGroupsEngine...');

    // Cria grupos padrão
    for (const defaultGroup of this.defaultGroups) {
      const group = {
        ...defaultGroup,
        moderators: [],
        memberCount: 0,
        createdAt: Date.now(),
        postCount: 0,
        commentCount: 0,
        blockedWords: this._getDefaultBlockedWords(),
      };

      this.groups.set(group.id, group);
      this.groupMembers.set(group.id, new Set());
      this.groupPosts.set(group.id, []);
    }

    console.log(`✅ ${this.groups.size} grupos padrão criados`);
  }

  /**
   * Usuário entra em grupo
   * @param {string} userId
   * @param {string} groupId
   */
  async joinGroup(userId, groupId) {
    const group = this.groups.get(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const members = this.groupMembers.get(groupId);

    if (!members.has(userId)) {
      members.add(userId);
      group.memberCount = members.size;

      eventBus.emit('group:joined', { userId, groupId, groupName: group.name });
    }

    return { success: true, memberCount: group.memberCount };
  }

  /**
   * Usuário sai do grupo
   * @param {string} userId
   * @param {string} groupId
   */
  async leaveGroup(userId, groupId) {
    const group = this.groups.get(groupId);
    const members = this.groupMembers.get(groupId);

    if (members?.has(userId)) {
      members.delete(userId);
      group.memberCount = members.size;

      eventBus.emit('group:left', { userId, groupId });
    }

    return { success: true, memberCount: group.memberCount };
  }

  /**
   * Postar em um grupo
   * Passa por moderação automática antes de ser visível
   */
  async postToGroup(userId, groupId, content, options = {}) {
    const group = this.groups.get(groupId);

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const members = this.groupMembers.get(groupId);
    if (!members.has(userId)) {
      throw new Error(`User ${userId} is not a member of group ${groupId}`);
    }

    // Moderação automática
    const moderation = await this._moderateContent(content, group);

    if (moderation.violatesRules) {
      eventBus.emit('group:postRejected', {
        userId,
        groupId,
        reason: moderation.reason,
        violations: moderation.violations,
      });

      throw new Error(`Post violates group rules: ${moderation.reason}`);
    }

    // Cria post com aprovação
    const post = {
      id: `group-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      userId,
      content,
      mediaUrls: options.mediaUrls || [],
      createdAt: Date.now(),
      approvedAt: Date.now(),
      status: 'approved', // 'approved' | 'pending_review' | 'rejected'
      stats: { likes: 0, comments: 0 },
    };

    // Adiciona ao grupo
    const posts = this.groupPosts.get(groupId);
    posts.unshift(post);

    group.postCount = (group.postCount || 0) + 1;

    await this._saveToDB('groupPosts', post);

    eventBus.emit('group:postCreated', post);

    return post;
  }

  /**
   * Obter posts de um grupo
   * @param {string} groupId
   * @param {number} limit
   */
  async getGroupPosts(groupId, limit = 20) {
    const posts = this.groupPosts.get(groupId) || [];
    return posts.slice(0, limit);
  }

  /**
   * Obter grupo por ID
   * @param {string} groupId
   */
  getGroup(groupId) {
    return this.groups.get(groupId);
  }

  /**
   * Listar todos os grupos
   */
  listGroups() {
    return Array.from(this.groups.values());
  }

  /**
   * Recomendargrupos baseado em interesse
   * @param {string} userId
   * @param {Object} userProfile
   */
  recommendGroups(userId, userProfile = {}) {
    const { goal, restrictions } = userProfile;

    const recommendations = [];

    // Match objetivo
    if (goal === 'muscle_gain') {
      recommendations.push(this.groups.get('group-bulk'));
    } else if (goal === 'fat_loss') {
      recommendations.push(this.groups.get('group-cut'));
    }

    if (goal === 'strength') {
      recommendations.push(this.groups.get('group-strength'));
    }

    if (restrictions?.includes('vegan')) {
      recommendations.push(this.groups.get('group-vegan'));
    }

    if (userProfile.gender === 'female') {
      recommendations.push(this.groups.get('group-female'));
    }

    if (userProfile.trainingAge === 0) {
      recommendations.push(this.groups.get('group-beginner'));
    }

    // Remove duplicatas
    return Array.from(new Set(recommendations.map(g => g.id)))
      .map(id => this.groups.get(id))
      .filter(Boolean);
  }

  // === MODERAÇÃO AUTOMÁTICA ===

  async _moderateContent(content, group) {
    const violations = [];

    // Check blocked words
    const blocked = this._checkBlockedWords(content, group);
    if (blocked.length > 0) {
      violations.push({ type: 'blocked_words', words: blocked });
    }

    // Check length
    if (content.length > 1000) {
      violations.push({ type: 'too_long', maxLength: 1000 });
    }

    // Check spam (links múltiplos)
    const linkCount = (content.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      violations.push({ type: 'spam_links', count: linkCount });
    }

    // Check medical misinformation (claims sem fonte)
    if (this._detectUnsourced HealthClaim(content)) {
      violations.push({ type: 'medical_claim_unsourced' });
    }

    return {
      violatesRules: violations.length > 0,
      violations,
      reason: violations.map(v => v.type).join(', '),
    };
  }

  _checkBlockedWords(content, group) {
    const blocked = [];
    const lowerContent = content.toLowerCase();

    for (const word of group.blockedWords || []) {
      if (lowerContent.includes(word.toLowerCase())) {
        blocked.push(word);
      }
    }

    return blocked;
  }

  _detectUnsourcedHealthClaim(content) {
    // Detecta claims de saúde sem fontes
    const healthKeywords = ['cure', 'treatment', 'heal', 'drug', 'medicina'];
    const hasHealthKeyword = healthKeywords.some(kw => content.toLowerCase().includes(kw));
    const hasSource = /\[.*\]|https?:\/\/|study|research|article/i.test(content);

    return hasHealthKeyword && !hasSource;
  }

  _getDefaultBlockedWords() {
    return [
      'hate',
      'racist',
      'sexist',
      // ... mais palavras
    ];
  }

  async _saveToDB(type, data) {
    // Implementar IndexedDB save
  }
}

export { CommunityGroupsEngine };
\`\`\`

---

# **PROMPT 15.3: UserProfileEngine — Perfis Públicos e Achievements**

\`\`\`javascript
/**
 * UserProfileEngine v1.0
 * User profiles, badges, achievements, public stats
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} userId
 * @property {string} username
 * @property {string} bio
 * @property {string} avatarUrl
 * @property {string} badge              - 'bronze' | 'silver' | 'gold' | 'platinum'
 * @property {Object[]} achievements     - Badges conquistadas
 * @property {Object} stats              - { postCount, followerCount, followingCount, groupsJoined }
 * @property {boolean} isPublic
 */

class UserProfileEngine {
  constructor() {
    this.profiles = new Map();            // userId → UserProfile
    this.achievements = new Map();        // achievementId → AchievementDefinition
    this.userAchievements = new Map();    // userId → achievementId[]
    this.badges = this._initBadges();
  }

  static #instance = null;

  static getInstance() {
    if (!UserProfileEngine.#instance) {
      UserProfileEngine.#instance = new UserProfileEngine();
    }
    return UserProfileEngine.#instance;
  }

  async init() {
    console.log('👤 Inicializando UserProfileEngine...');
    console.log(`✅ ${this.achievements.size} achievements disponíveis`);
  }

  /**
   * Criar perfil de usuário
   */
  async createProfile(userId, data = {}) {
    const profile = {
      userId,
      username: data.username || `user-${userId.substring(0, 6)}`,
      bio: data.bio || '',
      avatarUrl: data.avatarUrl || '/default-avatar.png',
      badge: 'bronze',
      achievements: [],
      stats: {
        postCount: 0,
        commentCount: 0,
        followerCount: 0,
        followingCount: 0,
        groupsJoined: 0,
        totalLikes: 0,
      },
      isPublic: true,
      createdAt: Date.now(),
    };

    this.profiles.set(userId, profile);
    this.userAchievements.set(userId, []);

    return profile;
  }

  /**
   * Obter perfil de um usuário
   */
  getProfile(userId) {
    return this.profiles.get(userId);
  }

  /**
   * Unlock achievement para usuário
   */
  async unlockAchievement(userId, achievementId) {
    const achievement = this.achievements.get(achievementId);

    if (!achievement) {
      throw new Error(`Achievement ${achievementId} not found`);
    }

    const userAchievements = this.userAchievements.get(userId) || [];

    if (!userAchievements.includes(achievementId)) {
      userAchievements.push(achievementId);
      this.userAchievements.set(userId, userAchievements);

      const profile = this.profiles.get(userId);
      if (profile) {
        profile.achievements.push({
          id: achievementId,
          name: achievement.name,
          icon: achievement.icon,
          unlockedAt: Date.now(),
        });

        // Check badge upgrade
        await this._checkBadgeUpgrade(profile);
      }

      eventBus.emit('profile:achievementUnlocked', {
        userId,
        achievement,
        newBadge: profile?.badge,
      });
    }

    return achievement;
  }

  /**
   * Get leaderboard (top users by metric)
   */
  getLeaderboard(metric = 'followers', limit = 50) {
    const users = Array.from(this.profiles.values())
      .filter(p => p.isPublic)
      .sort((a, b) => {
        const scoreA = a.stats[metric + 'Count'] || 0;
        const scoreB = b.stats[metric + 'Count'] || 0;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return users.map((user, idx) => ({
      rank: idx + 1,
      userId: user.userId,
      username: user.username,
      score: user.stats[metric + 'Count'] || 0,
      badge: user.badge,
      avatar: user.avatarUrl,
    }));
  }

  // === BADGES ===

  _initBadges() {
    return new Map([
      ['first-stack', { name: 'First Stack', icon: '🥉', minPostCount: 1 }],
      ['streak-7', { name: 'Week Warrior', icon: '🔥', minStreak: 7 }],
      ['streak-30', { name: 'Month Master', icon: '💪', minStreak: 30 }],
      ['100-posts', { name: 'Voice of Community', icon: '📣', minPostCount: 100 }],
      ['helper', { name: 'Helping Hand', icon: '🤝', minHelpfulComments: 50 }],
      ['deal-finder', { name: 'Deal Finder', icon: '🏷️', minDealsShared: 20 }],
      ['science-nerd', { name: 'Science Nerd', icon: '🧪', minSourcedPosts: 30 }],
    ]);
  }

  async _checkBadgeUpgrade(profile) {
    const achievementCount = profile.achievements.length;

    if (achievementCount >= 10 && profile.badge === 'bronze') {
      profile.badge = 'silver';
    } else if (achievementCount >= 20 && profile.badge === 'silver') {
      profile.badge = 'gold';
    } else if (achievementCount >= 40 && profile.badge === 'gold') {
      profile.badge = 'platinum';
    }
  }
}

export { UserProfileEngine };
\`\`\`

---

# **PROMPT 15.4: ContentDiscoveryEngine — Recomendações Inteligentes**

\`\`\`javascript
/**
 * ContentDiscoveryEngine v1.0
 * Smart recommendation algorithm: posts, groups, people
 * Baseado em: engagement, interests, follows, similarity
 */

class ContentDiscoveryEngine {
  constructor() {
    this.userInterests = new Map();      // userId → interests[]
    this.userEngagementHistory = new Map(); // userId → { postId, type, timestamp }[]
  }

  static #instance = null;

  static getInstance() {
    if (!ContentDiscoveryEngine.#instance) {
      ContentDiscoveryEngine.#instance = new ContentDiscoveryEngine();
    }
    return ContentDiscoveryEngine.#instance;
  }

  /**
   * Recomendarpostspara usuário
   * Algoritmo:
   * - Posts de pessoas que sigo (prioritário)
   * - Posts trending (altos engajamentos)
   * - Posts relacionados a meus interesses
   * - Posts de discovery (novas perspectivas)
   */
  recommendPosts(userId, allPosts, userFollowing, limit = 10) {
    const scored = allPosts.map(post => {
      let score = 0;

      // Score 1: Seguindo autor (+50)
      if (userFollowing?.includes(post.authorId)) {
        score += 50;
      }

      // Score 2: Engagement (+1 per like, +2 per comment, +3 per share)
      score += (post.stats.likes || 0) + (post.stats.comments || 0) * 2 + (post.stats.shares || 0) * 3;

      // Score 3: Recency (decay exponential, -0.1 per hora desde criação)
      const hoursSinceCreation = (Date.now() - post.createdAt) / (60 * 60 * 1000);
      score *= Math.exp(-0.1 * hoursSinceCreation);

      // Score 4: Interest match (+30 se tem interesse nos hashtags)
      const interests = this.userInterests.get(userId) || [];
      const matchingTags = (post.hashtags || []).filter(tag =>
        interests.some(int => tag.toLowerCase().includes(int.toLowerCase()))
      );
      score += matchingTags.length * 30;

      return { ...post, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...post }) => post); // Remove score field
  }

  /**
   * Recomendargrupos para usuário
   */
  recommendGroups(userId, allGroups, userGroups = [], userProfile = {}) {
    const nonJoined = allGroups.filter(g => !userGroups.includes(g.id));

    const scored = nonJoined.map(group => {
      let score = 0;

      // Match com objetivo do usuário
      if (userProfile.goal === 'muscle_gain' && group.topic === 'bulk') score += 40;
      if (userProfile.goal === 'fat_loss' && group.topic === 'cut') score += 40;
      if (userProfile.goal === 'strength' && group.topic === 'strength') score += 40;

      // Match com restrições
      if (userProfile.isVegan && group.topic === 'vegan') score += 30;
      if (userProfile.trainingAge === 0 && group.topic === 'beginner') score += 30;

      // Popularidade do grupo
      score += Math.log(group.memberCount + 1) * 10;

      return { ...group, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...group }) => group);
  }

  /**
   * Recomendarpessoas para seguir
   */
  recommendPeople(userId, allUsers, userFollowing = []) {
    const nonFollowing = allUsers.filter(u => !userFollowing.includes(u.userId) && u.userId !== userId);

    const scored = nonFollowing.map(user => {
      let score = 0;

      // Similaridade (seguem as mesmas pessoas)
      const commonFollows = (user.following || []).filter(f => userFollowing.includes(f)).length;
      score += commonFollows * 20;

      // Badge/status
      if (user.badge === 'gold') score += 30;
      if (user.badge === 'platinum') score += 50;

      // Atividade
      score += Math.log(user.stats?.postCount + 1) * 5;

      return { ...user, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...user }) => user);
  }

  /**
   * Track engagement para refinar recomendações
   */
  trackEngagement(userId, postId, type) {
    if (!this.userEngagementHistory.has(userId)) {
      this.userEngagementHistory.set(userId, []);
    }

    this.userEngagementHistory.get(userId).push({
      postId,
      type, // 'like', 'comment', 'share', 'view'
      timestamp: Date.now(),
    });
  }

  /**
   * Extrair interesses do usuário (baseado em engajamento)
   */
  extractInterests(userId, posts = []) {
    const engagement = this.userEngagementHistory.get(userId) || [];

    // Hashtags que usuário já interagiu
    const engagedHashtags = new Map();

    for (const { postId } of engagement) {
      const post = posts.find(p => p.id === postId);
      if (post && post.hashtags) {
        for (const tag of post.hashtags) {
          engagedHashtags.set(tag, (engagedHashtags.get(tag) || 0) + 1);
        }
      }
    }

    // Top 5 hashtags
    const topTags = Array.from(engagedHashtags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag.replace('#', ''));

    this.userInterests.set(userId, topTags);

    return topTags;
  }
}

export { ContentDiscoveryEngine };
\`\`\`

---

# **CHECKLIST FINAL SPRINT 15**

- [ ] SocialFeedEngine com posts, comments, reactions, shares
- [ ] Timeline algorithms (chronological, engagement, personalized, trending)
- [ ] Mention (@user) parsing e notificações
- [ ] Hashtag (#topic) parsing e busca
- [ ] Follow/unfollow sistema com cache invalidation
- [ ] Full-text search em posts/usuários (Fuse.js)
- [ ] Edit (24h window) e delete posts (author only)
- [ ] Pagination com cursor para feeds grandes
- [ ] Performance <300ms para getTimeline()
- [ ] CommunityGroupsEngine com 7 grupos padrão
- [ ] Moderação automática via IA (blocked words, spam, medical misinformation)
- [ ] Group-specific rules customizáveis
- [ ] Join/leave grupo
- [ ] Group posts (aprovados automaticamente)
- [ ] Group feed com limite
- [ ] Group recommendations baseado em interesse
- [ ] UserProfileEngine com perfil público
- [ ] Achievement system (7+ badges)
- [ ] Badge upgrade (bronze → silver → gold → platinum)
- [ ] Leaderboard por métrica (followers, posts, likes)
- [ ] ContentDiscoveryEngine com recomendação multi-faceted
- [ ] Post recommendation (following + trending + interests)
- [ ] Group recommendation (match objetivo + popularidade)
- [ ] People recommendation (similarity + status)
- [ ] Engagement tracking para aprender interesses
- [ ] Interest extraction from engagement history
- [ ] EventBus para todas as ações (mentioned, commented, reacted, followed, etc)
- [ ] Persistência em IndexedDB
- [ ] Cache com TTL (5 min timeline, etc)
- [ ] Testes unitários completos

---

**FIM DO SPRINT 15 — COMMUNITY & SOCIAL ENGINE COMPLETA** 🚀
\`\`\`
