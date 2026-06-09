# SupliList — Security Model

## Authentication

### Token Lifecycle

| Token | Lifetime | Storage | Rotation |
|-------|----------|---------|---------|
| Access token (JWT) | **5 minutes** | Memory / Authorization header | On every `/refresh` call |
| Refresh token (JWT) | 7 days | HttpOnly cookie | Rotated on use (RTR) |
| Pre-auth token (MFA) | 5 minutes | Memory / Authorization header | Single use |

### Token Issuance Paths

All of these issue a fresh (access + refresh) pair:
- `POST /api/auth/login` — password flow
- `POST /api/auth/google` — OAuth flow
- `POST /api/auth/verify-mfa` — MFA completion
- `POST /api/auth/verify-otp` — OTP completion
- `POST /api/auth/verify-device` — device verification
- `POST /api/auth/refresh` — silent refresh (rotates both tokens)

---

## Token Revocation

### On Logout (`POST /api/auth/logout`)

Both the access token and the refresh token JTIs are added to the Redis blocklist with TTL matching their remaining lifetime. After logout, both tokens are immediately rejected by `requireAuth`.

### On Session Theft Detection

If a refresh token is used a second time (RTR reuse detection), the server:
1. Sets `sessionsValidAfter = now()` on the user document
2. Invalidates the Redis `user:validAfter` cache
3. All tokens issued before that timestamp are rejected on next request (≤ 5 min cache window)

### On Password Reset / Account Deletion

`sessionsValidAfter` is updated, invalidating all existing sessions globally.

### Redis Cache TTL

The `user:validAfter` epoch is cached in Redis for **5 minutes**. If `sessionsValidAfter` changes (security breach, password reset), the change propagates within 5 minutes. Previous behavior was 24 hours — reduced to minimize attack window.

---

## Authorization

### Roles

| Role | Permissions |
|------|------------|
| `user` | Own resources only |
| `admin` | All resources + audit log access |

Role assignment is manual (direct DB write). No endpoint can elevate a user's role.

### Ownership Validation

All user-scoped operations (read, update, delete) filter by `userId` at the repository layer using `findByIdAndUserId`. There is no application-layer bypass — the database query enforces ownership.

### Resource Access Pattern

```
Controller → extracts userId from req.user.id (JWT-validated)
         → passes userId to UseCase
         → UseCase passes userId to Repository
         → Repository: WHERE id = :resourceId AND userId = :userId
```

---

## Endpoint Protection Summary

| Path prefix | Auth required | Role required |
|-------------|--------------|--------------|
| `POST /api/auth/login` | No | — |
| `POST /api/auth/register` | No | — |
| `POST /api/auth/refresh` | No (cookie) | — |
| `GET /api/profile/:userId/photo` | **No** (public avatar) | — |
| `GET /health` | No | — |
| `GET /api/audit/admin/audit` | Yes | `admin` |
| `GET /api/email/stats` | Yes | `admin` |
| All other `/api/*` | Yes | `user` |

The public photo endpoint validates that `:userId` is a valid MongoDB ObjectId before querying to prevent enumeration attacks.

---

## CSRF Protection

All state-mutating requests (POST, PUT, PATCH, DELETE) require the `X-SupliList-Client: 1` header. The CORS allowlist prevents this header from being sent cross-origin, making CSRF attacks impossible from browsers.

---

## Rate Limiting

| Context | Limit |
|---------|-------|
| Auth (per IP) | 20 attempts / 15 min |
| Auth (per email) | 5 attempts / 15 min |
| Password reset (IP) | 3 / hour |
| Password reset (email) | 3 / hour |
| MFA / Google OAuth | 30 / 15 min |

---

## Security Event Logging

All events below are logged as structured JSON (`ts`, `event`, `userId`, `ip`, `userAgent`):

- `auth.login_failed` — wrong password
- `auth.token_expired` — expired token presented
- `auth.token_revoked` — JTI in blocklist (post-logout reuse)
- `auth.token_revoked_globally` — token issued before `sessionsValidAfter`
- `auth.session_theft_detected` — refresh token reuse
- `auth.role_denied` — correct auth, wrong role
- `auth.insufficient_scope` — pre_auth token on protected route
- `auth.password_reset` — password reset completed
- `auth.account_deleted` — account soft-deleted

---

## Incident Response

### Revoke all sessions for a user

```js
// In a migration script or admin action:
await UserIdentityModel.findByIdAndUpdate(userId, {
  sessionsValidAfter: new Date()
});
await redisClient.del(`user:validAfter:${userId}`);
```

All tokens issued before this moment will be rejected within 5 minutes (cache TTL).

### Suspect token compromise

If a specific token JTI is compromised:

```js
await tokenBlocklist.block(jti, tokenExpiresAt);
```

The token is rejected immediately on the next request.

---

## Design Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Access tokens NOT in blocklist by default (pre-#1 refactor) | Stateless JWT is the norm; JTI blocklist adds Redis round-trip per request |
| **Access tokens NOW in blocklist** (post-#1 refactor) | Logout must be immediate for a health-data app |
| 5-minute access token lifetime | Minimizes blocklist TTL in Redis; expired entries auto-delete |
| 5-minute session cache TTL | Down from 24h; faster propagation of global revocation |
| Public photo endpoint | Avatars are shown on shared content; ObjectId validation prevents enumeration |
| Role assignment via DB only | No privilege escalation attack surface |
