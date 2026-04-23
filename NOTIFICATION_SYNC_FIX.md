# 🔧 NOTIFICATION SYNC FIX - Testing Guide

## 📋 Problem Summary
After merging with dev branch, notifications marked as read reappear as unread after page refresh for some users (supervisor), while working correctly locally.

## ✅ Root Cause Fixed
**API endpoint mismatch between frontend and backend:**

### Before Fix ❌
- Frontend called: `POST /api/notifications/{id}/mark-as-read`
- Backend expected: `PUT /api/notifications/{id}/read`

- Frontend called: `POST /api/notifications/mark-all-as-read`
- Backend expected: `PUT /api/notifications/mark-all-read`

### After Fix ✅
All endpoints now correctly match backend routes in `notification.service.ts`

---

## 🧪 Testing Steps for Supervisor

### Step 1: Pull Latest Changes
```bash
git pull origin <branch-name>
```

### Step 2: Clear Browser Cache & LocalStorage
**IMPORTANT:** This ensures old cached data doesn't interfere

1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** → **Clear site data**
4. OR manually delete localStorage:
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

### Step 3: Rebuild Frontend
```bash
cd frontend/transport-management-system-web
npm install  # if needed
ng serve
```

### Step 4: Test Notification Read Status

#### Test Case 1: Mark Single Notification as Read
1. Login to the web app
2. Click notification bell icon
3. Click on ONE unread notification
4. Verify it disappears from the list
5. **REFRESH THE PAGE** (F5)
6. ✅ Expected: Notification should NOT reappear as unread

#### Test Case 2: Mark All Notifications as Read
1. Click notification bell icon
2. Click "Mark all as read" button (✓✓ icon)
3. Verify all notifications disappear
4. **REFRESH THE PAGE** (F5)
5. ✅ Expected: No unread notifications should appear

#### Test Case 3: Check Database Directly (Optional)
If you have database access:
```sql
-- Check UserNotifications table
SELECT un.*, n.Title, n.Message 
FROM UserNotifications un
JOIN Notifications n ON un.NotificationId = n.Id
WHERE un.UserId = YOUR_USER_ID
ORDER BY n.Timestamp DESC;

-- IsRead column should be 1 (true) for notifications you marked as read
```

### Step 5: Monitor Console Logs
Open browser DevTools (F12) → Console tab

**Expected logs when marking as read:**
```
✅ Notification {id} marked as read by user {userId}
📊 Unread count updated: {count}
```

**❌ If you see errors like:**
```
POST /api/notifications/... 404 (Not Found)
PUT /api/notifications/... 405 (Method Not Allowed)
```
→ The fix hasn't been applied correctly

---

## 🔍 Debugging Checklist

If notifications still reappear after refresh:

- [ ] Did you clear browser cache/localStorage?
- [ ] Did you rebuild the frontend after pulling changes?
- [ ] Are there any console errors when marking notifications as read?
- [ ] Check Network tab in DevTools:
  - Request URL should be: `/api/notifications/{id}/read` (PUT)
  - Request URL should be: `/api/notifications/mark-all-read` (PUT)
  - Status code should be: 200 OK
- [ ] Is the backend running with latest code?
- [ ] Check browser localStorage:
  ```javascript
  // In console
  console.log('Read notification IDs:', JSON.parse(localStorage.getItem('readNotificationIds') || '[]'));
  ```

---

## 📝 Why It Worked Locally But Not After Merge

**Local environment:**
- Your browser had `localStorage` with read notification IDs
- Even though API calls failed (wrong routes), UI filtered using localStorage
- Seemed to work correctly

**After merge on different machine/session:**
- Fresh localStorage (empty or different)
- API calls still failing due to route mismatch
- DB never updated → notifications always show as unread after refresh

**The fix ensures:**
1. API calls succeed (correct routes + HTTP methods)
2. Database is properly updated (`UserNotification.IsRead = true`)
3. Works consistently across all machines/sessions

---

## 🚀 Next Steps

1. Apply this fix and test
2. Commit and push changes
3. Supervisor pulls and tests with steps above
4. If issue persists, check backend logs for any errors

---

## 📞 Support

If issue continues after applying fix:
1. Share browser console logs (F12 → Console)
2. Share Network tab requests (F12 → Network → filter by "notifications")
3. Share backend logs if accessible