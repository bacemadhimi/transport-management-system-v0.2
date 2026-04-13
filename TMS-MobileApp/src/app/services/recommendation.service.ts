import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RecommendationRequest {
  livraison: {
    id: string;
    rue_depart: string;
    rue_arrivee: string;
    poids_total_kg?: number;
    volume_m3?: number;
    necessite_refrigeration?: boolean;
    distance_km?: number;
  };
  chauffeurs_disponibles: {
    id: string;
    nom: string;
    lat?: number;
    lon?: number;
    heures_restantes?: number;
    livraisons_en_cours?: number;
  }[];
  camions_disponibles: {
    id: string;
    immatriculation: string;
    charge_max_kg?: number;
    volume_max_m3?: number;
    est_frigorifique?: boolean;
    disponible?: boolean;
    controle_technique_valide?: boolean;
  }[];
}

export interface RecommendationResponse {
  chauffeurs: {
    id: string;
    nom: string;
    score: number;
    scores_detail: {
      collaboratif: number;
      contenu: number;
      contextuel: number;
    };
    explication: {
      points_forts: string[];
      points_attention: string[];
    };
  }[];
  camions: {
    id: string;
    immatriculation: string;
    score: number;
    scores_detail: {
      adequation_charge: number;
      efficience: number;
      fiabilite: number;
      proximite: number;
    };
    economie_estimee?: string;
    cout_estime?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {

  constructor(private http: HttpClient) {}

  /**
   * Récupère les recommandations chauffeurs/camions
   */
  getRecommendations(request: RecommendationRequest): Observable<RecommendationResponse> {
    return this.http.post<RecommendationResponse>(
      `${environment.apiUrl}/api/Recommend/assignment`,
      request
    ).pipe(
      catchError((error) => {
        console.error('❌ Erreur récupération recommandations:', error);
        throw error;
      })
    );
  }

  /**
   * Formate l'explication pour l'affichage
   */
  formatExplanation(explication: { points_forts: string[]; points_attention: string[] }): string {
    let text = '';
    
    if (explication.points_forts.length > 0) {
      text += '✅ Points forts:\n';
      explication.points_forts.forEach(point => {
        text += `• ${point}\n`;
      });
    }

    if (explication.points_attention.length > 0) {
      text += '\n⚠️ Points d\'attention:\n';
      explication.points_attention.forEach(point => {
        text += `• ${point}\n`;
      });
    }

    return text;
  }
}
