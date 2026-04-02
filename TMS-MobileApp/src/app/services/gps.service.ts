import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';

export interface GPSPosition {
  id?: number;
  driverId?: number;
  truckId?: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
  isSynchronized: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GpsService {
  private storage: Storage | null = null;
  private watchId: string | null = null;
  private isOnline: boolean = true;
  private syncInterval: any;

  constructor(
    private http: HttpClient,
    private platform: Platform
  ) {
    this.initStorage();
    this.setupNetworkListener();
  }

  private async initStorage() {
    try {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      this.storage = await Storage.create({
        name: 'gps_offline_db'
      });
    } catch (error) {
      console.error('Error initializing storage:', error);
<<<<<<< HEAD
=======
      // ✅ Correction - créer l'instance d'abord, puis appeler create()
      const storage = new Storage();
      this.storage = await storage.create();
      console.log('✅ Storage initialized');
    } catch (error) {
      console.error('❌ Error initializing storage:', error);
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    }
  }

  private setupNetworkListener() {
    if (this.platform.is('hybrid')) {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncOfflinePositions();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  async getCurrentPosition(): Promise<GPSPosition | null> {
    try {
      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
        source: 'Mobile',
        isSynchronized: false
      };
    } catch (error) {
      console.error('Error getting GPS position:', error);
      return null;
    }
  }

  async startTracking(driverId: number, truckId: number): Promise<void> {
    // Stop any existing tracking
    await this.stopTracking();

    // Send position every 30 seconds
    this.watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      },
      async (position, error) => {
        if (error) {
          console.error('Watch position error:', error);
          return;
        }

        if (position) {
          const gpsPosition: GPSPosition = {
            driverId: driverId,
            truckId: truckId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
            source: 'Mobile',
            isSynchronized: false
          };

          await this.savePosition(gpsPosition);
        }
      }
    );
  }

  async stopTracking(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }

  async savePosition(position: GPSPosition): Promise<void> {
    if (this.isOnline) {
      // Send to backend immediately
      try {
        await this.http.post(`${environment.apiUrl}/api/gps/position`, {
          driverId: position.driverId,
          truckId: position.truckId,
          latitude: position.latitude,
          longitude: position.longitude,
          source: position.source
        }).toPromise();
        
        position.isSynchronized = true;
      } catch (error) {
        console.error('Error sending position to server:', error);
      }
    }

    // Store locally regardless of sync status
    await this.storePositionLocally(position);
  }

  private async storePositionLocally(position: GPSPosition): Promise<void> {
    if (!this.storage) return;

    try {
      const positions = await this.storage.get('offline_positions') || [];
      positions.push(position);
      
      // Keep only last 1000 positions locally
      if (positions.length > 1000) {
        positions.splice(0, positions.length - 1000);
      }
      
      await this.storage.set('offline_positions', positions);
    } catch (error) {
      console.error('Error storing position locally:', error);
    }
  }

  async syncOfflinePositions(): Promise<void> {
    if (!this.storage || !this.isOnline) return;

    try {
      const positions: GPSPosition[] = await this.storage.get('offline_positions') || [];
      const unsyncedPositions = positions.filter(p => !p.isSynchronized);

      if (unsyncedPositions.length === 0) return;

      // Batch sync - send positions in groups of 50
      for (let i = 0; i < unsyncedPositions.length; i += 50) {
        const batch = unsyncedPositions.slice(i, i + 50);
        
        await this.http.post(`${environment.apiUrl}/api/gps/batch`, {
          positions: batch
        }).toPromise();
      }

      // Mark all as synchronized
      positions.forEach(p => p.isSynchronized = true);
      await this.storage.set('offline_positions', positions);

<<<<<<< HEAD
<<<<<<< HEAD
      console.log(`Synced ${unsyncedPositions.length} positions`);
    } catch (error) {
      console.error('Error syncing offline positions:', error);
=======
      console.log(`✅ Synced ${unsyncedPositions.length} positions`);
    } catch (error) {
      console.error('❌ Error syncing offline positions:', error);
>>>>>>> dev
=======
      console.log(`Synced ${unsyncedPositions.length} positions`);
    } catch (error) {
      console.error('Error syncing offline positions:', error);
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    }
  }

  async getStoredPositions(): Promise<GPSPosition[]> {
    if (!this.storage) return [];
    return await this.storage.get('offline_positions') || [];
  }

  async clearStoredPositions(): Promise<void> {
    if (!this.storage) return;
    await this.storage.remove('offline_positions');
  }
<<<<<<< HEAD
<<<<<<< HEAD
}
=======
}
>>>>>>> dev
=======
}
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
