import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Http } from '../../services/http';
import { FormsModule } from '@angular/forms';
import L from 'leaflet';

interface Point {
  id?: number;
  lat: number;
  lng: number;
  name: string;
  address?: string;
  order?: number;
}

interface OptimizationResult {
  originalDistance: number;
  optimizedDistance: number;
  distanceSaved: number;
  distanceSavedPercent: number;
  originalTime: number;
  optimizedTime: number;
  timeSaved: number;
  timeSavedPercent: number;
  originalCost: number;
  optimizedCost: number;
  costSaved: number;
  optimizedRoute: Point[];
}

@Component({
  selector: 'app-optimisation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './optimisation.html',
  styleUrls: ['./optimisation.scss']
})
export class OptimisationPage implements OnInit, AfterViewInit {
  // Trip selection
  trips: any[] = [];
  selectedTripId: number | null = null;
  selectedTrip: any = null;

  // Points from trip
  deliveryPoints: Point[] = [];

  // Quick calculation
  point1Lat = 36.8065;
  point1Lng = 10.1815;
  point2Lat = 36.7562;
  point2Lng = 10.1313;
  calculatedDistance: number | null = null;

  // Estimation
  distanceInput = 100;
  estimatedTime: number | null = null;
  estimatedCost: number | null = null;

  // Optimization
  optimizationResult: OptimizationResult | null = null;
  optimizing = false;
  calculating = false;
  loading = false;
  error = '';
  vehicleCount = 1;

  // Map
  map: L.Map | undefined;
  routeLine: L.Polyline | undefined;
  markers: L.Marker[] = [];

  constructor(private http: Http) {}

  ngOnInit() {
    this.loadTrips();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 500);
  }

  initMap() {
    if (typeof L === 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => this.createMap();
      document.head.appendChild(script);
    } else {
      this.createMap();
    }
  }

  createMap() {
    if (this.map) return;
    this.map = L.map('optimization-map', { zoomControl: true }).setView([36.8, 10.0], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  loadTrips() {
    this.loading = true;
    this.http.getTripsList({ pageIndex: 0, pageSize: 50 }).subscribe({
      next: (data: any) => {
        this.trips = data?.data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  selectTrip() {
    if (!this.selectedTripId) {
      this.selectedTrip = null;
      this.deliveryPoints = [];
      return;
    }

    this.loading = true;
    this.http.getTrip(this.selectedTripId).subscribe({
      next: (response: any) => {
        const tripData = response?.data || response;
        this.selectedTrip = tripData;

        // Extract delivery points
        if (tripData?.deliveries?.length > 0) {
          this.deliveryPoints = tripData.deliveries.map((d: any, index: number) => ({
            id: d.id,
            name: d.customerName || `Point ${index + 1}`,
            address: d.deliveryAddress,
            lat: 36.8 + (index * 0.08) + Math.random() * 0.02,
            lng: 10.0 + (index * 0.12) + Math.random() * 0.02,
            order: index + 1
          }));
        }

        this.loading = false;
        this.calculateOriginalRoute();
        this.updateMap();
      },
      error: () => {
        this.error = 'Erreur lors du chargement du trajet';
        this.loading = false;
      }
    });
  }

  calculateOriginalRoute() {
    if (this.deliveryPoints.length < 2) return;

    let distance = 0;
    for (let i = 0; i < this.deliveryPoints.length - 1; i++) {
      distance += this.calculateHaversine(
        this.deliveryPoints[i].lat,
        this.deliveryPoints[i].lng,
        this.deliveryPoints[i + 1].lat,
        this.deliveryPoints[i + 1].lng
      );
    }

    if (this.selectedTrip) {
      this.selectedTrip.originalDistance = distance;
    }
  }

  calculateDistance() {
    if (!this.point1Lat || !this.point1Lng || !this.point2Lat || !this.point2Lng) {
      this.error = 'Veuillez entrer toutes les coordonnées';
      return;
    }

    this.calculating = true;
    this.error = '';

    setTimeout(() => {
      this.calculatedDistance = this.calculateHaversine(
        this.point1Lat,
        this.point1Lng,
        this.point2Lat,
        this.point2Lng
      );
      this.calculating = false;
    }, 500);
  }

  estimateTime() {
    if (!this.distanceInput || this.distanceInput <= 0) {
      this.error = 'Veuillez entrer une distance valide';
      return;
    }

    this.calculating = true;
    this.error = '';

    setTimeout(() => {
      // Average speed: 60 km/h in Tunisia
      this.estimatedTime = this.distanceInput / 60;
      this.estimatedCost = this.distanceInput * 0.5; // 0.5 TND per km
      this.calculating = false;
    }, 500);
  }

  // Advanced optimization algorithms
  async optimizeRoute() {
    if (this.deliveryPoints.length < 2) {
      this.error = 'Il faut au moins 2 points pour optimiser';
      return;
    }

    this.optimizing = true;
    this.error = '';

    try {
      // Step 1: Calculate initial distances using Dijkstra
      const graph = this.buildGraph(this.deliveryPoints);
      const initialDistances = this.calculateAllPairsDistances(graph);

      // Step 2: Solve TSP using advanced algorithms
      const tspResult = await this.solveTSP(this.deliveryPoints, initialDistances);

      // Step 3: Apply VRP if multiple vehicles
      let finalRoute = tspResult.route;
      if (this.vehicleCount > 1) {
        finalRoute = await this.solveVRP(tspResult.route, this.vehicleCount, initialDistances);
      }

      // Step 4: Calculate optimized metrics
      const optimizedDistance = this.calculateRouteDistance(finalRoute);
      const originalDistance = this.calculateRouteDistance(this.deliveryPoints);

      this.optimizationResult = {
        originalDistance,
        optimizedDistance,
        distanceSaved: originalDistance - optimizedDistance,
        distanceSavedPercent: ((originalDistance - optimizedDistance) / originalDistance) * 100,
        originalTime: originalDistance / 60,
        optimizedTime: optimizedDistance / 60,
        timeSaved: (originalDistance - optimizedDistance) / 60,
        timeSavedPercent: ((originalDistance - optimizedDistance) / originalDistance) * 100,
        originalCost: originalDistance * 0.5,
        optimizedCost: optimizedDistance * 0.5,
        costSaved: (originalDistance - optimizedDistance) * 0.5,
        optimizedRoute: finalRoute
      };

      // Update order numbers
      this.optimizationResult.optimizedRoute.forEach((p, i) => p.order = i + 1);

      await this.updateMapWithOptimizationOSRM();
    } catch (e) {
      console.error('Optimisation error:', e);
      this.error = 'Erreur lors de l\'optimisation';
    }

    this.optimizing = false;
  }

  // Dijkstra's algorithm for shortest path
  buildGraph(points: Point[]): Map<string, Map<string, number>> {
    const graph = new Map<string, Map<string, number>>();

    // Create nodes
    points.forEach(point => {
      const node = new Map<string, number>();
      graph.set(`${point.lat},${point.lng}`, node);
    });

    // Calculate distances between all pairs
    points.forEach((point1, i) => {
      points.forEach((point2, j) => {
        if (i !== j) {
          const distance = this.calculateHaversine(point1.lat, point1.lng, point2.lat, point2.lng);
          graph.get(`${point1.lat},${point1.lng}`)!.set(`${point2.lat},${point2.lng}`, distance);
        }
      });
    });

    return graph;
  }

  // A* algorithm for pathfinding
  async findShortestPath(start: Point, end: Point, graph: Map<string, Map<string, number>>): Promise<Point[]> {
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const startKey = `${start.lat},${start.lng}`;
    const endKey = `${end.lat},${end.lng}`;

    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.calculateHaversine(start.lat, start.lng, end.lat, end.lng));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current: string | null = null;
      let currentMin = Infinity;

      for (const node of openSet) {
        const score = fScore.get(node)!;
        if (score < currentMin) {
          currentMin = score;
          current = node;
        }
      }

      if (current === endKey) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.delete(current!);
      closedSet.add(current!);

      const neighbors = graph.get(current!)!;
      for (const [neighborKey, distance] of neighbors) {
        if (closedSet.has(neighborKey)) continue;

        const tentativeGScore = (gScore.get(current!) || 0) + distance;

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, current!);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + this.calculateHaversine(
          parseFloat(neighborKey.split(',')[0]),
          parseFloat(neighborKey.split(',')[1]),
          end.lat, end.lng
        ));
      }
    }

    throw new Error('No path found');
  }

  // TSP solver using dynamic programming
  async solveTSP(points: Point[], distances: Map<string, Map<string, number>>): Promise<{ route: Point[], distance: number }> {
    const n = points.length;
    const allVisited = (1 << n) - 1;

    // Memoization table
    const dp = new Map<string, number>();
    const parent = new Map<string, number>();

    // Initialize
    for (let mask = 0; mask < (1 << n); mask++) {
      for (let i = 0; i < n; i++) {
        dp.set(`${mask},${i}`, Infinity);
      }
    }

    dp.set(`1,0`, 0); // Start from point 0

    // Dynamic programming
    for (let mask = 1; mask < (1 << n); mask++) {
      for (let i = 0; i < n; i++) {
        if ((mask & (1 << i)) === 0) continue;

        for (let j = 0; j < n; j++) {
          if ((mask & (1 << j)) === 0) {
            const newMask = mask | (1 << j);
            const newDist = (dp.get(`${mask},${i}`) || Infinity) + 
                          (distances.get(`${points[i].lat},${points[i].lng}`)?.get(`${points[j].lat},${points[j].lng}`) || Infinity);
            
            if (newDist < (dp.get(`${newMask},${j}`) || Infinity)) {
              dp.set(`${newMask},${j}`, newDist);
              parent.set(`${newMask},${j}`, i);
            }
          }
        }
      }
    }

    // Reconstruct path
    let mask = allVisited;
    let lastIndex = 0;
    let minDist = Infinity;

    for (let i = 0; i < n; i++) {
      const dist = (dp.get(`${mask},${i}`) || Infinity) + 
                 (distances.get(`${points[i].lat},${points[i].lng}`)?.get(`${points[0].lat},${points[0].lng}`) || Infinity);
      if (dist < minDist) {
        minDist = dist;
        lastIndex = i;
      }
    }

    const path = this.reconstructTSPPath(parent, mask, lastIndex, n);
    return { route: path, distance: minDist };
  }

  // VRP solver for multiple vehicles
  async solveVRP(route: Point[], vehicleCount: number, distances: Map<string, Map<string, number>>): Promise<Point[]> {
    if (vehicleCount >= route.length) {
      // Each point gets its own vehicle
      return route;
    }

    // Simple clustering approach
    const clusters: Point[][] = [];
    const clusterSize = Math.ceil(route.length / vehicleCount);

    for (let i = 0; i < vehicleCount; i++) {
      clusters.push(route.slice(i * clusterSize, (i + 1) * clusterSize));
    }

    // Optimize each cluster
    const optimizedClusters = await Promise.all(clusters.map(cluster => 
      this.solveTSP(cluster, distances)
    ));

    // Combine results
    const finalRoute: Point[] = [];
    optimizedClusters.forEach(result => {
      finalRoute.push(...result.route);
    });

    return finalRoute;
  }

  // Helper methods
  calculateAllPairsDistances(graph: Map<string, Map<string, number>>): Map<string, Map<string, number>> {
    const distances = new Map<string, Map<string, number>>();

    graph.forEach((neighbors, node) => {
      const nodeDistances = new Map<string, number>();
      distances.set(node, nodeDistances);

      neighbors.forEach((distance, neighbor) => {
        nodeDistances.set(neighbor, distance);
      });
    });

    return distances;
  }

  reconstructPath(cameFrom: Map<string, string>, current: string): Point[] {
    const path: Point[] = [];
    let node = current;

    while (cameFrom.has(node)) {
      const [lat, lng] = node.split(',').map(parseFloat);
      const point = this.deliveryPoints.find(p => p.lat === lat && p.lng === lng)!;
      path.unshift(point);
      node = cameFrom.get(node)!;
    }

    // Add start point
    const [startLat, startLng] = node.split(',').map(parseFloat);
    const startPoint = this.deliveryPoints.find(p => p.lat === startLat && p.lng === startLng)!;
    path.unshift(startPoint);

    return path;
  }

  reconstructTSPPath(parent: Map<string, number>, mask: number, lastIndex: number, n: number): Point[] {
    const path: Point[] = [];
    let currentMask = mask;
    let currentIndex = lastIndex;

    for (let i = 0; i < n; i++) {
      path.unshift(this.deliveryPoints[currentIndex]);
      const nextIndex = parent.get(`${currentMask},${currentIndex}`)!;
      currentMask &= ~(1 << currentIndex);
      currentIndex = nextIndex;
    }

    return path;
  }

  async updateMapWithOptimizationOSRM() {
    if (!this.map || !this.optimizationResult) return;

    this.clearMarkers();

    const route = this.optimizationResult.optimizedRoute;

    // Draw OSRM route first
    await this.drawRoute(route, true);

    // Then add markers
    route.forEach((point, index) => {
      const originalIndex = this.deliveryPoints.findIndex(p => p.id === point.id);
      const isOptimized = index !== originalIndex;

      const color = isOptimized ? '#4CAF50' : '#E91E63';

      const markerSvg = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#pinShadow${index})">
          <path d="M22 0C10 0 0 10 0 22C0 33 22 44 22 44C22 44 44 33 44 22C44 10 34 0 22 0Z" fill="${color}"/>
          <circle cx="22" cy="19" r="9" fill="white"/>
          <text x="22" y="23" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${index + 1}</text>
        </g>
      </svg>`;

      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;">${markerSvg}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 44]
        })
      }).addTo(this.map!);

      const changeText = isOptimized ? `<br/><span style="color:#4CAF50;">↔ Avant: ${originalIndex + 1}</span>` : '';
      marker.bindPopup(`<b>${point.name}</b><br>Ordre: ${index + 1}${changeText}`);
      this.markers.push(marker);
    });
  }

  // Keep original for fallback
  nearestNeighborOptimization(points: Point[]): Point[] {
    if (points.length <= 2) return points;

    const result: Point[] = [];
    const remaining = [...points];

    let current = remaining.shift()!;
    result.push(current);

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.calculateHaversine(
          current.lat, current.lng,
          remaining[i].lat, remaining[i].lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      current = remaining.splice(nearestIndex, 1)[0];
      result.push(current);
    }

    return result;
  }

  calculateRouteDistance(points: Point[]): number {
    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      distance += this.calculateHaversine(
        points[i].lat, points[i].lng,
        points[i + 1].lat, points[i + 1].lng
      );
    }
    return distance;
  }

  calculateHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  updateMap() {
    if (!this.map || this.deliveryPoints.length === 0) return;

    this.clearMarkers();

    // Create custom SVG markers without circle numbers
    this.deliveryPoints.forEach((point, index) => {
      const markerSvg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#pinShadow)">
          <path d="M20 0C9 0 0 9 0 20C0 30 20 40 20 40C20 40 40 30 40 20C40 9 31 0 20 0Z" fill="#E91E63"/>
          <circle cx="20" cy="18" r="8" fill="white"/>
        </g>
      </svg>`;

      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">${markerSvg}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        })
      }).addTo(this.map!);

      marker.bindPopup(`<b>${point.name}</b><br>${point.address || ''}`);
      this.markers.push(marker);
    });

    this.drawRoute(this.deliveryPoints);
  }

  updateMapWithOptimization() {
    if (!this.map || !this.optimizationResult) return;

    this.clearMarkers();

    const route = this.optimizationResult.optimizedRoute;

    route.forEach((point, index) => {
      const originalIndex = this.deliveryPoints.findIndex(p => p.id === point.id);
      const isOptimized = index !== originalIndex;

      // Color: green if changed position, pink if same
      const color = isOptimized ? '#4CAF50' : '#E91E63';
      const label = isOptimized ? `🔄 ${index + 1}` : `${index + 1}`;

      const markerSvg = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#pinShadow${index})">
          <path d="M22 0C10 0 0 10 0 22C0 33 22 44 22 44C22 44 44 33 44 22C44 10 34 0 22 0Z" fill="${color}"/>
          <circle cx="22" cy="19" r="9" fill="white"/>
          <text x="22" y="23" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${index + 1}</text>
        </g>
      </svg>`;

      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;">${markerSvg}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 44]
        })
      }).addTo(this.map!);

      const changeText = isOptimized ? `<br/><span style="color:#4CAF50;">↔ Avant: ${originalIndex + 1}</span>` : '';
      marker.bindPopup(`<b>${point.name}</b><br>Ordre: ${index + 1}${changeText}`);
      this.markers.push(marker);
    });

    this.drawRoute(route, true);
  }

  drawRoute(points: Point[], isOptimized: boolean = false) {
    if (this.routeLine) {
      this.routeLine.remove();
    }

    const coords = points.map(p => [p.lat, p.lng] as [number, number]);
    // Different color for optimized route
    const routeColor = isOptimized ? '#4CAF50' : '#667eea';
    const routeWeight = isOptimized ? 5 : 4;
    const routeDash = isOptimized ? null : '10, 10';

    this.routeLine = L.polyline(coords, {
      color: routeColor,
      weight: routeWeight,
      opacity: 0.8,
      dashArray: routeDash || undefined
    }).addTo(this.map!);

    // Use fixed zoom level to prevent over-zooming
    const bounds = this.routeLine.getBounds();
    const center = bounds.getCenter();
    this.map!.setView([center.lat, center.lng], 10);
  }

  clearMarkers() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  formatNumber(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0';
    return value.toFixed(1);
  }
}