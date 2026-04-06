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
   */
  getAddressSuggestions(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    return this.http.get<any>(`${this.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        addressdetails: '1',
        countrycodes: 'tn',
        'accept-language': 'fr'
      }
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
   * Utilise proxy CORS + fallback base locale si Nominatim échoue
   */
  getAddressFromCoordinates(lat: number, lng: number): Observable<string> {
    const proxyUrl = 'https://corsproxy.io/?';
    const nominatimUrl = `${this.NOMINATIM_BASE_URL}/reverse?lat=${lat.toString()}&lon=${lng.toString()}&format=json&addressdetails=1&accept-language=fr`;
    const fullUrl = proxyUrl + encodeURIComponent(nominatimUrl);

    return this.http.get<any>(fullUrl).pipe(
      map(response => {
        if (response && response.display_name) {
          return response.display_name;
        }
        // Fallback: essayer de trouver un lieu proche dans la base locale
        const localAddress = this.findNearestLocalPOI(lat, lng);
        if (localAddress) {
          return localAddress;
        }
        return `Coordonnées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }),
      catchError(error => {
        console.error('Erreur de reverse geocoding:', error);
        // Fallback: essayer de trouver un lieu proche dans la base locale
        const localAddress = this.findNearestLocalPOI(lat, lng);
        if (localAddress) {
          return of(localAddress);
        }
        return of(`Coordonnées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      })
    );
  }

  /**
   * Trouver le POI local le plus proche (fallback si Nominatim échoue)
   */
  private findNearestLocalPOI(lat: number, lng: number): string | null {
    // Base locale étendue - mêmes adresses que le web
    const KNOWN_POI = [
      // Tajerouine
      { name: 'Aziza Tajerouine Centre, Avenue Habib Bourguiba, Tajerouine', lat: 35.5140, lng: 8.6550 },
      { name: 'Aziza Tajerouine Nord, Cité El Amel, Tajerouine', lat: 35.5160, lng: 8.6570 },
      { name: 'Magasin General Tajerouine, Avenue Habib Bourguiba, Tajerouine', lat: 35.5140, lng: 8.6550 },
      { name: 'Hôpital Régional Tajerouine, Rue de l\'Hôpital, Tajerouine', lat: 35.5155, lng: 8.6545 },
      { name: 'Centre de Santé de Base Tajerouine', lat: 35.5135, lng: 8.6540 },
      { name: 'École Primaire Tajerouine, Rue de l\'École', lat: 35.5145, lng: 8.6555 },
      { name: 'Lycée Secondaire Tajerouine, Rue du Lycée', lat: 35.5150, lng: 8.6565 },
      { name: 'Pharmacie Centrale Tajerouine, Rue Principale', lat: 35.5142, lng: 8.6552 },
      { name: 'Avenue Habib Bourguiba, Tajerouine', lat: 35.5140, lng: 8.6550 },
      { name: 'Cité El Amel, Tajerouine', lat: 35.5160, lng: 8.6570 },
      { name: 'Rue Principale, Tajerouine', lat: 35.5150, lng: 8.6560 },
      
      // Grand Tunis
      { name: 'Aziza La Marsa Centre, Avenue Habib Bourguiba, La Marsa', lat: 36.8790, lng: 10.3250 },
      { name: 'Aziza Carthage Salammbô, Rue de la Plage', lat: 36.8525, lng: 10.3235 },
      { name: 'Aziza Ariana Centre, Avenue de la République', lat: 36.8625, lng: 10.1955 },
      { name: 'Magasin General La Marsa, Avenue Habib Bourguiba', lat: 36.8785, lng: 10.3245 },
      { name: 'Magasin General Tunis Centre, Avenue Habib Bourguiba, Tunis', lat: 36.8065, lng: 10.1815 },
      { name: 'Magasin General Ariana, Avenue de la République', lat: 36.8620, lng: 10.1950 },
      { name: 'Carrefour Market Lac 1, Les Berges du Lac', lat: 36.8380, lng: 10.2440 },
      { name: 'Carrefour Market Lac 2, Les Berges du Lac 2', lat: 36.8440, lng: 10.2570 },
      { name: 'Monoprix Tunis Lafayette, Avenue de Paris', lat: 36.8050, lng: 10.1800 },
      
      // Sousse
      { name: 'Aziza Sousse Centre, Avenue Habib Bourguiba', lat: 35.8295, lng: 10.6385 },
      { name: 'Magasin General Sousse, Avenue Habib Bourguiba', lat: 35.8290, lng: 10.6380 },
      { name: 'Monoprix Sousse, Avenue Habib Bourguiba', lat: 35.8280, lng: 10.6370 },
      
      // Sfax
      { name: 'Aziza Sfax Centre, Rue Habib Maazoun', lat: 34.7405, lng: 10.7605 },
      { name: 'Magasin General Sfax, Route de Tunis', lat: 34.7400, lng: 10.7600 },
      { name: 'Monoprix Sfax, Rue Habib Maazoun', lat: 34.7390, lng: 10.7590 },
      
      // Bizerte
      { name: 'Aziza Bizerte Centre, Rue de la République', lat: 37.2745, lng: 9.8745 },
      { name: 'Magasin General Bizerte, Rue de la République', lat: 37.2740, lng: 9.8740 },
      
      // Nabeul
      { name: 'Aziza Nabeul Centre, Avenue Habib Bourguiba', lat: 36.4565, lng: 10.7375 },
      { name: 'Magasin General Nabeul, Avenue Habib Bourguiba', lat: 36.4560, lng: 10.7370 },
      
      // Gabes
      { name: 'Aziza Gabes Centre, Avenue Habib Bourguiba', lat: 33.8875, lng: 10.0985 },
      { name: 'Magasin General Gabes, Avenue Habib Bourguiba', lat: 33.8870, lng: 10.0980 },
      
      // Kairouan
      { name: 'Aziza Kairouan Centre, Avenue de la République', lat: 35.6785, lng: 10.0965 },
      { name: 'Magasin General Kairouan, Avenue de la République', lat: 35.6780, lng: 10.0960 },
      
      // Béja
      { name: 'Aziza Béja Centre, Avenue Habib Bourguiba', lat: 36.7265, lng: 9.1845 },
      { name: 'Magasin General Béja, Avenue Habib Bourguiba', lat: 36.7260, lng: 9.1840 },
      
      // Jendouba
      { name: 'Aziza Jendouba Centre, Avenue Habib Bourguiba', lat: 36.5065, lng: 8.7815 },
      { name: 'Magasin General Jendouba, Avenue Habib Bourguiba', lat: 36.5060, lng: 8.7810 },
      
      // Le Kef
      { name: 'Aziza El Kef Centre, Avenue Habib Bourguiba', lat: 36.1745, lng: 8.7055 },
      { name: 'Magasin General Le Kef, Avenue Habib Bourguiba', lat: 36.1740, lng: 8.7050 },
      
      // Siliana
      { name: 'Aziza Siliana Centre, Avenue Habib Bourguiba', lat: 36.0855, lng: 9.3705 },
      { name: 'Magasin General Siliana, Avenue Habib Bourguiba', lat: 36.0850, lng: 9.3700 },
      
      // Kasserine
      { name: 'Aziza Kasserine Centre, Avenue de la République', lat: 35.1675, lng: 8.8365 },
      { name: 'Magasin General Kasserine, Avenue de la République', lat: 35.1670, lng: 8.8360 },
      
      // Sidi Bouzid
      { name: 'Aziza Sidi Bouzid Centre, Avenue Habib Bourguiba', lat: 35.0385, lng: 9.4855 },
      { name: 'Magasin General Sidi Bouzid, Avenue Habib Bourguiba', lat: 35.0380, lng: 9.4850 },
      
      // Gafsa
      { name: 'Aziza Gafsa Centre, Avenue Habib Bourguiba', lat: 34.4255, lng: 8.7845 },
      { name: 'Magasin General Gafsa, Avenue Habib Bourguiba', lat: 34.4250, lng: 8.7840 },
      
      // Tozeur
      { name: 'Aziza Tozeur Centre, Avenue Habib Bourguiba', lat: 33.9195, lng: 8.1335 },
      { name: 'Magasin General Tozeur, Avenue Habib Bourguiba', lat: 33.9190, lng: 8.1330 },
      
      // Médenine
      { name: 'Aziza Médenine Centre, Avenue Habib Bourguiba', lat: 33.3555, lng: 10.5055 },
      { name: 'Magasin General Médenine, Avenue Habib Bourguiba', lat: 33.3550, lng: 10.5050 },
      
      // Tataouine
      { name: 'Aziza Tataouine, Avenue de la République', lat: 32.9295, lng: 10.4515 },
      { name: 'Magasin General Tataouine, Avenue de la République', lat: 32.9290, lng: 10.4510 },
      
      // Monastir
      { name: 'Aziza Monastir Centre, Avenue de l\'Indépendance', lat: 35.7775, lng: 10.8265 },
      { name: 'Magasin General Monastir, Avenue de l\'Indépendance', lat: 35.7770, lng: 10.8260 },
      
      // Mahdia
      { name: 'Aziza Mahdia Centre, Avenue Habib Bourguiba', lat: 35.5045, lng: 11.0625 },
      { name: 'Magasin General Mahdia, Avenue Habib Bourguiba', lat: 35.5040, lng: 11.0620 },
      
      // Zaghouan
      { name: 'Aziza Zaghouan Centre, Avenue Habib Bourguiba', lat: 36.4035, lng: 10.1435 },
      { name: 'Magasin General Zaghouan, Avenue Habib Bourguiba', lat: 36.4030, lng: 10.1430 },
      
      // Ben Arous
      { name: 'Aziza Ben Arous, Avenue Habib Bourguiba', lat: 36.7475, lng: 10.2185 },
      { name: 'Magasin General Ben Arous, Avenue Habib Bourguiba', lat: 36.7470, lng: 10.2180 },
      
      // Manouba
      { name: 'Aziza Manouba, Avenue Habib Bourguiba', lat: 36.8085, lng: 10.0985 },
      { name: 'Magasin General Manouba, Centre-ville', lat: 36.8080, lng: 10.0980 },
    ];

    // Trouver le POI le plus proche (dans un rayon de 2km)
    let nearestPOI: any = null;
    let minDistance = 0.02; // ~2km en degrés

    for (const poi of KNOWN_POI) {
      const distance = Math.sqrt(Math.pow(lat - poi.lat, 2) + Math.pow(lng - poi.lng, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestPOI = poi;
      }
    }

    return nearestPOI ? nearestPOI.name : null;
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
