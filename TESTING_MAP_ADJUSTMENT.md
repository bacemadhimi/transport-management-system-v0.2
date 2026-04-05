# 🧪 Testing Guide - Map Adjustment Feature

## 🎯 Quick Test Plan

### Prerequisites
- Backend server running
- Frontend server running (`npm start`)
- User logged in as Admin

---

## ✅ Test Case 1: Basic Trip Creation (No Map Adjustment)

**Steps:**
1. Navigate to "Create Trip" page
2. Fill in required fields (date, truck, driver, etc.)
3. Search for a destination address:
   - Type: "Avenue Habib Bourguiba, Tunis"
   - Select from suggestions
4. Verify green confirmation appears with coordinates
5. **DO NOT** click "Ajuster la position sur la carte"
6. Complete and submit trip

**Expected Result:**
- ✅ Trip created successfully
- ✅ Original geocoding coordinates saved
- ✅ No errors in console

---

## ✅ Test Case 2: Using Map Adjustment (Drag Marker)

**Steps:**
1. Navigate to "Create Trip" page
2. Fill in required fields
3. Search for a destination address:
   - Type: "Avenue Habib Bourguiba, Tunis"
   - Select from suggestions
4. Click button: **"🗺️ Ajuster la position sur la carte (optionnel)"**
5. Verify map opens with marker on selected address
6. **Drag the marker** to a nearby location (e.g., 50 meters away)
7. Verify yellow info box appears with "Position ajustée"
8. Click **"✅ Utiliser cette position"**
9. Complete and submit trip

**Expected Result:**
- ✅ Map opened successfully with marker
- ✅ Marker was draggable
- ✅ Yellow info box showed new coordinates
- ✅ Trip created with **custom coordinates**
- ✅ Console shows: "📍 Saving manually selected destination coordinates"

---

## ✅ Test Case 3: Using Map Search

**Steps:**
1. Follow steps 1-4 from Test Case 2
2. In the map, locate the **search bar** (top-right corner)
3. Type a specific place: "Cathédrale Saint-Vincent-de-Paul, Tunis"
4. Press **Enter**
5. Verify marker moves to searched location
6. Click **"✅ Utiliser cette position"**
7. Complete and submit trip

**Expected Result:**
- ✅ Search bar visible on map
- ✅ Marker moved to searched location
- ✅ Coordinates updated in yellow info box
- ✅ Trip created with searched coordinates

---

## ✅ Test Case 4: Close Map Without Applying

**Steps:**
1. Follow steps 1-4 from Test Case 2
2. Drag the marker to a new position
3. **DO NOT** click "Utiliser cette position"
4. Click **"❌ Fermer"** button
5. Verify map closes
6. Complete and submit trip

**Expected Result:**
- ✅ Map closed successfully
- ✅ Original coordinates are kept (NOT the dragged position)
- ✅ Trip created with original geocoding coordinates

---

## ✅ Test Case 5: Multiple Open/Close Cycles

**Steps:**
1. Follow steps 1-4 from Test Case 2
2. Drag marker and click "Utiliser cette position"
3. Click "Fermer" to close map
4. Click "Ajuster la position sur la carte" again
5. Verify map reopens with adjusted position
6. Adjust again and apply

**Expected Result:**
- ✅ Map can be reopened after closing
- ✅ Shows last applied position
- ✅ Can adjust multiple times
- ✅ Final position is saved correctly

---

## ✅ Test Case 6: UI/UX Verification

**Check the following:**

### Visual Elements
- [ ] Toggle button has correct icon (🗺️ when closed, ❌ when open)
- [ ] Blue info banner visible with instructions
- [ ] Map has proper border and shadow
- [ ] Search bar in top-right corner of map
- [ ] Marker is draggable (cursor changes to grab hand)
- [ ] Yellow info box appears after dragging
- [ ] Coordinates displayed in monospace font

### Interactions
- [ ] Button hover effects work
- [ ] Smooth animations (fade-in, slide-down)
- [ ] Snackbar notifications appear for:
  - "✅ Position ajustée: lat, lng" (after drag)
  - "✅ Position personnalisée appliquée" (after apply)
  - "✅ Lieu trouvé: address" (after search)

---

## ✅ Test Case 7: Error Handling

**Test 1: Search with no results**
1. Open map adjustment
2. Search for: "xyznonexistentplace12345"
3. Press Enter

**Expected:** Warning message "⚠️ Aucun lieu trouvé"

**Test 2: Very short search**
1. Open map adjustment
2. Search for: "ab"
3. Press Enter

**Expected:** No search triggered (minimum 3 characters)

---

## ✅ Test Case 8: Mobile Responsiveness

**Steps:**
1. Open Create Trip page on mobile browser (or Chrome DevTools mobile view)
2. Select destination address
3. Open map adjustment

**Expected Result:**
- ✅ Map scales properly on smaller screens
- ✅ Search bar is accessible
- ✅ Marker is draggable on touch devices
- ✅ Buttons stack vertically if needed

---

## 🔍 Console Verification

Open browser DevTools (F12) and check Console tab during tests:

**Expected Logs:**
```
📍 Saving destination coordinates for trip: {tripId} {coords}
✅ Geocoding result: {coords}
📍 Getting destination from end location dropdown: {location}
```

**No errors should appear!**

---

## 🐛 Common Issues & Solutions

### Issue 1: Map doesn't show
**Solution:** Check browser console for errors. Verify Leaflet CSS is loaded.

### Issue 2: Marker not draggable
**Solution:** Verify `draggable: true` in marker initialization. Check for JS errors.

### Issue 3: Search doesn't work
**Solution:** Check network tab for Nominatim API calls. Verify internet connection.

### Issue 4: Coordinates not saved
**Solution:** Verify "Utiliser cette position" was clicked. Check `customDestinationCoords` is not null.

---

## 📊 Success Criteria

All test cases should pass with:
- ✅ No console errors
- ✅ Correct coordinates saved to database
- ✅ Smooth user experience
- ✅ No regression in existing features

---

## 🎉 Feature Complete!

If all tests pass, the feature is ready for production! 🚀

**Next Steps:**
1. Test with real trip creation flow
2. Verify mobile app shows correct coordinates
3. Get user feedback
4. Monitor usage analytics (optional)

---

**Last Updated:** April 5, 2026  
**Status:** ✅ Ready for Testing
