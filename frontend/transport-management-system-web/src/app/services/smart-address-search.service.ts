import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GeocodingSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  displayName?: string;
  type?: string;
  importance?: number;
}

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  displayName?: string;
  city?: string;
  country?: string;
  postcode?: string;
  accuracy?: number;
  source: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmartAddressSearchService {
  // ✅ Utiliser le endpoint backend proxy au lieu de Nominatim direct
  private readonly GEOCODING_API_URL = `${environment.apiUrl}/api/geocoding`;

  // Cache pour éviter les requêtes répétées
  private cacheWithExpiry = new Map<string, { result: GeocodingResult, expiresAt: number }>();
  private readonly cacheDuration = 24 * 60 * 60 * 1000; // 24 heures

  constructor(private http: HttpClient) {}

  /**
   * Recherche d'adresses avec suggestions (pour autocomplete)
   * Avec debounce intégré
   */
  searchSuggestions(query: string, limit: number = 5): Observable<GeocodingSuggestion[]> {
    if (!query || query.length < 3) {
      return of([]);
    }

    return of(query).pipe(
      debounceTime(300),
      switchMap(q => this.performSearch(q, limit)),
      shareReplay(1)
    );
  }

  /**
   * Géocoder une adresse (texte → coordonnées)
   * ✅ Utilise le endpoint backend proxy
   */
  geocodeAddress(address: string): Observable<GeocodingResult | null> {
    const cached = this.getCached(address);
    if (cached) {
      console.log('Cache hit for:', address);
      return of(cached);
    }

    // ✅ Appel au backend proxy
    return this.http.get<any[]>(`${this.GEOCODING_API_URL}/search`, {
      params: { q: address, limit: 1 }
    }).pipe(
      switchMap(results => {
        if (!results || results.length === 0) {
          return of(null);
        }

        const result = this.parseResult(results[0], address);
        this.setCache(address, result);
        return of(result);
      }),
      catchError(error => {
        console.error('Geocoding error:', error);
        return of(null);
      })
    );
  }

  /**
   * Reverse geocoding (coordonnées → adresse)
   * ✅ Utilise le endpoint backend proxy
   */
  reverseGeocode(latitude: number, longitude: number): Observable<GeocodingResult | null> {
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    const cached = this.getCached(cacheKey);
    if (cached) {
      return of(cached);
    }

    // ✅ Appel au backend proxy
    return this.http.get<any>(`${this.GEOCODING_API_URL}/reverse`, {
      params: { lat: latitude.toString(), lon: longitude.toString() }
    }).pipe(
      switchMap(data => {
        if (!data || !data.display_name) {
          return of(null);
        }

        const result: GeocodingResult = {
          address: data.display_name,
          latitude,
          longitude,
          displayName: data.display_name,
          source: 'Backend Reverse'
        };

        if (data.address) {
          result.city = data.address.city || data.address.town || data.address.village;
          result.country = data.address.country;
          result.postcode = data.address.postcode;
        }

        this.setCache(cacheKey, result);
        return of(result);
      }),
      catchError(error => {
        console.error('Reverse geocoding error:', error);
        return of(null);
      })
    );
  }

  private performSearch(query: string, limit: number): Observable<GeocodingSuggestion[]> {
    // ✅ Appel au backend proxy
    return this.http.get<any[]>(`${this.GEOCODING_API_URL}/search`, {
      params: { q: query, limit: limit.toString() }
    }).pipe(
      switchMap(results => {
        if (!results) {
          return of([]);
        }
        return of(results.map(r => this.parseSuggestion(r)));
      }),
      catchError(error => {
        console.error('Search error:', error);
        return of([]);
      })
    );
  }

  private parseResult(element: any, originalAddress: string): GeocodingResult {
    const result: GeocodingResult = {
      address: originalAddress,
      latitude: parseFloat(element.lat),
      longitude: parseFloat(element.lon),
      displayName: element.display_name,
      source: 'Backend Geocoding'
    };

    if (element.address) {
      result.city = element.address.city || element.address.town;
      result.country = element.address.country;
      result.postcode = element.address.postcode;
    }

    return result;
  }

  private parseSuggestion(element: any): GeocodingSuggestion {
    return {
      address: element.display_name || '',
      latitude: parseFloat(element.lat),
      longitude: parseFloat(element.lon),
      displayName: element.display_name,
      type: element.type,
      importance: element.importance
    };
  }

  private getCached(key: string): GeocodingResult | null {
    const cached = this.cacheWithExpiry.get(key.toLowerCase());
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
    this.cacheWithExpiry.delete(key.toLowerCase());
    return null;
  }

  private setCache(key: string, result: GeocodingResult): void {
    this.cacheWithExpiry.set(key.toLowerCase(), {
      result,
      expiresAt: Date.now() + this.cacheDuration
    });
  }
}
