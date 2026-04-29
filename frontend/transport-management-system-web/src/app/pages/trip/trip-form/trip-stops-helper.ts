import { Injectable } from '@angular/core';
import * as L from 'leaflet';

/**
 * Helper pour la gestion des TripStops et l'affichage de la carte récapitulative
 * Support multi-clients et multi-points pour les voyages
 */
@Injectable({
  providedIn: 'root'
})
export class TripStopsHelper {

  /**
   * Calculer les TripStops à partir des deliveries du formulaire
   */
  async calculateTripStops(
    deliveryControls: any[],
    customers: any[],
    getOrderReference: (orderId: number) => string,
    gpsAddressService: any
  ): Promise<any[]> {
    if (!deliveryControls || deliveryControls.length === 0) {
      return [];
    }

    const tripStops: any[] = [];
    let sequence = 1;

    for (const deliveryGroup of deliveryControls) {
      const orderId = deliveryGroup.get('orderId')?.value;
      const customerId = deliveryGroup.get('customerId')?.value;
      
      if (!customerId) continue;

      const customer = customers.find((c: any) => c.id === customerId);
      if (!customer) continue;

      let stopLatitude: number | null = null;
      let stopLongitude: number | null = null;
      let stopGeolocation: string | null = null;

      // Essayer d'obtenir les coordonnées GPS du client
      if (customer.latitude && customer.longitude) {
        stopLatitude = customer.latitude;
        stopLongitude = customer.longitude;
        stopGeolocation = `${customer.latitude},${customer.longitude}`;
      } else if (customer.address) {
        // Géocoder l'adresse si pas de coordonnées
        try {
          const geoResult = await gpsAddressService.geocodeAddress(customer.address);
          if (geoResult && geoResult.lat && geoResult.lng) {
            stopLatitude = geoResult.lat;
            stopLongitude = geoResult.lng;
            stopGeolocation = `${geoResult.lat},${geoResult.lng}`;
          }
        } catch (error) {
          console.warn(`⚠️ Échec du géocodage pour ${customer.address}:`, error);
        }
      }

      const orderRef = orderId ? getOrderReference(orderId) : 'N/A';
      
      tripStops.push({
        sequence: sequence++,
        type: 'Commande',
        orderId: orderId,
        customerId: customerId,
        customerName: customer.name,
        address: customer.address || customer.name,
        latitude: stopLatitude,
        longitude: stopLongitude,
        geolocation: stopGeolocation,
        orderReference: orderRef,
        notes: deliveryGroup.get('notes')?.value
      });
    }

    return tripStops;
  }

  /**
   * Initialiser la carte Leaflet pour l'aperçu des TripStops
   */
  initializeRecapMap(
    containerId: string,
    tripStops: any[]
  ): any {
    if (!tripStops || tripStops.length === 0) {
      console.warn('⚠️ Aucun arrêt à afficher');
      return null;
    }

    // Nettoyer l'ancienne carte si elle existe
    const existingMap = (window as any)[`recapMap_${containerId}`];
    if (existingMap) {
      existingMap.remove();
    }

    // Trouver le conteneur de la carte
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) {
      console.error(`❌ Conteneur de carte non trouvé: ${containerId}`);
      return null;
    }

    // Filtrer les stops avec coordonnées valides
    const validStops = tripStops.filter((stop: any) => stop.latitude && stop.longitude);
    
    if (validStops.length === 0) {
      console.warn('⚠️ Aucun arrêt avec coordonnées GPS valides');
      return null;
    }

    // Calculer le centre moyen
    const avgLat = validStops.reduce((sum: number, stop: any) => sum + stop.latitude, 0) / validStops.length;
    const avgLng = validStops.reduce((sum: number, stop: any) => sum + stop.longitude, 0) / validStops.length;

    // Initialiser la carte
    const map = L.map(containerId).setView([avgLat, avgLng], 12);

    // Ajouter la couche OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Créer une couche de marqueurs
    const markerLayer = L.layerGroup().addTo(map);

    // Ajouter un marqueur pour chaque stop
    validStops.forEach((stop: any, index: number) => {
      const markerColor = index === 0 ? 'green' : (index === validStops.length - 1 ? 'red' : 'blue');
      
      const markerIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: `<div style="
          background-color: ${markerColor};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${stop.sequence}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([stop.latitude, stop.longitude], { icon: markerIcon })
        .addTo(markerLayer)
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong>Arrêt #${stop.sequence}</strong><br>
            <strong>Type:</strong> ${stop.type}<br>
            <strong>Client:</strong> ${stop.customerName}<br>
            <strong>Commande:</strong> ${stop.orderReference}<br>
            <strong>Adresse:</strong> ${stop.address}
            ${stop.notes ? `<br><strong>Notes:</strong> ${stop.notes}` : ''}
          </div>
        `);
    });

    // Ajuster la vue pour montrer tous les marqueurs
    const bounds = L.latLngBounds(validStops.map((stop: any) => [stop.latitude, stop.longitude]));
    map.fitBounds(bounds, { padding: [50, 50] });

    // Stocker la référence pour nettoyage ultérieur
    (window as any)[`recapMap_${containerId}`] = map;

    return map;
  }

  /**
   * Nettoyer la carte
   */
  cleanupMap(containerId: string): void {
    const existingMap = (window as any)[`recapMap_${containerId}`];
    if (existingMap) {
      existingMap.remove();
      delete (window as any)[`recapMap_${containerId}`];
    }
  }
}
