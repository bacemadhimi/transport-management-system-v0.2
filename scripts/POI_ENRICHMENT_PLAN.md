# 🗺️ Tunisia POI Enrichment Pipeline

## 📋 Overview

Enterprise-grade, 100% free solution to collect and index ALL Points of Interest (POI) in Tunisia for the GPS Map Adjustment feature.

---

## 🎯 Solution Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Overpass API Query (collect all POI)            │
│ → Queries OpenStreetMap database directly               │
│ → Extracts shops, supermarkets, pharmacies, schools, etc│
│ → Saves to tunisia-poi.json (local cache)               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Local JSON Index (fast search)                  │
│ → 100% free, no API calls needed for search             │
│ → Full-text search by name, city, category              │
│ → Updated manually or via cron job                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Frontend Integration (trip-form.ts)             │
│ → Searches local JSON first                             │
│ → Falls back to Nominatim if not found                  │
│ → NO changes to existing structure                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

### Phase 1: Data Collection Script (Node.js)
- `scripts/collect-tunisia-poi.mjs` - Extracts all POI from Overpass
- Runs in < 2 minutes
- Saves to `frontend/.../assets/tunisia-poi.json`

### Phase 2: Search Integration
- Modify ONLY `searchOnMap()` in `trip-form.ts`
- Search local JSON first (instant)
- Fallback to Nominatim (existing behavior)

### Phase 3: Automated Updates
- GitHub Actions workflow to refresh data weekly
- Manual script for on-demand updates

---

## 📊 Expected POI Coverage

Based on Overpass data for Tunisia:
- ~500-1000 supermarkets (Aziza, Monoprix, MG, Carrefour, etc.)
- ~3000+ shops and stores
- ~2000+ pharmacies
- ~5000+ schools
- ~10,000+ total POI across all categories

---

## ✅ Benefits

- **100% Free**: Overpass API has no limits or API keys
- **Enterprise-grade**: Same data used by major logistics companies
- **No external dependencies after collection**: Search works offline
- **Always improvable**: Run script anytime to get fresh data
- **Zero cost**: No paid APIs, no subscriptions

---

## ⏱️ Maintenance

- **Run weekly**: `node scripts/collect-tunisia-poi.mjs`
- **Auto-update**: GitHub Actions cron job (optional)
- **Manual additions**: Add missing POI to `tunisia-poi-manual.json`

---

**Status**: 📋 Plan approved, ready for implementation
