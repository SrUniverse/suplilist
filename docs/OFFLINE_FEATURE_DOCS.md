# SupliList Offline-First Feature
## User Guide & Troubleshooting

**Version:** 1.0  
**Launch Date:** 2026-06-03  
**Status:** Production

---

## 📱 What's New?

SupliList now works **completely offline**. You can:
- ✅ View your supplements, prices, and dosages without internet
- ✅ Mark supplements as taken (checkin) while offline
- ✅ Everything syncs automatically when you're back online
- ✅ No login required anymore (100% offline first)

---

## 🚀 How It Works

### When You First Open the App
The app downloads key data to your phone (about 500KB):
- Your supplement list
- Prices from 3 marketplaces
- Dosage calculations
- All your past checkins

This happens automatically. You'll see a quick load screen.

### When You Go Offline
1. **WiFi or mobile data drops** → App keeps working instantly
2. You can **checkin supplements** as usual
3. A blue toast appears: `"✅ [Supplement] marked (will sync when back online)"`
4. Checkins are **saved locally on your phone**

### When You Come Back Online
1. **WiFi or mobile data returns** → App automatically starts syncing
2. A green toast appears: `"Synced X check-ins"`
3. Your checkins upload to SupliList servers (takes 1-5 seconds)
4. Everything is now synced across your devices

---

## ❓ FAQ

### Q: What if I checkin offline but my phone dies?
**A:** Your checkins are saved on your phone. When you turn it back on and come online, they'll sync automatically. You won't lose data.

### Q: Can I view my checkin history offline?
**A:** Yes! The app stores all your past checkins locally. You can scroll through your history anytime, even without internet.

### Q: Why does the app show old prices offline?
**A:** The app caches the latest prices when you were last online. This may be slightly outdated (up to 24 hours old), but you'll get fresh prices when you come back online.

### Q: How much space does the offline data take?
**A:** About 500KB on your phone (~0.5MB). That's less than a photo.

### Q: What if sync fails when I come back online?
**A:** The app retries automatically 3 times. If it still fails after 3 tries, you'll see an error toast. See troubleshooting below.

### Q: Can I manually force a sync?
**A:** Not yet, but the app syncs automatically within 5 seconds of coming online. If you want to force it, try:
1. Disable WiFi → Re-enable WiFi
2. Or restart the app

### Q: Does offline mode work on both iOS and Android?
**A:** Yes! Works on any smartphone with a modern browser (Chrome, Safari, Firefox, Edge).

---

## 🆘 Troubleshooting

### Issue: "Offline mode" toast won't disappear even though I'm online

**Cause:** App hasn't detected network connection yet.

**Fix:**
1. Check your WiFi/mobile signal
2. Try toggling WiFi off and on
3. Close and reopen the app
4. If persistent >30 sec: Refresh the page (pull down on mobile, then tap refresh)

---

### Issue: Checkins aren't syncing

**Cause:** Network unstable, or too many items queued.

**Fix:**
1. Make sure you're on a stable WiFi (not weak signal)
2. Go to a place with better coverage
3. Close other apps that use internet
4. Wait 30 seconds for automatic retry
5. If still stuck, try: disable WiFi → re-enable WiFi

**Advanced:** Open DevTools (Chrome: F12) → Console → search for `[SyncQueue]` errors

---

### Issue: App shows "Can't load supplement list" offline

**Cause:** You haven't opened the app online yet, or cache is corrupted.

**Fix:**
1. Go online and open the app (wait 30 seconds for data to download)
2. Then you can use it offline
3. If error persists: Clear app cache
   - **iOS**: Settings → Apps → SupliList → Clear Cache
   - **Android**: Settings → Apps → SupliList → Storage → Clear Cache

---

### Issue: Sync worked but my checkin disappeared

**Cause:** Very rare — sync succeeded but local cache cleared.

**Fix:**
1. Open your checkin history (you should see it synced)
2. If it's not there: Take a screenshot and contact support
3. We have backups; we'll restore it

---

### Issue: "Database error" message appears

**Cause:** Phone storage is full, or IndexedDB corrupted.

**Fix:**
1. **Free up phone storage:** Delete old photos/videos
2. **Clear app data:**
   - **iOS**: Settings → Apps → SupliList → Offload App (then reinstall)
   - **Android**: Settings → Apps → SupliList → Storage → Clear Storage
3. Reopen app and let it re-download data

---

## 🛠️ For Support Team

### How to Help Users with Offline Issues

**Step 1: Confirm they're testing offline correctly**
- Have them disable WiFi AND mobile data
- App should still load and show supplement list
- If it shows blank → cache issue

**Step 2: Check their sync status**
- Ask: "When you came back online, did you see a green toast saying 'Synced X check-ins'?"
- If no → sync failed (check error below)
- If yes → everything worked, it's a perception issue

**Step 3: If sync failed**
- Ask: "Are you on a stable WiFi now?"
- If no → have them connect to stable WiFi and wait 30 sec
- If yes → have them clear browser cache and try again
- If still failing → escalate to engineering with user ID + timestamps

**Step 4: Data loss?**
- Check server logs: did `/api/checkin/bulk` receive the request?
- If yes → data is safe, just not showing in UI (UX bug)
- If no → data lost (rare). Apologize, explain we have backups, create ticket

---

## 📞 Escalation Path

| Issue | Who to Contact |
|-------|---|
| Sync failing consistently | Engineering (check monitoring dashboard) |
| IndexedDB quota exceeded | Engineering (increase quota or implement cleanup) |
| Users losing checkins | Engineering (data loss investigation) |
| App crashes offline | Engineering (browser compatibility issue) |
| Feature suggestion | Product team |

---

## 🔄 Version History

### v1.0 (2026-06-03) — Launch
- ✅ Service Worker caching for instant loads
- ✅ IndexedDB offline checkin queue
- ✅ Automatic background sync
- ✅ UI feedback (offline/online toasts)
- ✅ Works on iOS, Android, desktop browsers

### v1.1 (Coming Soon)
- 🔮 Offline favorites sync
- 🔮 Offline settings sync
- 🔮 Conflict resolution (if data changed on server while offline)
- 🔮 Manual sync button
- 🔮 Storage quota warnings

---

## 📚 Technical Details (for Devs)

### Architecture
- **Service Worker:** Stale-While-Revalidate caching for `/api/profile/me`, `/api/stack`, `/api/favorites`, `/api/settings/me`
- **IndexedDB:** `offline-checkins` store with status tracking (pending/synced/failed)
- **Sync Queue:** Automatic POST to `/api/checkin/bulk` with 3 retries
- **State Management:** Redux with `SET_OFFLINE_MODE` action
- **UI Feedback:** EventBus-based toast notifications

### Browser Support
| Browser | Offline | Sync | Notes |
|---------|---------|------|-------|
| Chrome 60+ | ✅ | ✅ | Full support |
| Firefox 55+ | ✅ | ✅ | Full support |
| Safari 11+ | ✅ | ✅ | Full support |
| Edge 15+ | ✅ | ✅ | Full support |
| IE 11 | ❌ | ❌ | Not supported (too old) |

### Storage Limits
- **Cache (Service Worker):** ~50MB (browser limit)
- **IndexedDB:** ~50-100MB (depends on device, typically cleared by browser if low on space)
- **Current Usage:** ~500KB for sync queue + cached API responses

### Performance
- **Cache hit latency:** <50ms (instant)
- **Sync latency:** <5s (background, non-blocking)
- **Storage overhead:** <1MB for app lifecycle

---

## 🚨 Known Limitations

1. **Private/Incognito Mode:** Offline doesn't work in private mode (data not persisted)
2. **Browser Storage Cleared:** If user clears all browser data, offline cache is lost (they'll re-download on next online session)
3. **No Offline Push Notifications:** Can't receive reorder reminders while offline (but will sync when online)
4. **Max Queue Size:** Storing 1000s of offline checkins may slow sync (we auto-cleanup after 30 days)

---

## 📈 Metrics We're Tracking

- Service Worker activation rate (target: >95%)
- Sync success rate (target: >98%)
- Average sync latency (target: <5s)
- Cache hit rate (target: >80%)
- User adoption of offline features

See [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) for details.

---

## 💬 Feedback?

Found a bug? Have a suggestion?
- **Report bugs:** Open an issue on GitHub or email support@suplilist.com
- **Feature requests:** Feature form at suplilist.com/feedback
- **General questions:** support@suplilist.com

---

**Last Updated:** 2026-06-03  
**Maintained By:** Platform Team
