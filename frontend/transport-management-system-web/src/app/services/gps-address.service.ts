import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

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

    // Nettoyer l'adresse
    const cleanAddress = this.cleanAddress(address);

    return this.http.get<any>(`${this.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: cleanAddress,
        format: 'json',
        limit: 1,
        addressdetails: '1',
        countrycodes: 'tn', // Tunisie
        'accept-language': 'fr'
      }
    }).pipe(
      map(response => {
        if (response && response.length > 0) {
          const result = response[0];
          return {
            success: true,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name,
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
   * Utilise Nominatim uniquement avec CORS proxy
   */
  getAddressSuggestions(query: string): Observable<AddressSuggestion[]> {       
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    // Use CORS proxy to avoid browser restrictions
    const proxyUrl = 'https://corsproxy.io/?';
    const nominatimUrl = `${this.NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=tn&accept-language=fr`;
    const fullUrl = proxyUrl + encodeURIComponent(nominatimUrl);

    return this.http.get<any>(fullUrl).pipe(
      map(response => {
        if (!response || response.length === 0) {
          return [];
        }

        return response.map((item: any) => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          confidence: this.calculateConfidence(item)
        })).sort((a: AddressSuggestion, b: AddressSuggestion) => b.confidence - 
a.confidence);
      }),
      catchError(error => {
        console.error('Erreur lors de la recherche de suggestions:', error);    
        return of([]);
      })
    );
  }

  /**
   * Calculer la confiance d'un résultat de géocodage
   */
  private calculateConfidence(item: any): number {
    let confidence = 0;

    // Score basé sur le type de lieu
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

    // Score basé sur la précision
    if (item.importance) {
      confidence += (item.importance * 50);
    }

    // Score basé sur la présence d'informations détaillées
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
    // Supprimer les espaces multiples
    let cleaned = address.replace(/\s+/g, ' ').trim();

    // Normaliser les caractères
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Remplacer les abréviations courantes
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
   */
  getAddressFromCoordinates(lat: number, lng: number): Observable<string> {     
    return this.http.get<any>(`${this.NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'fr'
      }
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

    // Vérification exacte
    if (clean1 === clean2) return true;

    // Vérification partielle (contient les mêmes mots clés)
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

    // Nettoyer l'adresse
    let formatted = this.cleanAddress(address);

    // Capitaliser chaque mot
    formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());

    // Limiter la longueur pour l'affichage
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
