# 📚 SPRINT PLAN: SEO, Blog & PWA + APK Distribution

**Duration:** 5 weeks  
**Timeline:** Week 14-18  
**Target:** Blog platform, SEO optimization, PWA setup, APK distribution  
**Total Files:** 32  
**Total Tests:** 120+  
**Lines of Code:** 3,000+

---

## 📋 Overview

Complete content and distribution strategy:
- Blog platform with markdown editor
- SEO optimization with schema.org markup
- Progressive Web App (PWA) installation
- APK direct download for Android
- Content strategy and initial 10 blog posts

---

## 🗓️ WEEK 14-15: Blog Platform

### Sprint Goal
Build blog platform with markdown editor and publishing workflow.

### Files to Create (12)

#### Database Schema

**File: server/database/migrations/011_blog.sql (100 lines)**
```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt VARCHAR(500),
  author_id UUID NOT NULL REFERENCES users(id),
  featured_image VARCHAR(2048),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0
);

CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE blog_post_category (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
```

#### Services

**File: server/src/services/blog.service.ts (400 lines)**
```typescript
import { db } from '../shared/config/database.config';
import { generateSlug } from '../utils/slug.util';

export class BlogService {
  async createPost(data: any, authorId: string) {
    const slug = generateSlug(data.title);
    
    const result = await db.query(
      `INSERT INTO blog_posts (title, slug, content, excerpt, author_id, featured_image)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.title, slug, data.content, data.excerpt, authorId, data.featuredImage]
    );

    return result.rows[0];
  }

  async publishPost(postId: string) {
    const result = await db.query(
      `UPDATE blog_posts
       SET published_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [postId]
    );
    return result.rows[0];
  }

  async getPostBySlug(slug: string) {
    const result = await db.query(
      `SELECT bp.*, u.email as author_email,
              array_agg(DISTINCT bt.name) as tags,
              array_agg(DISTINCT bc.name) as categories
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
       LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
       LEFT JOIN blog_post_category bpc ON bp.id = bpc.post_id
       LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
       WHERE bp.slug = $1 AND bp.published_at IS NOT NULL
       GROUP BY bp.id, u.id`,
      [slug]
    );

    if (result.rows.length > 0) {
      // Increment view count
      await db.query('UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = $1', [slug]);
    }

    return result.rows[0];
  }

  async getPosts(limit = 10, offset = 0) {
    const result = await db.query(
      `SELECT * FROM blog_posts
       WHERE published_at IS NOT NULL
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async searchPosts(query: string, limit = 20) {
    const result = await db.query(
      `SELECT * FROM blog_posts
       WHERE published_at IS NOT NULL
       AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1)
       ORDER BY published_at DESC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  }

  async getRelatedPosts(postId: string, limit = 5) {
    const result = await db.query(
      `SELECT DISTINCT bp.* FROM blog_posts bp
       JOIN blog_post_tags bpt1 ON bp.id = bpt1.post_id
       JOIN blog_post_tags bpt2 ON bpt1.tag_id = bpt2.tag_id
       WHERE bpt2.post_id = $1 AND bp.id != $1
       AND bp.published_at IS NOT NULL
       LIMIT $2`,
      [postId, limit]
    );
    return result.rows;
  }
}

export const blogService = new BlogService();
```

#### Routes

**File: server/src/routes/blog.routes.ts (250 lines)**
```typescript
import { Router } from 'express';
import { blogService } from '../services/blog.service';

export const blogRouter = Router();

// Public routes
blogRouter.get('/posts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const posts = await blogService.getPosts(limit, offset);
    res.json({ data: posts, count: posts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

blogRouter.get('/posts/:slug', async (req, res) => {
  try {
    const post = await blogService.getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

blogRouter.get('/posts/:slug/related', async (req, res) => {
  try {
    const post = await blogService.getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const related = await blogService.getRelatedPosts(post.id);
    res.json({ data: related });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

blogRouter.get('/search', async (req, res) => {
  try {
    if (!req.query.q) {
      return res.status(400).json({ error: 'Query required' });
    }
    const results = await blogService.searchPosts(req.query.q as string);
    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
blogRouter.post('/admin/posts', adminAuth, async (req, res) => {
  try {
    const post = await blogService.createPost(req.body, req.user.id);
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

blogRouter.post('/admin/posts/:id/publish', adminAuth, async (req, res) => {
  try {
    const post = await blogService.publishPost(req.params.id);
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Frontend Components

**File: frontend/src/pages/BlogPage.tsx (300 lines)**
- Blog listing with pagination
- Category filter
- Search functionality
- Featured post

**File: frontend/src/pages/BlogPostPage.tsx (400 lines)**
```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '@/services/api.client';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    try {
      const [postRes, relatedRes] = await Promise.all([
        apiClient.get(`/api/blog/posts/${slug}`),
        apiClient.get(`/api/blog/posts/${slug}/related`)
      ]);

      setPost(postRes.data);
      setRelated(relatedRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <article className="blog-post">
      <header className="post-header">
        <h1>{post.title}</h1>
        <p className="post-meta">By {post.author_email} • {new Date(post.published_at).toLocaleDateString()}</p>
      </header>

      {post.featured_image && (
        <img src={post.featured_image} alt={post.title} className="post-image" />
      )}

      <div className="post-content">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      <div className="post-footer">
        <div className="tags">
          {post.tags?.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <div className="share-buttons">
          {/* Share on social media */}
        </div>
      </div>

      <aside className="related-posts">
        <h3>Related Posts</h3>
        {related.map(p => (
          <div key={p.id} className="related-post-card">
            <h4>{p.title}</h4>
            <p>{p.excerpt}</p>
          </div>
        ))}
      </aside>
    </article>
  );
}
```

**File: frontend/src/components/BlogCard.tsx (120 lines)**
**File: frontend/src/components/BlogSidebar.tsx (150 lines)**
**File: frontend/src/hooks/useBlog.ts (100 lines)**

#### Admin Editor

**File: frontend/src/pages/admin/BlogEditor.tsx (600 lines)**
```typescript
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '@/services/api.client';

export default function BlogEditor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [preview, setPreview] = useState(false);

  const handlePublish = async () => {
    try {
      const response = await apiClient.post('/api/blog/admin/posts', {
        title,
        content,
        excerpt
      });
      
      await apiClient.post(`/api/blog/admin/posts/${response.data.id}/publish`);
      alert('Post published!');
    } catch (error) {
      alert('Failed to publish: ' + error.message);
    }
  };

  return (
    <div className="blog-editor">
      <div className="editor-section">
        <input
          placeholder="Post Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="title-input"
        />
        
        <textarea
          placeholder="Markdown content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="content-textarea"
          rows={20}
        />

        <textarea
          placeholder="Excerpt (summary)"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="excerpt-input"
        />

        <button onClick={handlePublish} className="btn-primary">
          Publish Post
        </button>
      </div>

      {preview && (
        <div className="preview-section">
          <h1>{title}</h1>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

#### Tests

**File: e2e/blog.test.ts (40+ tests)**

### Checklist for Week 14-15
- [ ] Blog schema created
- [ ] BlogService working
- [ ] Blog routes working
- [ ] Blog pages rendering
- [ ] Admin editor working
- [ ] Markdown rendering
- [ ] All 40+ tests passing

---

## 🗓️ WEEK 16: SEO Optimization

### Sprint Goal
Implement complete SEO strategy with schema.org markup and optimization.

### Files to Create (8)

#### SEO Utilities

**File: frontend/src/utils/seo.ts (250 lines)**
```typescript
export interface MetaTags {
  title: string;
  description: string;
  image?: string;
  url?: string;
  article?: {
    publishedTime: string;
    modifiedTime: string;
    authors: string[];
  };
}

export function generateMetaTags(tags: MetaTags): React.ReactElement[] {
  return [
    <title key="title">{tags.title}</title>,
    <meta key="description" name="description" content={tags.description} />,
    <meta key="og:title" property="og:title" content={tags.title} />,
    <meta key="og:description" property="og:description" content={tags.description} />,
    ...(tags.image ? [
      <meta key="og:image" property="og:image" content={tags.image} />,
      <meta key="twitter:image" name="twitter:image" content={tags.image} />
    ] : []),
    <meta key="twitter:title" name="twitter:title" content={tags.title} />,
    <meta key="twitter:description" name="twitter:description" content={tags.description} />,
    ...(tags.article ? [
      <meta key="article:published_time" property="article:published_time" content={tags.article.publishedTime} />,
      <meta key="article:modified_time" property="article:modified_time" content={tags.article.modifiedTime} />
    ] : [])
  ];
}

export function generateStructuredData(type: string, data: any) {
  const schemas: Record<string, any> = {
    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.title,
      description: data.excerpt,
      image: data.image,
      author: {
        '@type': 'Person',
        name: data.authorName
      },
      datePublished: data.publishedAt,
      dateModified: data.updatedAt
    },
    product: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      description: data.description,
      image: data.image,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BRL',
        lowPrice: data.minPrice,
        highPrice: data.maxPrice
      }
    },
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SupliList',
      url: 'https://suplilist.app',
      logo: 'https://suplilist.app/logo.png'
    }
  };

  return schemas[type] || schemas.organization;
}
```

#### SEO Routes

**File: server/src/routes/seo.routes.ts (200 lines)**
```typescript
import { Router } from 'express';

export const seoRouter = Router();

// Sitemap
seoRouter.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = await generateSitemap();
    res.type('application/xml');
    res.send(sitemap);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Robots.txt
seoRouter.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: https://suplilist.app/sitemap.xml
`);
});

// Structured data
seoRouter.get('/robots.txt', (req, res) => {
  // Generate robots.txt
});
```

#### Static Files

**File: frontend/public/robots.txt**
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: https://suplilist.app/sitemap.xml
```

**File: frontend/public/.well-known/manifest.json** (PWA manifest)

#### Content Strategy

**File: docs/BLOG_CONTENT_STRATEGY.md (300 lines)**
```markdown
# Blog Content Strategy

## SEO Pillars

### 1. Informational Content
- "Supplement Buying Guide 2024"
- "How to Choose the Right Protein Powder"
- "Supplement Stack Guide for Beginners"
- "Price Comparison: Amazon vs Shopee vs Mercado Livre"

### 2. How-To Content
- "How to Save 30% on Supplements"
- "How to Track Your Supplement Spending"
- "How to Create a Supplement List"

### 3. Product Reviews
- "Best Whey Proteins in Brazil"
- "Best BCAAs for 2024"
- "Best Creatine Supplements"

### 4. Local/Long-tail Content
- "Where to Buy Cheap Supplements in Brazil"
- "Best Supplement Deals on Amazon BR"
- "Shopee Supplement Price Comparison"

## Content Calendar
- 2 posts per week
- Mix of pillar content + evergreen
- Update old content monthly
- Internal linking strategy
```

#### Tests

**File: e2e/seo.test.ts (40+ tests)**
- Meta tags generation
- Structured data validation
- Sitemap generation
- Robots.txt validation

### Checklist for Week 16
- [ ] SEO utils created
- [ ] Sitemap generating
- [ ] Robots.txt working
- [ ] Structured data working
- [ ] Blog posts have proper meta tags
- [ ] All 40+ tests passing

---

## 🗓️ WEEK 17-18: PWA & APK Distribution

### Sprint Goal
Convert app to PWA and setup APK distribution.

### Files to Create (12)

#### PWA Setup

**File: frontend/public/manifest.json (60 lines)**
```json
{
  "name": "SupliList - Supplement Price Comparison",
  "short_name": "SupliList",
  "description": "Find the best prices on supplements across Amazon, Shopee, and Mercado Livre",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#FF6B6B",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["shopping", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshot1.png",
      "sizes": "540x720",
      "type": "image/png"
    },
    {
      "src": "/screenshot2.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

**File: frontend/public/service-worker.ts (300 lines)**
```typescript
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API calls - Network first (fallback to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      {
        handlerDidError: async () => {
          return new Response(JSON.stringify({ offline: true }));
        }
      }
    ]
  })
);

// Images - Cache first (60 day expiration)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheableResponse: {
          statuses: [0, 200]
        }
      },
      {
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
        }
      }
    ]
  })
);

// HTML/CSS/JS - Stale while revalidate
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'assets'
  })
);

// Navigation requests
const navigationHandler = new NetworkFirst({
  cacheName: 'navigations',
  networkTimeoutSeconds: 3
});

registerRoute(new NavigationRoute(navigationHandler));

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Sync offline queue when back online
}
```

**File: frontend/src/utils/pwa-install-handler.ts (200 lines)**
```typescript
export class PWAInstallHandler {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;

  constructor() {
    this.init();
  }

  private init() {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      console.log('App installed');
    });
  }

  private showInstallPrompt() {
    // Trigger install prompt UI
    const event = new CustomEvent('pwa-install-ready', {
      detail: { deferredPrompt: this.deferredPrompt }
    });
    window.dispatchEvent(event);
  }

  async promptInstall() {
    if (!this.deferredPrompt || this.isInstalled) {
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  isAppInstalled() {
    return this.isInstalled;
  }

  isInstallable() {
    return !!this.deferredPrompt && !this.isInstalled;
  }
}

export const pwaHandler = new PWAInstallHandler();
```

**File: frontend/src/components/InstallPrompt.tsx (200 lines)**
```typescript
import React, { useState, useEffect } from 'react';
import { pwaHandler } from '../utils/pwa-install-handler';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if installable
    if (pwaHandler.isInstallable()) {
      setShowPrompt(true);
    }

    // Check if iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    window.addEventListener('pwa-install-ready', () => {
      setShowPrompt(true);
    });
  }, []);

  const handleInstall = async () => {
    const success = await pwaHandler.promptInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  if (isIOS) {
    return (
      <div className="install-prompt ios">
        <p>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></p>
        <button onClick={() => setShowPrompt(false)}>Dismiss</button>
      </div>
    );
  }

  return (
    <div className="install-prompt android">
      <h3>Install SupliList</h3>
      <p>Get instant access from your home screen</p>
      <div className="buttons">
        <button onClick={handleInstall} className="btn-primary">
          Install
        </button>
        <button onClick={() => setShowPrompt(false)} className="btn-text">
          Not now
        </button>
      </div>
    </div>
  );
}
```

**File: frontend/vite.config.ts (PWA plugin)**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml'],
      manifest: {
        // Loaded from public/manifest.json
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
});
```

#### APK Distribution

**File: eas.json (Expo build config)**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "node": "18.0.0",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.suplilist.app"
      }
    },
    "preview": {
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "./path/to/service-account.json",
        "track": "production"
      }
    }
  }
}
```

**File: server/routes/download.routes.ts (150 lines)**
```typescript
import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export const downloadRouter = Router();

// Get latest app version
downloadRouter.get('/version', (req, res) => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
  res.json({ version: packageJson.version });
});

// Download APK
downloadRouter.get('/apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../public/app-latest.apk');
  
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ error: 'APK not found' });
  }

  res.download(apkPath, 'suplilist.apk');
});

// Check for updates
downloadRouter.post('/check-update', (req, res) => {
  const { currentVersion } = req.body;
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
  
  const hasUpdate = currentVersion !== packageJson.version;
  
  res.json({
    hasUpdate,
    latestVersion: packageJson.version,
    downloadUrl: hasUpdate ? '/downloads/apk' : null
  });
});
```

**File: frontend/pages/download.tsx (300 lines)**
- Download page for APK
- PWA install prompts
- Version information

**File: frontend/src/services/app-updater.ts (150 lines)**
- Check for updates in background
- Notify user of new version
- Download management

#### Documentation

**File: docs/PWA_SETUP.md (200 lines)**
**File: docs/APK_DISTRIBUTION.md (200 lines)**
**File: MOBILE_BUILD_GUIDE.md (200 lines)**

#### Tests

**File: e2e/pwa-apk.test.ts (40+ tests)**
- PWA installability
- Service worker registration
- Offline functionality
- APK download
- Version checking

### Checklist for Week 17-18
- [ ] PWA manifest.json working
- [ ] Service worker registered
- [ ] Install prompts showing
- [ ] APK builds successfully
- [ ] Download page working
- [ ] Update checker working
- [ ] All 40+ tests passing

---

## 📊 Summary

**Total Files:** 32  
**Total Tests:** 120+  
**Total Lines:** 3,000+  
**Time:** 5 weeks

### Key Deliverables
✅ Blog platform with markdown editor  
✅ 10 initial blog posts  
✅ Complete SEO optimization  
✅ Schema.org markup  
✅ Sitemap and robots.txt  
✅ PWA installation  
✅ APK distribution  
✅ Auto-update system  
✅ 120+ tests  
✅ Production ready

### Blog Posts (Initial 10)
1. "10 Best Supplements for 2024"
2. "Supplement Price Comparison: Amazon vs Shopee vs Mercado Livre"
3. "How to Save 30% on Supplements"
4. "Supplement Buying Guide for Beginners"
5. "Best Time to Buy Supplements (Data Analysis)"
6. "Whey Protein Complete Guide"
7. "BCAA vs EAA: What's the Difference?"
8. "Complete Supplement Stacking Guide"
9. "Where to Buy Supplements Cheap in Brazil"
10. "Supplement Ingredients Explained"

**Next:** All plans complete! Ready for Claude Code implementation.

---

## 📋 Full Implementation Roadmap

### TOTAL PROJECT SCOPE
- **Total Duration:** 18 weeks
- **Total Files:** 145+
- **Total Tests:** 680+
- **Total Lines of Code:** 11,000+
- **Total Documentation:** 8,000+ lines

### Timeline by Phase
```
WEEKS 1-6:    Mobile App (iOS + Android)
WEEKS 7-10:   Social Features (Profiles, Feed, Comments)
WEEKS 11-13:  Analytics & Insights (Dashboards, Reports)
WEEKS 14-18:  Blog, SEO & PWA (Content, Distribution)
```

### All Sprint Plans Created
1. ✅ SPRINT_PLAN_MOBILE_APP.md (6 weeks)
2. ✅ SPRINT_PLAN_SOCIAL_FEATURES.md (4 weeks)
3. ✅ SPRINT_PLAN_ANALYTICS_AND_INSIGHTS.md (3 weeks)
4. ✅ SPRINT_PLAN_SEO_BLOG_PWA.md (5 weeks)

**Total: 18 weeks to complete all 4 features with comprehensive testing and documentation.**
