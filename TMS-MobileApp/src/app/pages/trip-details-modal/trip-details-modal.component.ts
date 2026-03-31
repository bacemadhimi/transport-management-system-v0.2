import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ITrip, TripStatus } from '../../types/trip';
import { Network } from '@capacitor/network';
import { BarcodeScannerService, ScannedBarcode } from '../../services/barcode-scanner.service';

@Component({
  selector: 'app-trip-details-modal',
  templateUrl: './trip-details-modal.component.html',
  styleUrls: ['./trip-details-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TripDetailsModalComponent implements OnInit, OnDestroy {
  @Input() trip!: ITrip;
  
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  public barcodeScanner = inject(BarcodeScannerService);
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  private networkListener: any;
  
  // Cached data
  cachedImages: Map<string, string> = new Map();
  imageLoadError: boolean = false;
  isUpdating: boolean = false;
  isScanning: boolean = false;
  
  // QR Code scan result
  scannedQRCode: ScannedBarcode | null = null;

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    this.loadTripFromCache();
    this.cacheTripImages();
    console.log('Trip Details:', this.trip);
  }

  ngOnDestroy() {
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  private async checkNetworkStatus() {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      console.log('Network status:', this.isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('Error checking network:', error);
      this.isOnline = false;
      this.offlineMode = true;
    }
  }

  private setupNetworkListener() {
    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      console.log('Network changed:', this.isOnline ? 'online' : 'offline');
    });
  }

  private loadTripFromCache() {
    try {
      const cachedTrips = localStorage.getItem('offlineTrips');
      if (cachedTrips) {
        const trips = JSON.parse(cachedTrips) as ITrip[];
        const cachedTrip = trips.find(t => t.id === this.trip.id);
        if (cachedTrip) {
          this.trip = { ...this.trip, ...cachedTrip };
          console.log('Loaded trip from cache:', this.trip.id);
        }
      }
    } catch (error) {
      console.error('Error loading trip from cache:', error);
    }
  }

  private cacheTripImages() {
    if (!this.trip) return;

    if (this.trip.deliveries) {
      this.trip.deliveries.forEach((delivery, index) => {
        if (delivery.proofOfDelivery) {
          const cacheKey = `delivery_${this.trip.id}_${index}`;
          this.cachedImages.set(cacheKey, delivery.proofOfDelivery);
          this.saveImageToLocalStorage(cacheKey, delivery.proofOfDelivery);
        }
        if ((delivery as any).qrCodeData) {
          const cacheKey = `qr_${this.trip.id}_${index}`;
          this.saveImageToLocalStorage(cacheKey, (delivery as any).qrCodeData);
        }
      });
    }

    if ((this.trip as any).proofImage) {
      const cacheKey = `trip_${this.trip.id}_proof`;
      this.cachedImages.set(cacheKey, (this.trip as any).proofImage);
      this.saveImageToLocalStorage(cacheKey, (this.trip as any).proofImage);
    }
  }

  private saveImageToLocalStorage(key: string, base64: string) {
    try {
      const images = localStorage.getItem('cachedTripImages');
      let imageCache: Record<string, string> = images ? JSON.parse(images) : {};
      imageCache[key] = base64;
      localStorage.setItem('cachedTripImages', JSON.stringify(imageCache));
    } catch (error) {
      console.error('Error saving image to cache:', error);
    }
  }

  private loadImageFromLocalStorage(key: string): string | null {
    try {
      const images = localStorage.getItem('cachedTripImages');
      if (images) {
        const imageCache = JSON.parse(images);
        return imageCache[key] || null;
      }
    } catch (error) {
      console.error('Error loading image from cache:', error);
    }
    return null;
  }

  private saveTripToCache() {
    try {
      const cachedTrips = localStorage.getItem('offlineTrips');
      let trips: ITrip[] = cachedTrips ? JSON.parse(cachedTrips) : [];
      
      const index = trips.findIndex(t => t.id === this.trip.id);
      if (index !== -1) {
        trips[index] = this.trip;
      } else {
        trips.push(this.trip);
      }
      
      localStorage.setItem('offlineTrips', JSON.stringify(trips));
      console.log('Trip saved to cache:', this.trip.id);
    } catch (error) {
      console.error('Error saving trip to cache:', error);
    }
  }

  close() {
    this.saveTripToCache();
    this.modalCtrl.dismiss();
  }

  getDataUrl(base64?: string | null, imageKey?: string): string | null {
    if (!base64) {
      if (imageKey) {
        const cached = this.loadImageFromLocalStorage(imageKey);
        if (cached) {
          return this.formatDataUrl(cached);
        }
      }
      return null;
    }
    return this.formatDataUrl(base64);
  }

  private formatDataUrl(base64: string): string | null {
    if (!base64) return null;
    
    if (base64.startsWith('data:')) {
      return base64;
    }
    
    if (base64.startsWith('/9j')) return 'data:image/jpeg;base64,' + base64;
    if (base64.startsWith('iVBORw0KG')) return 'data:image/png;base64,' + base64;
    return 'data:image/jpeg;base64,' + base64;
  }

  showOfflineIndicator(): boolean {
    return this.offlineMode;
  }

  getOfflineMessage(): string {
    return 'Vous visualisez des données de trajet en cache. Certaines informations peuvent ne pas être à jour.';
  }

  onImageError(event: any) {
    this.imageLoadError = true;
    event.target.style.display = 'none';
    console.error('Error loading image');
  }

  private async showToast(message: string, duration: number, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Vérifier si la livraison est en cours
   */
  isDeliveryInProgress(): boolean {
    const status = this.trip.tripStatus;
    return status === 'DeliveryInProgress' || 
           status === 'InDelivery';
  }

  /**
   * Vérifier si la livraison est terminée
   */
  isDeliveryCompleted(): boolean {
    const status = this.trip.tripStatus;
    return status === 'Receipt' || 
           status === 'Completed';
  }

  /**
   * Vérifier si les boutons d'action doivent être affichés
   */
  shouldShowActionButtons(): boolean {
    const status = this.trip.tripStatus;
    return status !== 'Receipt' && 
           status !== 'Completed' && 
           status !== 'Cancelled' 
           
  }

  /**
   * Scanner QR Code pour la livraison
   */
  async scanQRCodeForDelivery() {
    if (this.isScanning) {
      await this.showToast('Scan déjà en cours...', 2000, 'warning');
      return;
    }

    this.isScanning = true;

    try {
      // Vérifier si l'appareil est natif
      if (!this.barcodeScanner.isNative()) {
        await this.showToast('Mode Web - Saisie manuelle du QR Code', 2000, 'warning');
        const result = await this.manualQRCodeInput();
        if (result) {
          this.scannedQRCode = result;
          await this.showToast('✅ QR Code saisi avec succès', 2000, 'success');
        }
        return;
      }

      // Scanner le QR Code
      const result = await this.barcodeScanner.scanBarcode();
      
      if (result) {
        // Vérifier que c'est bien un QR Code (2D)
        if (result.formatType === '2D') {
          this.scannedQRCode = result;
          await this.showToast(`✅ QR Code scanné: ${result.content.substring(0, 30)}...`, 2000, 'success');
        } else {
          await this.showToast('❌ Veuillez scanner un QR Code (code 2D)', 3000, 'danger');
        }
      } else {
        await this.showToast('❌ Aucun code détecté', 2000, 'warning');
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      await this.showToast('❌ Erreur lors du scan', 3000, 'danger');
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Saisie manuelle du QR Code (pour web)
   */
  private async manualQRCodeInput(): Promise<ScannedBarcode | null> {
    return new Promise((resolve) => {
      const alert = document.createElement('div');
      alert.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 24px;
        width: 90%;
        max-width: 350px;
        text-align: center;
      `;
      
      dialog.innerHTML = `
        <h3 style="margin: 0 0 10px; color: #ff8c00;">Saisie QR Code</h3>
        <p style="margin: 0 0 20px; color: #666;">Entrez le contenu du QR Code</p>
        <input 
          id="qrInput" 
          type="text" 
          placeholder="Contenu du QR Code..." 
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #ff8c00;
            border-radius: 12px;
            margin-bottom: 20px;
            box-sizing: border-box;
          "
        >
        <div style="display: flex; gap: 12px;">
          <button 
            id="cancelBtn" 
            style="
              flex: 1;
              padding: 12px;
              background: #e0e0e0;
              border: none;
              border-radius: 12px;
              cursor: pointer;
            "
          >Annuler</button>
          <button 
            id="confirmBtn" 
            style="
              flex: 1;
              padding: 12px;
              background: linear-gradient(135deg, #ff8c00, #ffcc00);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 600;
            "
          >Valider</button>
        </div>
      `;
      
      alert.appendChild(dialog);
      document.body.appendChild(alert);
      
      const input = dialog.querySelector('#qrInput') as HTMLInputElement;
      const confirmBtn = dialog.querySelector('#confirmBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');
      
      const cleanup = () => alert.remove();
      
      const handleConfirm = () => {
        const value = input.value.trim();
        if (value) {
          resolve({
            content: value,
            format: 'QR_CODE',
            formatType: '2D',
            timestamp: new Date()
          });
        } else {
          resolve(null);
        }
        cleanup();
      };
      
      const handleCancel = () => {
        resolve(null);
        cleanup();
      };
      
      confirmBtn?.addEventListener('click', handleConfirm);
      cancelBtn?.addEventListener('click', handleCancel);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConfirm();
      });
      
      input.focus();
    });
  }

  /**
   * Confirmer la livraison avec le QR Code scanné
   */
  async confirmDeliveryWithQR() {
    if (!this.scannedQRCode) {
      await this.showToast('Veuillez d\'abord scanner un QR Code', 2000, 'warning');
      return;
    }

    // Afficher les détails du QR Code pour confirmation
    const alert = await this.alertCtrl.create({
      header: 'Confirmation de livraison',
      message: `
        <strong>Contenu du QR Code:</strong><br>
        ${this.scannedQRCode.content}<br><br>
        <strong>Format:</strong> ${this.barcodeScanner.getFormatName(this.scannedQRCode.format)}<br>
        <strong>Date:</strong> ${this.scannedQRCode.timestamp.toLocaleString()}<br><br>
        Voulez-vous confirmer la livraison ?
      `,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            // Sauvegarder le QR Code dans la livraison
            if (this.trip.deliveries && this.trip.deliveries.length > 0) {
              const lastDelivery = this.trip.deliveries[this.trip.deliveries.length - 1];
              (lastDelivery as any).qrCodeData = this.scannedQRCode!.content;
              (lastDelivery as any).qrCodeFormat = this.scannedQRCode!.format;
              (lastDelivery as any).qrCodeTimestamp = this.scannedQRCode!.timestamp;
            }
            
            // Marquer comme réception
            await this.updateStatus('Receipt');
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Update trip status
   */
/**
 * Update trip status
 */
async updateStatus(newStatus: string) {
  if (this.isUpdating) {
    console.log('Update already in progress');
    return;
  }

  this.isUpdating = true;

  // Déterminer le statut à envoyer au backend
  let backendStatus = newStatus;
  if (newStatus === 'Accepted') {
    backendStatus = 'Assigned';
  } else if (newStatus === 'LoadingInProgress') {
    backendStatus = 'Loading';
  } else if (newStatus === 'DeliveryInProgress') {
    backendStatus = 'InDelivery';
  } else if (newStatus === 'Receipt') {
    backendStatus = 'Completed';
  }

  // Convertir le statut frontend en TripStatus enum
  let frontendStatus: TripStatus;
  switch (newStatus) {
    case 'Pending':
      frontendStatus = TripStatus.Pending;
      break;
    case 'Planned':
      frontendStatus = TripStatus.Planned;
      break;
    case 'Accepted':
      frontendStatus = TripStatus.Accepted;
      break;
    case 'LoadingInProgress':
      frontendStatus = TripStatus.LoadingInProgress;
      break;
    case 'DeliveryInProgress':
      frontendStatus = TripStatus.DeliveryInProgress;
      break;
    case 'Receipt':
      frontendStatus = TripStatus.Receipt;
      break;
    case 'Completed':
      frontendStatus = TripStatus.Completed;
      break;
    case 'Cancelled':
      frontendStatus = TripStatus.Cancelled;
      break;
    default:
      frontendStatus = TripStatus.Planned;
  }

  try {
    if (!this.isOnline) {
      await this.showToast(
        'Vous êtes hors ligne. Le statut sera mis à jour lorsque la connexion sera rétablie.',
        3000,
        'warning'
      );
      
      this.savePendingStatusUpdate(backendStatus);
      this.trip.tripStatus = frontendStatus;
      this.saveTripToCache();
      
      this.modalCtrl.dismiss({
        action: 'updateStatus',
        tripId: this.trip.id,
        newStatus: newStatus,
        pendingSync: true
      });
      
      await this.showToast(
        'Statut mis à jour localement. Synchronisation en attente.',
        2000,
        'success'
      );
    } else {
      // Appel API avec le statut backend
      console.log(`Updating trip ${this.trip.id} status to: ${backendStatus}`);
      
      this.trip.tripStatus = frontendStatus;
      this.saveTripToCache();
      
      this.modalCtrl.dismiss({
        action: 'updateStatus',
        tripId: this.trip.id,
        newStatus: newStatus,
        success: true
      });
      
      await this.showToast(
        `Statut mis à jour : ${this.getStatusText(newStatus)}`,
        2000,
        'success'
      );
    }
  } catch (error) {
    console.error('Error updating status:', error);
    await this.showToast(
      'Erreur lors de la mise à jour du statut. Veuillez réessayer.',
      3000,
      'danger'
    );
  } finally {
    this.isUpdating = false;
  }
}

  private savePendingStatusUpdate(newStatus: string) {
    try {
      const pending = localStorage.getItem('pendingStatusUpdates');
      let updates: any[] = pending ? JSON.parse(pending) : [];
      updates.push({
        tripId: this.trip.id,
        newStatus: newStatus,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingStatusUpdates', JSON.stringify(updates));
      console.log('Pending status update saved:', newStatus);
    } catch (error) {
      console.error('Error saving pending update:', error);
    }
  }

  /**
   * Obtenir le texte d'affichage du statut en français
   */
  getStatusText(status: string): string {
    const statusTextMap: { [key: string]: string } = {
      'Pending': '⏳ En attente',
      'Planned': '📋 Planifié',
      'Accepted': '✅ Accepté',
      'LOADING': '📦 Chargement',
      'Loading': '📦 Chargement',
      'LoadingInProgress': '📦 Chargement',
      'InDelivery': '🚚 Livraison',
      'DeliveryInProgress': '🚚 Livraison',
      'Receipt': '🎉 Terminé',
      'Completed': '🎉 Terminé',
      'Cancelled': '❌ Annulé'
    };
    return statusTextMap[status] || status;
  }

  /**
   * Obtenir la classe CSS pour le statut (en minuscules)
   */
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'Pending': 'pending',
      'Planned': 'planned',
      'Accepted': 'accepted',
      'LOADING': 'loading',
      'Loading': 'loading',
      'LoadingInProgress': 'loading',
      'InDelivery': 'delivery',
      'DeliveryInProgress': 'delivery',
      'Receipt': 'receipt',
      'Completed': 'receipt',
      'Cancelled': 'cancelled'
    };
    return classMap[status] || 'default';
  }
}