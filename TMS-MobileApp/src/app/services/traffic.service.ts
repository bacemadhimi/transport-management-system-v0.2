import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import * as L from 'leaflet';

export interface TrafficData {
  points: { lat: number; lon: number; intensite: number }[];
  segments: { id: string; couleur: string }[];
  meteo?: {
    description: string;
    temperature: number;
    pluie_mm: number;
    vent_kmh: number;
    visibilite_m: number;
    score_impact: number;
    alerte: boolean;
    message_alerte: string;
  };
  incidents: any[];
  niveau_trafic: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrafficService implements OnDestroy {
  private refreshSubscription?: Subscription;
  private heatLayer: any = null;
  private weatherMarker: L.Marker | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la heatmap du trafic
   */
  getHeatmap(lat: number, lon: number, radius: number = 5000): Observable<TrafficData> {
    return this.http.get<TrafficData>(
      `${environment.apiUrl}/api/Traffic/heatmap`,
      {
        params: {
          lat: lat.toString(),
          lon: lon.toString(),
          radius: radius.toString()
        }
      }
    ).pipe(
      catchError((error) => {
        console.error('❌ Erreur récupération heatmap:', error);
        throw error;
      })
    );
  }

  /**
   * Démarre le rafraîchissement automatique toutes les 2 minutes
   */
  startAutoRefresh(map: L.Map, lat: number, lon: number): void {
    this.refreshTraffic(map, lat, lon);
    
    this.refreshSubscription = interval(120000) // 2 minutes
      .pipe(
        switchMap(() => this.getHeatmap(lat, lon))
      )
      .subscribe({
        next: (data) => this.updateMapWithTraffic(map, data),
        error: (err) => console.error('❌ Erreur auto-refresh trafic:', err)
      });
  }

  /**
   * Rafraîchit manuellement les données trafic
   */
  refreshTraffic(map: L.Map, lat: number, lon: number): void {
    this.getHeatmap(lat, lon).subscribe({
      next: (data) => this.updateMapWithTraffic(map, data),
      error: (err) => console.error('❌ Erreur refresh trafic:', err)
    });
  }

  /**
   * Met à jour la carte avec les données de trafic
   */
  private updateMapWithTraffic(map: L.Map, data: TrafficData): void {
    try {
      // Supprimer l'ancien heat layer
      if (this.heatLayer) {
        map.removeLayer(this.heatLayer);
      }

      // Créer le heatmap avec les points
      if (data.points && data.points.length > 0) {
        const heatPoints = data.points.map(p => [p.lat, p.lon, p.intensite]);
        
        // Vérifier si le plugin heat est disponible
        if ((L as any).heatLayer) {
          this.heatLayer = (L as any).heatLayer(heatPoints, {
            radius: 35,
            blur: 20,
            gradient: {
              0.0: '#00c853',  // Vert (fluide)
              0.3: '#ffd600',  // Jaune (modéré)
              0.6: '#ff6d00',  // Orange (dense)
              1.0: '#d50000'   // Rouge (saturé)
            }
          }).addTo(map);
        }
      }

      // Mettre à jour les segments colorés
      if (data.segments && data.segments.length > 0) {
        this.updateSegments(map, data.segments);
      }

      // Mettre à jour le marqueur météo
      if (data.meteo) {
        this.updateWeatherMarker(map, data.meteo);
      }

      console.log('✓ Carte trafic mise à jour:', data.niveau_trafic);
    } catch (error) {
      console.error('❌ Erreur mise à jour carte trafic:', error);
    }
  }

  /**
   * Met à jour les segments de route colorés
   */
  private updateSegments(map: L.Map, segments: { id: string; couleur: string }[]): void {
    // TODO: Implémenter selon la structure des segments
    console.log('Segments à mettre à jour:', segments.length);
  }

  /**
   * Met à jour le marqueur météo
   */
  private updateWeatherMarker(map: L.Map, meteo: any): void {
    if (this.weatherMarker) {
      map.removeLayer(this.weatherMarker);
    }

    const weatherIcon = L.divIcon({
      html: `
        <div style="
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 12px;
          min-width: 150px;
        ">
          <strong>🌤️ Météo</strong><br/>
          ${meteo.description}<br/>
          🌡️ ${meteo.temperature}°C | 💨 ${meteo.vent_kmh} km/h
          ${meteo.alerte ? '<br/><span style="color: red; font-weight: bold;">⚠️ ' + meteo.message_alerte + '</span>' : ''}
        </div>
      `,
      className: '',
      iconSize: [180, 80]
    });

    // Positionner au centre de la carte
    const center = map.getCenter();
    this.weatherMarker = L.marker([center.lat, center.lng], { icon: weatherIcon })
      .addTo(map);
  }

  /**
   * Met à jour la carte depuis une réponse du chat
   */
  updateWithData(carteData: any, map: L.Map): void {
    if (carteData) {
      this.updateMapWithTraffic(map, carteData);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
}
