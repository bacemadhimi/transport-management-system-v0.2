# 🐛 Debug Guide - Map Adjustment Coordinates Not Showing on Mobile

## 📋 Problem
Admin adjusts position on map → clicks "Utiliser cette position" → creates trip → but mobile shows ORIGINAL position, not adjusted one.

---

## 🔍 What Should Happen (Correct Flow)

### **Step 1: Admin selects address**
```
Console:
✅ Destination selected with valid coordinates: {lat: 36.8123, lng: 10.1234, address: "..."}
```

### **Step 2: Admin opens map and adjusts position**
```
Console:
🗺️ Opening map adjustment with coordinates: {lat: 36.8123, lng: 10.1234}
🗺️ Initializing map at: {lat: 36.8123, lng: 10.1234}
📍 Marker dragged to: {lat: 36.8156, lng: 10.1289}
```

### **Step 3: Admin clicks "Utiliser cette position"**
```
Console:
✅ Position personnalisée appliquée
```

**At this point in code:**
```typescript
this.selectedDestinationCoords = {
  lat: 36.8156,  // Adjusted value
  lng: 10.1289,  // Adjusted value
  address: "New address from adjusted position"
}
```

### **Step 4: Admin creates trip**
```
Console:
🚀 Creating trip with coordinates: {
  lat: 36.8156,
  lng: 10.1289,
  address: "New address from adjusted position",
  isCustom: true,
  selectedDestinationCoords: {lat: 36.8156, lng: 10.1289},
  customDestinationCoords: {lat: 36.8156, lng: 10.1289}
}
```

### **Step 5: Backend saves coordinates**
```
Console:
📍 TRIP CREATED - Saving destination coordinates (may be adjusted) for trip: 58
📍 SELECTED coords: {lat: 36.8156, lng: 10.1289}
📍 CUSTOM coords (if adjusted): {lat: 36.8156, lng: 10.1289}
📍 Final position being saved: {lat: 36.8156, lng: 10.1289}
📍 Saving FINAL destination coordinates for trip: 58
📱 Mobile app will display these exact coordinates
✅ Destination coordinates saved successfully to backend
```

### **Step 6: Mobile app loads trip**
```
Mobile Console:
📦 Trip details received: {
  data: {
    destinationLatitude: 36.8156,
    destinationLongitude: 10.1289,
    ...
  }
}
✅ Destination loaded from trip coordinates
```

---

## 🔧 How to Debug

### **Test this sequence:**

1. **Open Create Trip page**
2. **Fill in required fields**
3. **Search for address** → Select one
   - Note the coordinates shown in green box: `lat: XXX, lng: XXX`

4. **Click "🗺️ Ajuster la position sur la carte"**
5. **Drag marker to NEW position** (far from original, e.g., 1km away)
   - Note the NEW coordinates in yellow box: `lat: YYY, lng: YYY`

6. **Click "✅ Utiliser cette position"**
   - You should see snackbar: "✅ Position personnalisée appliquée"

7. **Create the trip**
8. **Watch the console carefully!**

**You should see (in order):**
```
🚀 Creating trip with coordinates: {lat: YYY, lng: YYY, isCustom: true}
📍 TRIP CREATED - Saving destination coordinates for trip: XX
📍 SELECTED coords: {lat: YYY, lng: YYY}
📍 CUSTOM coords: {lat: YYY, lng: YYY}
📍 Final position being saved: {lat: YYY, lng: YYY}
📍 Saving FINAL destination coordinates for trip: XX
📱 Mobile app will display these exact coordinates
✅ Destination coordinates saved successfully to backend
```

---

## 🎯 What to Check

### **Check 1: Are adjusted coordinates in selectedDestinationCoords?**
When you click "Utiliser cette position", open browser console and type:
```javascript
// Check what's in selectedDestinationCoords
console.log('selectedDestinationCoords:', this.selectedDestinationCoords);
```

**Expected:** Should show the ADJUSTED coordinates (YYY), not original (XXX)

### **Check 2: Is createTripData using adjusted coordinates?**
When "Créer le voyage" is clicked, look for:
```
🚀 Creating trip with coordinates: {lat: YYY, lng: YYY, isCustom: true}
```

**Expected:** `lat` and `lng` should match the ADJUSTED position

### **Check 3: Is saveDestinationCoordinates using adjusted coordinates?**
Look for:
```
📍 SELECTED coords: {lat: YYY, lng: YYY}
📍 Final position being saved: {lat: YYY, lng: YYY}
```

**Expected:** Should show ADJUSTED coordinates

---

## 📱 Mobile App Side

### **What mobile app does:**

The mobile app (`gps-tracking.page.ts`) uses this priority:

1. **Strategy 1**: `trip.destinationLatitude` + `trip.destinationLongitude`
   - This is what we're saving!
   
2. **Strategy 2**: `trip.deliveries[last].geolocation`

3. **Strategy 3**: Geocode `trip.deliveries[last].deliveryAddress`

4. **Strategy 4-7**: Various fallbacks

**If Strategy 1 fails**, it falls back to delivery address which might be the ORIGINAL address!

### **Check on mobile:**
When GPS tracking starts, check mobile console for:
```
📦 Trip details received: {data: {...}}
```

Look for:
- `destinationLatitude`: Should be YYY (adjusted)
- `destinationLongitude`: Should be YYY (adjusted)

---

## 🐛 Possible Issues & Solutions

### **Issue 1: Coordinates not updated when clicking "Utiliser cette position"**
**Symptom:** Console shows original coordinates (XXX) instead of adjusted (YYY)

**Fix:** Check `applyCustomPosition()` method - it should copy `customDestinationCoords` to `selectedDestinationCoords`

### **Issue 2: Backend not saving adjusted coordinates**
**Symptom:** Console shows adjusted coordinates but mobile shows original

**Check:** Backend logs - look for:
```
✅ Destination coordinates saved for trip XX: YYY, YYY
```

**Fix:** Backend might be using wrong field (should use `EndLatitude/EndLongitude`)

### **Issue 3: Mobile reading from wrong field**
**Symptom:** Mobile console shows it's using Strategy 2+ instead of Strategy 1

**Check:** Mobile console for:
```
⚠️ No destination coordinates, falling back to...
```

**Fix:** Ensure `trip.destinationLatitude` is not null/undefined in the response

---

## 📊 Backend Data Flow

```
Frontend sends:
{
  destinationLatitude: YYY,
  destinationLongitude: YYY,
  destinationAddress: "..."
}
    ↓
TripsController.cs (CreateTrip)
Maps to:
{
  EndLatitude: YYY,
  EndLongitude: YYY
}
    ↓
Saved to database
    ↓
Mobile requests: GET /api/Trips/{id}
    ↓
TripsController.cs (GetTripById)
Returns:
{
  destinationLatitude: YYY,  // Mapped from EndLatitude
  destinationLongitude: YYY  // Mapped from EndLongitude
}
    ↓
Mobile displays YYY ✅
```

---

## ✅ Success Criteria

When everything works correctly:
1. ✅ Console shows adjusted coordinates in ALL logs
2. ✅ Backend saves adjusted coordinates to `EndLatitude/EndLongitude`
3. ✅ Mobile receives adjusted coordinates in `destinationLatitude/destinationLongitude`
4. ✅ Mobile marker appears at adjusted position (YYY)

---

**Last Updated:** April 5, 2026  
**Status:** 🔍 Debugging - Awaiting test results
