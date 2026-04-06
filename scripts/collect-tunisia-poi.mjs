#!/usr/bin/env node

/**
 * Tunisia POI Collection Script - ENRICHED EDITION
 * 
 * Enterprise-grade, 100% free solution to extract ALL Points of Interest
 * from OpenStreetMap via Overpass API - MAXIMUM COVERAGE
 * 
 * Usage: node scripts/collect-tunisia-poi.mjs
 * 
 * Output: frontend/.../assets/tunisia-poi.json
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tunisia bounding box
const TUNISIA_BOUNDS = {
  minLat: 30.0,
  maxLat: 37.5,
  minLon: 7.5,
  maxLon: 12.0
};

// KNOWN STORE CHAINS IN TUNISIA (for brand-based search)
const KNOWN_BRANDS = [
  'Aziza', 'Monoprix', 'Carrefour', 'MG', 'Magasin Général', 'Géant',
  'Bimo', 'Bon Prix', 'Catalina', 'Prodia', 'Sicam', 'Poulina',
  'Délice', 'Vitalait', 'Candia', 'Lactel', 'Danone',
  'Orange', 'Tunisie Télécom', 'Ooredoo',
  'Banque de Tunisie', 'BIAT', 'Amen Bank', 'Attijari Bank', 'STB',
  'Pharmacie', 'Parapharmacie'
];

// ALL categories to extract - MAXIMUM COVERAGE
const CATEGORIES = [
  // ===== SHOPPING (all types) =====
  { key: 'shop', value: 'supermarket', label: 'Supermarkets' },
  { key: 'shop', value: 'convenience', label: 'Convenience Stores' },
  { key: 'shop', value: 'department_store', label: 'Department Stores' },
  { key: 'shop', value: 'mall', label: 'Shopping Malls' },
  { key: 'shop', value: 'general', label: 'General Stores' },
  { key: 'shop', value: 'grocery', label: 'Groceries' },
  { key: 'shop', value: 'food', label: 'Food Stores' },
  { key: 'shop', value: 'wholesale', label: 'Wholesale' },
  { key: 'shop', value: 'variety_store', label: 'Variety Stores' },
  { key: 'shop', value: 'discount', label: 'Discount Stores' },
  { key: 'shop', value: 'butcher', label: 'Butchers' },
  { key: 'shop', value: 'bakery', label: 'Bakeries' },
  { key: 'shop', value: 'pastry', label: 'Pastry Shops' },
  { key: 'shop', value: 'confectionery', label: 'Confectionery' },
  { key: 'shop', value: 'deli', label: 'Delicatessen' },
  { key: 'shop', value: 'cheese', label: 'Cheese Shops' },
  { key: 'shop', value: 'dairy', label: 'Dairy Shops' },
  { key: 'shop', value: 'greengrocer', label: 'Greengrocers' },
  { key: 'shop', value: 'seafood', label: 'Seafood' },
  { key: 'shop', value: 'beverages', label: 'Beverage Shops' },
  { key: 'shop', value: 'alcohol', label: 'Alcohol Shops' },
  { key: 'shop', value: 'wine', label: 'Wine Shops' },
  { key: 'shop', value: 'tea', label: 'Tea Shops' },
  { key: 'shop', value: 'coffee', label: 'Coffee Shops' },
  { key: 'shop', value: 'kiosk', label: 'Kiosks' },
  { key: 'shop', value: 'tobacco', label: 'Tobacco Shops' },
  { key: 'shop', value: 'newsagent', label: 'Newsagents' },
  
  // ===== RETAIL (all types) =====
  { key: 'shop', value: 'clothes', label: 'Clothing Stores' },
  { key: 'shop', value: 'shoes', label: 'Shoe Stores' },
  { key: 'shop', value: 'boutique', label: 'Boutiques' },
  { key: 'shop', value: 'fashion_accessories', label: 'Fashion Accessories' },
  { key: 'shop', value: 'jewelry', label: 'Jewelry Stores' },
  { key: 'shop', value: 'watches', label: 'Watch Stores' },
  { key: 'shop', value: 'perfumery', label: 'Perfumeries' },
  { key: 'shop', value: 'cosmetics', label: 'Cosmetics' },
  { key: 'shop', value: 'beauty', label: 'Beauty Shops' },
  { key: 'shop', value: 'hairdresser_supply', label: 'Hairdresser Supply' },
  { key: 'shop', value: 'electronics', label: 'Electronics' },
  { key: 'shop', value: 'electrical', label: 'Electrical Stores' },
  { key: 'shop', value: 'computer', label: 'Computer Stores' },
  { key: 'shop', value: 'mobile_phone', label: 'Mobile Phone Shops' },
  { key: 'shop', value: 'hifi', label: 'Hi-Fi Stores' },
  { key: 'shop', value: 'television', label: 'Television Stores' },
  { key: 'shop', value: 'appliance', label: 'Appliance Stores' },
  { key: 'shop', value: 'furniture', label: 'Furniture Stores' },
  { key: 'shop', value: 'interior_decoration', label: 'Interior Decoration' },
  { key: 'shop', value: 'hardware', label: 'Hardware Stores' },
  { key: 'shop', value: 'doityourself', label: 'DIY Stores' },
  { key: 'shop', value: 'paint', label: 'Paint Stores' },
  { key: 'shop', value: 'lighting', label: 'Lighting Stores' },
  { key: 'shop', value: 'car_parts', label: 'Car Parts' },
  { key: 'shop', value: 'tyres', label: 'Tire Shops' },
  { key: 'shop', value: 'motorcycle', label: 'Motorcycle Shops' },
  { key: 'shop', value: 'bicycle', label: 'Bicycle Shops' },
  { key: 'shop', value: 'car_repair', label: 'Car Repair' },
  { key: 'shop', value: 'motorcycle_repair', label: 'Motorcycle Repair' },
  { key: 'shop', value: 'books', label: 'Bookstores' },
  { key: 'shop', value: 'stationery', label: 'Stationery Shops' },
  { key: 'shop', value: 'copyshop', label: 'Copy Shops' },
  { key: 'shop', value: 'toys', label: 'Toy Stores' },
  { key: 'shop', value: 'games', label: 'Game Stores' },
  { key: 'shop', value: 'video_games', label: 'Video Game Stores' },
  { key: 'shop', value: 'sports', label: 'Sports Stores' },
  { key: 'shop', value: 'outdoor', label: 'Outdoor Stores' },
  { key: 'shop', value: 'music', label: 'Music Stores' },
  { key: 'shop', value: 'musical_instrument', label: 'Musical Instruments' },
  { key: 'shop', value: 'photo', label: 'Photo Shops' },
  { key: 'shop', value: 'photo_studio', label: 'Photo Studios' },
  { key: 'shop', value: 'gift', label: 'Gift Shops' },
  { key: 'shop', value: 'party', label: 'Party Shops' },
  { key: 'shop', value: 'flowers', label: 'Florists' },
  { key: 'shop', value: 'garden_centre', label: 'Garden Centres' },
  { key: 'shop', value: 'pet', label: 'Pet Shops' },
  { key: 'shop', value: 'optician', label: 'Opticians' },
  { key: 'shop', value: 'medical_supply', label: 'Medical Supplies' },
  { key: 'shop', value: 'chemist', label: 'Chemists' },
  { key: 'shop', value: 'health_food', label: 'Health Food' },
  { key: 'shop', value: 'nutrition_supplements', label: 'Nutrition Supplements' },
  { key: 'shop', value: 'herbalist', label: 'Herbalists' },
  { key: 'shop', value: 'fabric', label: 'Fabric Shops' },
  { key: 'shop', value: 'sewing', label: 'Sewing Shops' },
  { key: 'shop', value: 'tailor', label: 'Tailors' },
  { key: 'shop', value: 'leather', label: 'Leather Shops' },
  { key: 'shop', value: 'carpet', label: 'Carpet Shops' },
  { key: 'shop', value: 'curtain', label: 'Curtain Shops' },
  { key: 'shop', value: 'tiles', label: 'Tile Shops' },
  { key: 'shop', value: 'doors', label: 'Door Shops' },
  { key: 'shop', value: 'bathroom_furnishing', label: 'Bathroom Furnishing' },
  { key: 'shop', value: 'houseware', label: 'Houseware' },
  { key: 'shop', value: 'kitchen', label: 'Kitchen Shops' },
  { key: 'shop', value: 'bed', label: 'Bed Shops' },
  { key: 'shop', value: 'pottery', label: 'Pottery Shops' },
  { key: 'shop', value: 'antiques', label: 'Antique Shops' },
  { key: 'shop', value: 'art', label: 'Art Galleries' },
  { key: 'shop', value: 'craft', label: 'Craft Shops' },
  { key: 'shop', value: 'trade', label: 'Trade Shops' },
  { key: 'shop', value: 'pawnbroker', label: 'Pawnbrokers' },
  { key: 'shop', value: 'bookmaker', label: 'Bookmakers' },
  { key: 'shop', value: 'travel_agency', label: 'Travel Agencies' },
  { key: 'shop', value: 'estate_agent', label: 'Estate Agents' },
  
  // ===== FOOD & DRINK =====
  { key: 'amenity', value: 'restaurant', label: 'Restaurants' },
  { key: 'amenity', value: 'cafe', label: 'Cafes' },
  { key: 'amenity', value: 'fast_food', label: 'Fast Food' },
  { key: 'amenity', value: 'food_court', label: 'Food Courts' },
  { key: 'amenity', value: 'ice_cream', label: 'Ice Cream' },
  { key: 'amenity', value: 'pub', label: 'Pubs' },
  { key: 'amenity', value: 'bar', label: 'Bars' },
  { key: 'amenity', value: 'nightclub', label: 'Nightclubs' },
  
  // ===== HEALTH & MEDICAL =====
  { key: 'amenity', value: 'pharmacy', label: 'Pharmacies' },
  { key: 'amenity', value: 'hospital', label: 'Hospitals' },
  { key: 'amenity', value: 'clinic', label: 'Clinics' },
  { key: 'amenity', value: 'doctors', label: 'Doctors' },
  { key: 'amenity', value: 'dentist', label: 'Dentists' },
  { key: 'amenity', value: 'veterinary', label: 'Veterinarians' },
  
  // ===== EDUCATION =====
  { key: 'amenity', value: 'school', label: 'Schools' },
  { key: 'amenity', value: 'kindergarten', label: 'Kindergartens' },
  { key: 'amenity', value: 'university', label: 'Universities' },
  { key: 'amenity', value: 'college', label: 'Colleges' },
  { key: 'amenity', value: 'language_school', label: 'Language Schools' },
  { key: 'amenity', value: 'driving_school', label: 'Driving Schools' },
  { key: 'amenity', value: 'music_school', label: 'Music Schools' },
  { key: 'amenity', value: 'training', label: 'Training Centers' },
  
  // ===== SERVICES =====
  { key: 'amenity', value: 'bank', label: 'Banks' },
  { key: 'amenity', value: 'bureau_de_change', label: 'Currency Exchange' },
  { key: 'amenity', value: 'atm', label: 'ATMs' },
  { key: 'amenity', value: 'post_office', label: 'Post Offices' },
  { key: 'amenity', value: 'police', label: 'Police Stations' },
  { key: 'amenity', value: 'fire_station', label: 'Fire Stations' },
  { key: 'amenity', value: 'fuel', label: 'Gas Stations' },
  { key: 'amenity', value: 'charging_station', label: 'Charging Stations' },
  { key: 'amenity', value: 'car_wash', label: 'Car Washes' },
  { key: 'amenity', value: 'car_rental', label: 'Car Rentals' },
  { key: 'amenity', value: 'taxi', label: 'Taxi Stands' },
  { key: 'amenity', value: 'parking', label: 'Parking' },
  
  // ===== PUBLIC SERVICES =====
  { key: 'amenity', value: 'townhall', label: 'Town Halls' },
  { key: 'amenity', value: 'courthouse', label: 'Courthouses' },
  { key: 'amenity', value: 'embassy', label: 'Embassies' },
  { key: 'amenity', value: 'library', label: 'Libraries' },
  { key: 'amenity', value: 'community_centre', label: 'Community Centres' },
  { key: 'amenity', value: 'marketplace', label: 'Marketplaces' },
  { key: 'amenity', value: 'place_of_worship', label: 'Places of Worship' },
  { key: 'amenity', value: 'cinema', label: 'Cinemas' },
  { key: 'amenity', value: 'theatre', label: 'Theatres' },
  { key: 'amenity', value: 'arts_centre', label: 'Arts Centres' },
  { key: 'amenity', value: 'museum', label: 'Museums' },
  { key: 'amenity', value: 'gallery', label: 'Galleries' },
  { key: 'amenity', value: 'swimming_pool', label: 'Swimming Pools' },
  { key: 'amenity', value: 'sports_centre', label: 'Sports Centres' },
  { key: 'amenity', value: 'stadium', label: 'Stadiums' },
  
  // ===== ACCOMMODATION =====
  { key: 'tourism', value: 'hotel', label: 'Hotels' },
  { key: 'tourism', value: 'motel', label: 'Motels' },
  { key: 'tourism', value: 'guest_house', label: 'Guest Houses' },
  { key: 'tourism', value: 'hostel', label: 'Hostels' },
  { key: 'tourism', value: 'apartment', label: 'Apartments' },
  { key: 'tourism', value: 'chalet', label: 'Chalets' },
  { key: 'tourism', value: 'camp_site', label: 'Campsites' },
];

// Build Overpass QL query - OPTIMIZED FOR BATCHES
function buildOverpassQuery(categories, batchSize = 10) {
  const batchQueries = [];
  
  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);
    const queries = batch.map(cat => {
      const filter = cat.value === '*' 
        ? `["${cat.key}"]`
        : `["${cat.key}"="${cat.value}"]`;
      
      return `
        node${filter}(${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
        way${filter}(${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      `;
    }).join('\n');

    batchQueries.push(queries);
  }

  return batchQueries.map((queries, idx) => `
    [out:json][timeout:300];
    (${queries});
    out center body qt;
  `);
}

// Build brand-specific queries
function buildBrandQueries() {
  return KNOWN_BRANDS.map(brand => `
    [out:json][timeout:60];
    (
      node["name"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      way["name"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      node["brand"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      way["brand"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      node["operator"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
      way["operator"~"${brand}",i](${TUNISIA_BOUNDS.minLat},${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon});
    );
    out center body qt;
  `);
}

// Execute Overpass query
async function executeOverpassQuery(query, label) {
  // Use Overpass Turbo which supports CORS natively
  const overpassUrl = 'https://overpass-turbo.eu/interpreter';
  
  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      console.error(`❌ ${label}: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error(`❌ ${label} error:`, error.message);
    return [];
  }
}

// Main collection function
async function collectPOI() {
  console.log('🌐 Starting Tunisia POI Collection - ENRICHED EDITION...');
  console.log('📍 Bounds:', TUNISIA_BOUNDS);
  console.log('📊 Categories:', CATEGORIES.length);
  console.log('🏷️ Brands:', KNOWN_BRANDS.length);

  const startTime = Date.now();
  const allElements = [];

  // Step 1: Collect by categories (in batches to avoid timeout)
  console.log('\n📦 Step 1: Collecting by categories...');
  const categoryBatches = buildOverpassQuery(CATEGORIES, 8);
  
  for (let i = 0; i < categoryBatches.length; i++) {
    const batchNum = i + 1;
    console.log(`  ⏳ Batch ${batchNum}/${categoryBatches.length}...`);
    const elements = await executeOverpassQuery(categoryBatches[i], `Category Batch ${batchNum}`);
    allElements.push(...elements);
    console.log(`  ✅ Batch ${batchNum}: ${elements.length} elements`);
    
    // Be polite to Overpass API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 2: Collect by brand names
  console.log('\n🏷️ Step 2: Collecting by brand names...');
  const brandQueries = buildBrandQueries();
  
  for (let i = 0; i < brandQueries.length; i++) {
    const brand = KNOWN_BRANDS[i];
    console.log(`  ⏳ Searching: ${brand}...`);
    const elements = await executeOverpassQuery(brandQueries[i], `Brand: ${brand}`);
    allElements.push(...elements);
    console.log(`  ✅ ${brand}: ${elements.length} elements`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️ Collection completed in ${elapsed}s`);
  console.log(`📦 Total raw elements: ${allElements.length}`);

  // Process and deduplicate
  const processedPOI = [];
  const seen = new Set();

  for (const element of allElements) {
    const tags = element.tags || {};
    if (!tags.name && !tags['name:fr'] && !tags['name:ar'] && !tags.brand && !tags.operator) {
      continue; // Skip unnamed POI
    }

    const lat = element.lat || element.center?.lat;
    const lon = element.lon || element.center?.lon;
    
    if (!lat || !lon) continue;

    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = tags.name || tags['name:fr'] || tags['name:ar'] || tags.brand || tags.operator || 'Unknown';
    
    processedPOI.push({
      id: `${element.type}/${element.id}`,
      name: name.trim(),
      nameFr: tags['name:fr'] || null,
      nameAr: tags['name:ar'] || null,
      type: tags.shop || tags.amenity || tags.tourism || 'unknown',
      subtype: tags.brand || tags.operator || null,
      lat: lat,
      lon: lon,
      city: tags['addr:city'] || tags['addr:suburb'] || null,
      street: tags['addr:street'] || null,
      housenumber: tags['addr:housenumber'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      website: tags.website || tags['contact:website'] || null,
      opening_hours: tags.opening_hours || null,
      wheelchair: tags.wheelchair || null,
    });
  }

  console.log(`\n📊 Processed ${processedPOI.length} unique POI with names`);

  // Group by category for statistics
  const byCategory = {};
  for (const poi of processedPOI) {
    if (!byCategory[poi.type]) byCategory[poi.type] = [];
    byCategory[poi.type].push(poi);
  }

  console.log('\n📈 Top 30 POI by Category:');
  const sorted = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length).slice(0, 30);
  for (const [category, items] of sorted) {
    console.log(`  ${category}: ${items.length}`);
  }

  // Save to JSON file
  const outputPath = join(__dirname, '..', 'frontend', 'transport-management-system-web', 'src', 'assets', 'tunisia-poi.json');
  
  if (!existsSync(dirname(outputPath))) {
    mkdirSync(dirname(outputPath), { recursive: true });
  }

  const outputData = {
    metadata: {
      collectedAt: new Date().toISOString(),
      source: 'Overpass API (OpenStreetMap) - ENRICHED',
      bounds: TUNISIA_BOUNDS,
      totalPOI: processedPOI.length,
      categories: Object.keys(byCategory).length,
      version: '2.0-enriched'
    },
    statistics: Object.fromEntries(
      Object.entries(byCategory).map(([cat, items]) => [cat, items.length])
    ),
    poi: processedPOI
  };

  writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  
  console.log(`\n✅ POI data saved to: ${outputPath}`);
  console.log(`📁 File size: ${(JSON.stringify(outputData).length / 1024).toFixed(0)} KB`);
  console.log('\n🎉 Tunisia POI Collection ENRICHED completed successfully!');
}

// Run
collectPOI();
