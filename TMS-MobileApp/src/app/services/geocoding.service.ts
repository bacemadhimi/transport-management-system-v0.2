import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

export interface GeocodingResult {
  success: boolean;
  lat?: number;
  lng?: number;
  address?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly OSM_API_URL = 'https://nominatim.openstreetmap.org/search';
  private readonly OSM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

  constructor(private http: HttpClient) {}

  /**
   * Obtenir des suggestions d'adresses à partir d'une chaîne de recherche
   */
  getAddressSuggestions(query: string, limit: number = 5): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const params = {
      q: query.trim(),
      format: 'json',
      limit: limit.toString(),
      countrycodes: 'tn', // Tunisie
      addressdetails: '1',
      'accept-language': 'fr'
    };

    return this.http.get<any[]>(this.OSM_API_URL, { params }).pipe(
      map(results => {
        return results.map(result => ({
          id: result.place_id,
          label: result.display_name,
          address: this.formatAddress(result.address),
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          city: result.address.city || result.address.town || result.address.village,
          country: result.address.country
        }));
      }),
      catchError(error => {
        console.error('Erreur géocodage:', error);
        return of([]);
      })
    );
  }

  /**
   * Convertir des coordonnées GPS en adresse (reverse geocoding)
   */
  reverseGeocode(lat: number, lng: number): Observable<GeocodingResult> {
    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'fr'
    };

    return this.http.get<any>(this.OSM_REVERSE_URL, { params }).pipe(
      map(result => ({
        success: true,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        error: undefined
      })),
      catchError(error => {
        console.error('Erreur reverse géocodage:', error);
        return of({
          success: false,
          error: 'Impossible de convertir les coordonnées en adresse'
        });
      })
    );
  }

  /**
   * Convertir une adresse en coordonnées GPS (geocoding)
   */
  geocodeAddress(address: string): Observable<GeocodingResult> {
    const params = {
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'tn',
      addressdetails: '1',
      'accept-language': 'fr'
    };

    return this.http.get<any[]>(this.OSM_API_URL, { params }).pipe(
      map(results => {
        if (results && results.length > 0) {
          const result = results[0];
          return {
            success: true,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name,
            error: undefined
          };
        } else {
          return {
            success: false,
            error: 'Adresse non trouvée'
          };
        }
      }),
      catchError(error => {
        console.error('Erreur géocodage:', error);
        return of({
          success: false,
          error: 'Erreur lors de la conversion de l\'adresse'
        });
      })
    );
  }

  /**
   * Formater une adresse à partir des détails d'adresse OSM
   */
  private formatAddress(address: any): string {
    if (!address) return '';

    const parts = [];
    
    if (address.road) parts.push(address.road);
    if (address.house_number) parts.push(address.house_number);
    if (address.city) parts.push(address.city);
    else if (address.town) parts.push(address.town);
    else if (address.village) parts.push(address.village);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);

    return parts.join(', ');
  }

  /**
   * Valider et normaliser une adresse
   */
  validateAndNormalizeAddress(address: string): Observable<GeocodingResult> {
    return this.geocodeAddress(address).pipe(
      map(result => {
        if (result.success) {
          // Vérifier que les coordonnées sont valides pour la Tunisie
          if (this.isValidTunisiaLocation(result.lat!, result.lng!)) {
            return result;
          } else {
            return {
              success: false,
              error: 'L\'adresse semble être en dehors de la Tunisie'
            };
          }
        }
        return result;
      })
    );
  }

  /**
   * Vérifier si les coordonnées sont en Tunisie
   */
  private isValidTunisiaLocation(lat: number, lng: number): boolean {
    // Bornes approximatives de la Tunisie
    const minLat = 30.0;
    const maxLat = 37.5;
    const minLng = 7.5;
    const maxLng = 12.0;

    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  /**
   * Obtenir les coordonnées précises pour une adresse complète
   */
  getExactCoordinates(address: string): Observable<{ lat: number; lng: number; formattedAddress: string }> {
    return this.geocodeAddress(address).pipe(
      map(result => {
        if (result.success) {
          return {
            lat: result.lat!,
            lng: result.lng!,
            formattedAddress: result.address!
          };
        } else {
          throw new Error(result.error || 'Erreur inconnue');
        }
      })
    );
  }
}
