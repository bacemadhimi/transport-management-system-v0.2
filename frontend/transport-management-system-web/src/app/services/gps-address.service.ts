import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AddressValidationResult {
  success: boolean;
  lat?: number;
  lng?: number;
  address?: string;
  error?: string;
}

interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class GpsAddressService {
  private readonly OSRM_BASE_URL = 'https://router.project-osrm.org';
  // ✅ Utiliser le endpoint backend proxy au lieu de Nominatim direct + corsproxy.io
  private readonly GEOCODING_API_URL = `${environment.apiUrl}/api/geocoding`;

  constructor(private http: HttpClient) {}

  /**
   * Valider et normaliser une adresse en obtenant les coordonnées précises
   */
  validateAndNormalizeAddress(address: string): Observable<AddressValidationResult> {
    if (!address || address.trim().length === 0) {
      return of({
        success: false,
        error: 'Adresse vide'
      });
    }

    const cleanAddress = this.cleanAddress(address);

    // ✅ Appel au backend proxy au lieu de Nominatim direct
    return this.http.get<any>(`${this.GEOCODING_API_URL}/geocode`, {
      params: { address: cleanAddress }
    }).pipe(
      map(response => {
        if (response && response.lat && response.lon) {
          return {
            success: true,
            lat: parseFloat(response.lat),
            lng: parseFloat(response.lon),
            address: response.display_name || cleanAddress,
            error: undefined
          };
        }

        return {
          success: false,
          error: 'Adresse non trouvée'
        };
      }),
      catchError(error => {
        console.error('Erreur de géocodage:', error);
        return of({
          success: false,
          error: 'Erreur de géocodage: ' + error.message
        });
      })
    );
  }

  /**
   * Obtenir des suggestions d'adresses pour une saisie partielle
   * ✅ Utilise le endpoint backend proxy, avec fallback direct si échec
   */
  getAddressSuggestions(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    // Essayer d'abord le backend proxy
    return this.http.get<any[]>(`${this.GEOCODING_API_URL}/search`, {
      params: { q: query, limit: 5 }
    }).pipe(
      map(response => {
        if (!response || response.length === 0) {
          return [];
        }
        return response.map((item: any) => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          confidence: this.calculateConfidence(item)
        })).sort((a: AddressSuggestion, b: AddressSuggestion) => b.confidence - a.confidence);
      }),
      catchError(backendError => {
        console.warn('⚠️ Backend geocoding failed, trying direct Nominatim:', backendError.message);
        // Fallback: appel direct à Nominatim si le backend échoue
        return this.http.get<any[]>(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=tn&accept-language=fr`,
          { headers: { 'User-Agent': 'TMS-App/1.0' } }
        ).pipe(
          map(response => {
            if (!response || response.length === 0) return [];
            return response.map((item: any) => ({
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              confidence: this.calculateConfidence(item)
            })).sort((a: AddressSuggestion, b: AddressSuggestion) => b.confidence - a.confidence);
          }),
          catchError(directError => {
            console.error('❌ Direct Nominatim also failed:', directError);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Calculer la confiance d'un résultat de géocodage
   */
  private calculateConfidence(item: any): number {
    let confidence = 0;

    const typeScores: { [key: string]: number } = {
      'building': 100,
      'address': 95,
      'street': 85,
      'suburb': 70,
      'city': 60,
      'state': 40,
      'country': 20
    };

    confidence += typeScores[item.type] || 50;

    if (item.importance) {
      confidence += (item.importance * 50);
    }

    if (item.address && item.address.house_number) {
      confidence += 10;
    }
    if (item.address && item.address.road) {
      confidence += 5;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Nettoyer et normaliser une adresse
   */
  private cleanAddress(address: string): string {
    let cleaned = address.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const replacements: { [key: string]: string } = {
      ' av ': ' avenue ',
      ' ave ': ' avenue ',
      ' rue ': ' rue ',
      ' imp ': ' impasse ',
      ' pl ': ' place ',
      ' bd ': ' boulevard ',
      ' blvd ': ' boulevard '
    };

    Object.entries(replacements).forEach(([from, to]) => {
      cleaned = cleaned.replace(new RegExp(from, 'gi'), to);
    });

    return cleaned;
  }

  /**
   * Obtenir l'adresse à partir de coordonnées (reverse geocoding)
   * ✅ Utilise le endpoint backend proxy
   */
  getAddressFromCoordinates(lat: number, lng: number): Observable<string> {
    return this.http.get<any>(`${this.GEOCODING_API_URL}/reverse`, {
      params: { lat: lat.toString(), lon: lng.toString() }
    }).pipe(
      map(response => {
        if (response && response.display_name) {
          return response.display_name;
        }
        return `Coordonnées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }),
      catchError(error => {
        console.error('Erreur de reverse geocoding:', error);
        return of(`Coordonnées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      })
    );
  }

  /**
   * Vérifier si deux adresses sont similaires
   */
  areAddressesSimilar(address1: string, address2: string): boolean {
    if (!address1 || !address2) return false;

    const clean1 = this.cleanAddress(address1).toLowerCase();
    const clean2 = this.cleanAddress(address2).toLowerCase();

    if (clean1 === clean2) return true;

    const words1 = clean1.split(' ').filter(w => w.length > 2);
    const words2 = clean2.split(' ').filter(w => w.length > 2);

    const commonWords = words1.filter(word => words2.includes(word));

    return commonWords.length >= Math.max(2, Math.min(words1.length, words2.length) * 0.6);
  }

  /**
   * Formater une adresse pour l'affichage
   */
  formatAddressForDisplay(address: string): string {
    if (!address) return 'Adresse inconnue';

    let formatted = this.cleanAddress(address);
    formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());

    if (formatted.length > 100) {
      formatted = formatted.substring(0, 97) + '...';
    }

    return formatted;
  }

  /**
   * Obtenir les coordonnées précises pour une destination de voyage
   */
  getTripDestinationCoordinates(tripId: number): Observable<{ lat: number, lng: number, address: string }> {
    return this.http.get<any>(`api/gps/trip-destination/${tripId}?forceGeocode=true`).pipe(
      map(response => {
        if (response && response.destinationLatitude && response.destinationLongitude) {
          return {
            lat: response.destinationLatitude,
            lng: response.destinationLongitude,
            address: response.destinationAddress || 'Destination inconnue'
          };
        }

        throw new Error('Coordonnées de destination non disponibles');
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des coordonnées de destination:', error);
        throw error;
      })
    );
  }

  /**
   * Mettre à jour les coordonnées d'une destination dans la base de données
   */
  updateTripDestinationCoordinates(tripId: number, lat: number, lng: number, address: string): Observable<boolean> {
    return this.http.put<any>(`api/gps/trip-destination/${tripId}`, {
      latitude: lat,
      longitude: lng,
      address: address
    }).pipe(
      map(response => {
        return response && response.success === true;
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour des coordonnées:', error);
        return of(false);
      })
    );
  }
}
