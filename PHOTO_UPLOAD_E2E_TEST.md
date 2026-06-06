# 🧪 Photo Upload Feature - End-to-End Testing Guide

## Overview

Complete E2E test guide for the photo upload feature. Tests authentication, upload, persistence, and viewing.

---

## ✅ Setup Required

### 1. Backend Running
```bash
cd backend
npm install
npm run dev
# Server should run on http://localhost:3000
```

### 2. Frontend Running  
```bash
cd frontend
npm install
npm run dev
# App should run on http://localhost:5173
```

### 3. Database Connected
- MongoDB running (local or cloud)
- UserProfile model initialized

### 4. Test User Created
```bash
# Create test user via signup or:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

---

## 🧪 E2E Test Scenarios

### Scenario 1: Upload Photo (Authenticated User)

**Steps:**
1. ✅ User opens app and logs in
2. ✅ Navigates to Profile page
3. ✅ Clicks "📤 Escolher Foto"
4. ✅ Selects JPEG file (< 5MB)
5. ✅ Clicks "✅ Fazer Upload"
6. ✅ Wait for upload complete

**Expected Results:**
```
✅ Photo preview appears (circular)
✅ Progress bar shows 100%
✅ Status: "✅ Foto enviada com sucesso!"
✅ DB entry created: user_profiles.photo
✅ State updated: user.photo = "/uploads/photos/..."
✅ Page refreshes, photo persists
```

**API Calls Verified:**
```
POST /api/profile/photo (multipart/form-data)
Response 200: {
  "success": true,
  "photo": {
    "url": "/uploads/photos/userId_timestamp_random.jpg",
    "uploadedAt": "2026-06-06T...",
    "size": "2.45 MB",
    "mimetype": "image/jpeg"
  }
}
```

---

### Scenario 2: Photo Persistence (Logout & Login)

**Steps:**
1. ✅ User uploads photo (from Scenario 1)
2. ✅ Photo appears in profile
3. ✅ Logout
4. ✅ Login again
5. ✅ Navigate to profile

**Expected Results:**
```
✅ Same photo URL appears
✅ Photo displays correctly
✅ user.photo persists in DB
✅ GET /api/profile returns photo field
```

**Database Verification:**
```javascript
// Check MongoDB
db.user_profiles.findOne({ userId: "123" })
// Should return:
{
  _id: ObjectId(...),
  userId: "123",
  name: "Test User",
  email: "test@example.com",
  photo: {
    url: "/uploads/photos/123_1717686332_a1b2c3d4.jpg",
    publicId: "123_1717686332_a1b2c3d4.jpg",
    uploadedAt: ISODate("2026-06-06T..."),
    size: 2560000,
    mimetype: "image/jpeg"
  },
  ...
}
```

---

### Scenario 3: Validation - File Too Large

**Steps:**
1. ✅ Prepare file > 5MB
2. ✅ Try to upload

**Expected Results:**
```
❌ Upload blocked
❌ Status: "❌ Erro: File too large..."
❌ No DB entry created
❌ user.photo unchanged
```

---

### Scenario 4: Validation - Invalid Format

**Steps:**
1. ✅ Select .txt or .exe file
2. ✅ Try to upload

**Expected Results:**
```
❌ Upload blocked
❌ Status: "❌ Erro: Invalid file type..."
❌ No DB entry created
```

---

### Scenario 5: Delete Photo

**Steps:**
1. ✅ User has photo uploaded
2. ✅ Click "🗑️ Remover Foto"
3. ✅ Confirm deletion

**Expected Results:**
```
✅ Confirmation dialog shown
✅ Photo deleted from disk
✅ DB entry cleared: photo = {}
✅ UI refreshes
✅ Photo placeholder shown

API Call:
DELETE /api/profile/photo
Response 200: {
  "success": true,
  "message": "Photo deleted successfully"
}
```

**Database After Delete:**
```javascript
db.user_profiles.findOne({ userId: "123" })
// photo field should be: {} or null
```

---

### Scenario 6: Unauthenticated - Cannot Upload

**Steps:**
1. ✅ Logout
2. ✅ Try to access /profile
3. ✅ Try to POST /api/profile/photo

**Expected Results:**
```
❌ Redirected to login
❌ POST returns 401 Unauthorized
❌ Error: "Você precisa estar logado"
```

---

### Scenario 7: Rate Limiting

**Steps:**
1. ✅ Upload photo
2. ✅ Delete photo  
3. ✅ Upload another photo
4. ✅ Repeat 8+ more times quickly

**Expected Results:**
```
After 10th upload in 60 minutes:
❌ Error: 429 Too Many Requests
❌ "Rate limit exceeded - too many emails sent"
```

---

### Scenario 8: Public Profile View

**Steps:**
1. ✅ User A uploads photo
2. ✅ Get User A's ID: `userId123`
3. ✅ Logout
4. ✅ Call GET `/api/profile/userId123/photo`

**Expected Results:**
```
GET /api/profile/userId123/photo
Response 200: {
  "success": true,
  "photo": {
    "url": "/uploads/photos/...",
    "uploadedAt": "2026-06-06T...",
    "userName": "User A"
  }
}
```

**Note:** No authentication required for public endpoint

---

### Scenario 9: Replace Existing Photo

**Steps:**
1. ✅ Upload photo (photo1.jpg)
2. ✅ Verify photo appears
3. ✅ Upload different photo (photo2.jpg)
4. ✅ Verify new photo displays

**Expected Results:**
```
✅ photo1.jpg deleted from disk
✅ photo2.jpg saved
✅ DB contains only photo2.jpg URL
✅ No orphaned files left
```

---

### Scenario 10: State Management

**Steps:**
1. ✅ Upload photo
2. ✅ Open browser dev tools → Console
3. ✅ Check state

**Expected:**
```javascript
// In console:
stateManager.select(s => s.user.photo)
// Should return: "/uploads/photos/123_timestamp_random.jpg"

stateManager.select(s => s.user)
// Should include photo field
```

---

## 🔍 Verification Checklist

### Frontend
- [ ] Photo appears as circular image
- [ ] Progress bar works during upload
- [ ] Delete button shows/hides correctly
- [ ] Status messages appear (success/error)
- [ ] Guidelines visible
- [ ] File validation works
- [ ] Size limit enforced (5MB)
- [ ] Format validation works (JPG/PNG/WebP/GIF)
- [ ] State updates after upload
- [ ] State persists after page refresh

### Backend
- [ ] POST /api/profile/photo returns 200
- [ ] Photo URL stored in DB
- [ ] File saved to disk
- [ ] DELETE removes file from disk
- [ ] DELETE clears DB entry
- [ ] GET /api/profile returns photo field
- [ ] Rate limiting works
- [ ] Authentication enforced
- [ ] Validation works
- [ ] Errors return proper status codes

### Database
- [ ] UserProfile collection exists
- [ ] photo field correctly structured
- [ ] photo.url stored
- [ ] photo.publicId stored
- [ ] photo.uploadedAt stored
- [ ] Indexes created for performance
- [ ] TTL cleanup works (if configured)

### Security
- [ ] Unauthenticated requests blocked
- [ ] Filename generated server-side (not user input)
- [ ] HTML sanitized (no XSS)
- [ ] File type validated
- [ ] File size validated
- [ ] Rate limiting prevents abuse
- [ ] Photo URL doesn't expose internals

---

## 📊 Test Results Template

```markdown
# Photo Upload Feature - E2E Test Results
Date: 2026-06-06
Tester: [Name]

## Scenarios Tested

- [ ] Scenario 1: Upload Photo ✅/❌
  - Status: PASS/FAIL
  - Notes: 

- [ ] Scenario 2: Photo Persistence ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 3: File Too Large ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 4: Invalid Format ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 5: Delete Photo ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 6: Unauthenticated ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 7: Rate Limiting ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 8: Public View ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 9: Replace Photo ✅/❌
  - Status: PASS/FAIL
  - Notes:

- [ ] Scenario 10: State Management ✅/❌
  - Status: PASS/FAIL
  - Notes:

## Overall Result

- Total Scenarios: 10
- Passed: __/10
- Failed: __/10
- Status: [READY FOR PRODUCTION / NEEDS FIXES]

## Issues Found

1. ...
2. ...

## Sign-Off

- Tested by: [Name]
- Date: [Date]
- Approved: [Yes/No]
```

---

## 🚀 Deployment Checklist

Before production deployment:

- [ ] All 10 scenarios tested
- [ ] 0 critical issues
- [ ] < 2 minor issues
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Database backup in place
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Error logging working
- [ ] Team trained

---

**Feature Status: ✅ COMPLETE & TESTABLE**

All code created. Ready for E2E testing before production.
