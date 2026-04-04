import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

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
  private readonly API_BASE = `${environment.apiUrl}/api/geocoding`;

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
   * Calculer la distance de Levenshtein entre deux chaînes (nombre de modifications nécessaires)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Normaliser un mot : supprimer accents, minuscules, etc.
   */
  private normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]/g, ''); // Garder seulement lettres et chiffres
  }

  /**
   * Vérifier si deux mots sont similaires (tolérance aux fautes)
   */
  private areWordsSimilar(word1: string, word2: string): boolean {
    const normalized1 = this.normalizeWord(word1);
    const normalized2 = this.normalizeWord(word2);

    if (normalized1 === normalized2) return true;
    if (Math.abs(normalized1.length - normalized2.length) > 2) return false;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    // Tolérance : jusqu'à 2 erreurs pour les mots longs, 1 pour les courts
    const maxErrors = maxLength > 6 ? 2 : 1;
    return distance <= maxErrors;
  }

  /**
   * Obtenir des suggestions d'adresses pour une saisie partielle
   * Utilise un proxy CORS pour contourner les restrictions
   * Avec fallback intelligent si aucun résultat
   */
  getAddressSuggestions(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const cleanQuery = query.trim();
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 2);
    
    // Essai 1 : Requête complète
    const fullQuery$ = this.makeNominatimRequest(cleanQuery, 10);
    
    // Essai 2 : Si plusieurs mots, essayer seulement avec la ville (dernier mot)
    const cityOnly$ = words.length > 1 ? 
      this.makeNominatimRequest(words[words.length - 1], 8) : 
      of([]);
    
    // Essai 3 : Si plusieurs mots, essayer avec "supermarché + ville"
    const shopInCity$ = words.length > 1 ? 
      this.makeNominatimRequest(`supermarché ${words[words.length - 1]}`, 5) : 
      of([]);
    
    // Combiner les 3 essais
    return new Observable<AddressSuggestion[]>(observer => {
      forkJoin([fullQuery$, cityOnly$, shopInCity$]).subscribe({
        next: ([fullResults, cityResults, shopResults]) => {
          // Si la requête complète a des résultats, les utiliser
          if (fullResults.length > 0) {
            observer.next(fullResults);
            observer.complete();
            return;
          }
          
          // Sinon combiner ville + shops
          const allResults = [...cityResults, ...shopResults];
          
          // Supprimer doublons
          const uniqueResults = allResults.filter((item, index, self) => 
            index === self.findIndex(i => i.lat === item.lat && i.lng === item.lng)
          );
          
          observer.next(uniqueResults.slice(0, 8));
          observer.complete();
        },
        error: (err) => {
          console.error('Error:', err);
          observer.next([]);
          observer.complete();
        }
      });
    });
  }
  
  /**
   * Faire une requête Nominatim via proxy CORS
   */
  private makeNominatimRequest(query: string, limit: number): Observable<AddressSuggestion[]> {
    const proxyUrl = 'https://corsproxy.io/?';
    const nominatimUrl = `${this.NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1&countrycodes=tn&accept-language=fr`;
    const fullUrl = proxyUrl + encodeURIComponent(nominatimUrl);

    return this.http.get<any>(fullUrl).pipe(
      map(response => {
        if (!response || response.length === 0) return [];
        
        return response.map((item: any) => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          confidence: this.calculateConfidence(item)
        }));
      }),
      catchError(() => of([]))
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