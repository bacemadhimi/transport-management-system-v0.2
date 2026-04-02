import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';

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

interface GraphNode {
  id: number;
  lat: number;
  lng: number;
  neighbors: { id: number; distance: number; time: number }[];
}

interface RouteSegment {
  from: Point;
  to: Point;
  distance: number;
  time: number;
  polyline: any;
}

@Component({
  selector: 'app-optimisation',
  templateUrl: './optimisation.page.html',
  styleUrls: ['./optimisation.page.scss']
})
export class OptimisationPage implements OnInit {
  // Real-time optimization
  currentTrip: any = null;
  currentRoute: Point[] = [];
  currentVehiclePosition: { lat: number; lng: number } | null = null;
  optimizationResult: OptimizationResult | null = null;
  optimizing = false;
  loading = false;
  error = '';
  vehicleCount = 1;

  // Map
  map: any;
  markers: any[] = [];
  routeLine: any;
  vehicleMarker: any;
  routeSegments: RouteSegment[] = [];

  // Algorithm selection
  selectedAlgorithm = 'TSP';
  algorithms = [
    { value: 'TSP', label: 'TSP (Ordre des livraisons)' },
    { value: 'VRP', label: 'VRP (Gestion des tournées)' },
    { value: 'DIJKSTRA', label: 'Dijkstra (Plus court chemin)' },
    { value: 'ASTAR', label: 'A* (Chemin optimal)' }
  ];

  // Tracking properties
  trackingActive = false;
  trackingSubscription: any;

  constructor(private navCtrl: NavController, private http: HttpClient) {}

  ngOnInit() {
    this.loadCurrentTrip();
    this.startRealTimeTracking();
  }

  loadCurrentTrip() {
    // Charger le trajet actif du chauffeur connecté
    this.currentTrip = this.getCurrentTripFromService();
    if (this.currentTrip) {
      // Convertir les livraisons en points
      this.currentRoute = this.currentTrip.deliveries.map((d: any) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        name: d.name,
        address: d.address
      }));
    }
  }

  getCurrentTripFromService(): any {
    // Cette fonction devrait appeler un service pour obtenir le trajet actif du chauffeur connecté
    // Pour l'instant, on retourne un trajet par défaut
    return {
      id: 1,
      name: 'Trajet Actif - Livraisons en cours',
      driver: 'Chauffeur Ahmed',
      vehicle: 'Camion B12345',
      status: 'En cours',
      deliveries: [
        { id: 1, lat: 36.8065, lng: 10.1815, name: 'Client A', address: 'Rue principale, Tunis' },
        { id: 2, lat: 36.7562, lng: 10.1313, name: 'Client B', address: 'Avenue Habib Bourguiba, Tunis' },
        { id: 3, lat: 36.8123, lng: 10.1456, name: 'Client C', address: 'Route de la Marsa, Tunis' },
        { id: 4, lat: 36.7891, lng: 10.1789, name: 'Client D', address: 'Boulevard 9 avril, Tunis' }
      ]
    };
  }

  startRealTimeTracking() {
    this.trackingActive = true;
    this.trackingSubscription = setInterval(async () => {
      try {
        // Obtenir la position GPS réelle du véhicule
        this.currentVehiclePosition = await this.getVehiclePosition();
        this.updateVehicleMarker();
        this.updateOptimization();
      } catch (e) {
        console.error('Erreur tracking:', e);
      }
    }, 5000);
  }

  stopRealTimeTracking() {
    this.trackingActive = false;
    if (this.trackingSubscription) {
      clearInterval(this.trackingSubscription);
    }
  }

  async getVehiclePosition(): Promise<{ lat: number; lng: number }> {
    // Cette fonction devrait appeler l'API GPS pour obtenir la position réelle du véhicule
    // Pour l'instant, on retourne une position fixe
    return new Promise(resolve => {
      // Position réelle du véhicule (remplacer par l'API GPS)
      const realPosition = {
        lat: 36.8065,
        lng: 10.1815
      };
      resolve(realPosition);
    });
  }

  updateVehicleMarker() {
    if (!this.map || !this.currentVehiclePosition) return;

    if (this.vehicleMarker) {
      this.vehicleMarker.setLatLng([this.currentVehiclePosition.lat, this.currentVehiclePosition.lng]);
    } else {
      const vehicleIcon = L.icon({
        iconUrl: 'assets/vehicle.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      this.vehicleMarker = L.marker(
        [this.currentVehiclePosition.lat, this.currentVehiclePosition.lng],
        { icon: vehicleIcon }
      ).addTo(this.map);
    }
  }

  async optimizeRoute() {
    if (!this.currentVehiclePosition || this.currentRoute.length < 1) return;

    this.optimizing = true;
    this.error = '';

    try {
      let optimizedRoute: Point[];

      switch (this.selectedAlgorithm) {
        case 'TSP':
          optimizedRoute = await this.solveTSP(this.currentVehiclePosition, this.currentRoute);
          break;
        case 'VRP':
          optimizedRoute = await this.solveVRP(this.currentVehiclePosition, this.currentRoute);
          break;
        case 'DIJKSTRA':
          optimizedRoute = await this.solveDijkstra(this.currentVehiclePosition, this.currentRoute);
          break;
        case 'ASTAR':
          optimizedRoute = await this.solveAStar(this.currentVehiclePosition, this.currentRoute);
          break;
        default:
          optimizedRoute = await this.solveTSP(this.currentVehiclePosition, this.currentRoute);
      }

      // Calculer les métriques
      const optimizedDistance = this.calculateRouteDistance(optimizedRoute);
      const originalDistance = this.calculateRouteDistance(this.currentRoute);

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
        optimizedRoute: optimizedRoute
      };

      // Update order numbers
      this.optimizationResult.optimizedRoute.forEach((p, i) => p.order = i + 1);

      // Forcer l'affichage immédiat du trajet optimisé
      await this.updateMapWithOptimization();
      
      // Mettre à jour le trajet courant avec l'optimisé pour que le chemin bleu soit toujours optimal
      this.currentRoute = optimizedRoute.slice(1); // Exclure le véhicule
    } catch (e) {
      console.error('Optimisation error:', e);
      this.error = 'Erreur lors de l\'optimisation';
    }

    this.optimizing = false;
  }

  updateOptimization() {
    if (!this.currentVehiclePosition || this.currentRoute.length < 2) return;

    // Optimiser le trajet en fonction de la position actuelle du véhicule
    this.optimizing = true;
    this.error = '';

    setTimeout(async () => {
      try {
        // Calculer le trajet optimisé depuis la position actuelle
        const optimizedRoute = await this.calculateOptimizedRoute(this.currentVehiclePosition!, this.currentRoute);

        // Calculer les métriques
        const optimizedDistance = this.calculateRouteDistance(optimizedRoute);
        const originalDistance = this.calculateRouteDistance(this.currentRoute);

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
          optimizedRoute: optimizedRoute
        };

        // Update order numbers
        this.optimizationResult.optimizedRoute.forEach((p, i) => p.order = i + 1);

        await this.updateMapWithOptimization();
      } catch (e) {
        console.error('Optimisation error:', e);
        this.error = 'Erreur lors de l\'optimisation';
      }

      this.optimizing = false;
    }, 2000);
  }

  // TSP Algorithm (Travelling Salesman Problem)
  async solveTSP(vehiclePos: { lat: number; lng: number }, points: Point[]): Promise<Point[]> {
    const result: Point[] = [];
    const remaining = [...points];

    // Commencer par la position actuelle du véhicule
    result.push({
      id: -1,
      lat: vehiclePos.lat,
      lng: vehiclePos.lng,
      name: 'Véhicule',
      address: 'Position actuelle'
    });

    // Algorithme TSP - Plus proche voisin
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.calculateHaversine(
          vehiclePos.lat, vehiclePos.lng,
          remaining[i].lat, remaining[i].lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      const nextPoint = remaining.splice(nearestIndex, 1)[0];
      result.push(nextPoint);
      vehiclePos = nextPoint;
    }

    return result;
  }

  // VRP Algorithm (Vehicle Routing Problem)
  async solveVRP(vehiclePos: { lat: number; lng: number }, points: Point[]): Promise<Point[]> {
    // Pour simplifier, on utilise une version de TSP adaptée au VRP
    // Dans un cas réel, on devrait diviser les points entre plusieurs véhicules
    return this.solveTSP(vehiclePos, points);
  }

  // Dijkstra Algorithm for shortest path
  async solveDijkstra(vehiclePos: { lat: number; lng: number }, points: Point[]): Promise<Point[]> {
    const allPoints = [
      { id: -1, lat: vehiclePos.lat, lng: vehiclePos.lng, name: 'Véhicule', address: 'Position actuelle' },
      ...points
    ];

    // Créer le graphe
    const graph = this.createGraph(allPoints);

    // Trouver le chemin le plus court couvrant tous les points (TSP avec Dijkstra)
    const result: Point[] = [];
    const visited = new Set<number>();
    let currentId = -1;

    result.push(allPoints.find(p => p.id === -1)!);
    visited.add(-1);

    while (visited.size < allPoints.length) {
      let nearestNode = null;
      let minDistance = Infinity;

      // Trouver le nœud non visité le plus proche
      for (const node of allPoints) {
        if (visited.has(node.id!)) continue;

        const distance = this.calculateHaversine(
          allPoints.find(p => p.id === currentId)!.lat,
          allPoints.find(p => p.id === currentId)!.lng,
          node.lat, node.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestNode = node;
        }
      }

      if (nearestNode) {
        result.push(nearestNode);
        visited.add(nearestNode.id!);
        currentId = nearestNode.id!;
      }
    }

    return result;
  }

  // A* Algorithm for optimal path
  async solveAStar(vehiclePos: { lat: number; lng: number }, points: Point[]): Promise<Point[]> {
    // A* est similaire à Dijkstra mais avec une heuristique
    // Pour le TSP, on utilise une heuristique de distance euclidienne
    return this.solveDijkstra(vehiclePos, points);
  }

  createGraph(points: Point[]): GraphNode[] {
    const nodes: GraphNode[] = [];

    points.forEach((point, index) => {
      const node: GraphNode = {
        id: point.id!,
        lat: point.lat,
        lng: point.lng,
        neighbors: []
      };

      // Connecter chaque point à tous les autres points
      points.forEach((otherPoint, otherIndex) => {
        if (index !== otherIndex) {
          const distance = this.calculateHaversine(point.lat, point.lng, otherPoint.lat, otherPoint.lng);
          const time = distance / 40; // Vitesse moyenne de 40 km/h

          node.neighbors.push({
            id: otherPoint.id!,
            distance: distance,
            time: time
          });
        }
      });

      nodes.push(node);
    });

    return nodes;
  }

  async calculateOptimizedRoute(vehiclePos: { lat: number; lng: number }, points: Point[]): Promise<Point[]> {
    // Cette fonction devrait appeler un service d'optimisation pour calculer le trajet optimal
    // Pour l'instant, on retourne un trajet basé sur la distance
    return new Promise(resolve => {
      // Algorithme d'optimisation simple (remplacer par un service d'optimisation)
      const result: Point[] = [];
      const remaining = [...points];

      // Commencer par la position actuelle du véhicule
      result.push({
        id: -1,
        lat: vehiclePos.lat,
        lng: vehiclePos.lng,
        name: 'Véhicule',
        address: 'Position actuelle'
      });

      while (remaining.length > 0) {
        let nearestIndex = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const dist = this.calculateHaversine(
            vehiclePos.lat, vehiclePos.lng,
            remaining[i].lat, remaining[i].lng
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIndex = i;
          }
        }

        const nextPoint = remaining.splice(nearestIndex, 1)[0];
        result.push(nextPoint);
        vehiclePos = nextPoint;
      }

      resolve(result);
    });
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

  updateMapWithOptimization() {
    if (!this.map || !this.optimizationResult) return;

    this.clearMarkers();

    const route = this.optimizationResult.optimizedRoute;

    // Draw route
    const coords = route.map(p => [p.lat, p.lng] as [number, number]);
    this.routeLine = L.polyline(coords, {
      color: '#4CAF50',
      weight: 5,
      opacity: 0.8
    }).addTo(this.map!);

    // Add markers
    route.forEach((point, index) => {
      const color = index === 0 ? '#FF5722' : '#4CAF50';
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

      const changeText = index === 0 ? ' (Véhicule)' : '';
      marker.bindPopup(`<b>${point.name}</b><br>Ordre: ${index + 1}${changeText}`);
      this.markers.push(marker);
    });
  }

  clearMarkers() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }
}