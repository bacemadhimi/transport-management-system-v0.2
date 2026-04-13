import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ITrip, TripStatus } from '../../types/trip';
import { Network } from '@capacitor/network';
import { BarcodeScannerService, ScannedBarcode } from '../../services/barcode-scanner.service';

@Component({
  selector: 'app-trip-details-modal',
  templateUrl: './trip-details-modal.component.html',
  styleUrls: ['./trip-details-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
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
  manualQRCode: string = '';

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    this.loadTripFromCache();
    this.cacheTripImages();
    console.log('Trip Details:', this.trip);
    console.log('📍 Deliveries:', this.trip.deliveries);
    console.log('📏 Distance:', this.getRealDistance());
    console.log('📦 Delivery Count:', this.getRealDeliveriesCount());
  }

  /**
   * Obtenir la VRAIE distance (estimée ou somme des distances des livraisons)
   */
  getRealDistance(): number {
    if (this.trip.estimatedDistance && this.trip.estimatedDistance > 0) {
      return this.trip.estimatedDistance;
    }
    // Utiliser any car les données peuvent venir du backend avec des champs additionnels
    const tripAny = this.trip as any;
    if (tripAny.deliveries && tripAny.deliveries.length > 0) {
      const totalDistance = tripAny.deliveries.reduce((sum: number, d: any) => {
        return sum + (d.distance || d.totalDistance || d.estimatedDistance || 0);
      }, 0);
      return totalDistance > 0 ? totalDistance : 0;
    }
    return 0;
  }

  /**
   * Obtenir le VRAI nombre de livraisons
   */
  getRealDeliveriesCount(): number {
    if (this.trip.deliveries && Array.isArray(this.trip.deliveries)) {
      return this.trip.deliveries.length;
    }
    return 0;
  }

  /**
   * Obtenir la VRAIE destination (nom du client ou adresse)
   */
  getRealDestination(): string {
    const tripAny = this.trip as any;
    if (tripAny.deliveries && tripAny.deliveries.length > 0) {
      const lastDelivery = tripAny.deliveries[tripAny.deliveries.length - 1];
      return lastDelivery.customerName || 
             lastDelivery.customer?.companyName ||
             lastDelivery.deliveryAddress || 
             lastDelivery.address || 
             `Livraison #${lastDelivery.sequence || tripAny.deliveries.length}`;
    }
    return tripAny.destination || 'Destination';
  }

  /**
   * Obtenir la VRAIE date de fin (réelle ou estimée)
   */
  getRealEndDate(): string | Date | null {
    const tripAny = this.trip as any;
    return tripAny.actualEndDate || this.trip.estimatedEndDate || this.trip.estimatedStartDate || null;
  }

  /**
   * Obtenir le VRAI temps (durée réelle ou estimée)
   */
  getRealDuration(): number | string {
    const tripAny = this.trip as any;
    if (tripAny.actualDuration && tripAny.actualDuration > 0) {
      return tripAny.actualDuration;
    }
    if (this.trip.estimatedDuration && this.trip.estimatedDuration > 0) {
      return this.trip.estimatedDuration;
    }
    return 'N/A';
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
        if ((delivery as any).qrCodeData) {
          const cacheKey = `qr_${this.trip.id}_${index}`;
          this.saveImageToLocalStorage(cacheKey, (delivery as any).qrCodeData);
        }
      });
    }
  }

  private saveImageToLocalStorage(key: string, data: string) {
    try {
      const images = localStorage.getItem('cachedTripImages');
      let imageCache: Record<string, string> = images ? JSON.parse(images) : {};
      imageCache[key] = data;
      localStorage.setItem('cachedTripImages', JSON.stringify(imageCache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
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
        const cached = localStorage.getItem('cachedTripImages');
        if (cached) {
          const imageCache = JSON.parse(cached);
          if (imageCache[imageKey]) {
            return imageCache[imageKey];
          }
        }
      }
      return null;
    }
    return base64;
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
   * Check if delivery is in progress
   */
  isDeliveryInProgress(): boolean {
    const status = this.trip.tripStatus;
    return status === 'DeliveryInProgress' || 
           status === 'InDelivery';
  }

  /**
   * Check if delivery is completed
   */
  isDeliveryCompleted(): boolean {
    const status = this.trip.tripStatus;
    return status === 'Receipt' || 
           status === 'Completed';
  }

  /**
   * Check if action buttons should be shown
   */
  shouldShowActionButtons(): boolean {
    const status = this.trip.tripStatus;
    return status !== 'Receipt' && 
           status !== 'Completed' && 
           status !== 'Cancelled';
  }

  /**
   * Cancel QR scan
   */
  cancelQRScan() {
    this.scannedQRCode = null;
    this.manualQRCode = '';
  }

  /**
   * Scan QR Code for delivery
   */
  async scanQRCodeForDelivery() {
    if (this.isScanning) {
      await this.showToast('Scan déjà en cours...', 2000, 'warning');
      return;
    }

    this.isScanning = true;

    try {
      // Check if device is native
      if (!this.barcodeScanner.isNative()) {
        // Web mode - manual input
        await this.showToast('Mode Web - Saisie manuelle du QR Code', 2000, 'warning');
        const result = await this.manualQRCodeInputDialog();
        if (result) {
          this.scannedQRCode = result;
          await this.showToast('✅ QR Code saisi avec succès', 2000, 'success');
        }
        return;
      }

      // Scan QR Code
      const result = await this.barcodeScanner.scanBarcode();
      
      if (result) {
        // Check if it's a QR Code (2D)
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
   * Manual QR Code input dialog (for web)
   */
  private async manualQRCodeInputDialog(): Promise<ScannedBarcode | null> {
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
            font-size: 14px;
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
              font-size: 14px;
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
              font-size: 14px;
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
   * Confirm delivery with scanned QR Code
   */
  async confirmDeliveryWithQR() {
    // Get QR data from either scanned or manual input
    let qrData = this.scannedQRCode;
    
    if (!qrData && this.manualQRCode.trim()) {
      qrData = {
        content: this.manualQRCode.trim(),
        format: 'QR_CODE',
        formatType: '2D',
        timestamp: new Date()
      };
    }
    
    if (!qrData) {
      await this.showToast('Veuillez scanner ou saisir un QR Code', 2000, 'warning');
      return;
    }

    // Show confirmation dialog
    const alert = await this.alertCtrl.create({
      header: 'Confirmation de livraison',
      message: `
        <div style="text-align: left;">
          <p><strong>Contenu du QR Code:</strong></p>
          <p style="background: #f5f5f5; padding: 8px; border-radius: 8px; word-break: break-all;">${qrData.content}</p>
          <p><strong>Format:</strong> ${this.barcodeScanner.getFormatName(qrData.format)}</p>
          <p><strong>Date:</strong> ${qrData.timestamp.toLocaleString()}</p>
          <p style="color: #4caf50; margin-top: 12px;">✓ Voulez-vous confirmer la livraison ?</p>
        </div>
      `,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            // Save QR Code in delivery
            if (this.trip.deliveries && this.trip.deliveries.length > 0) {
              const lastDelivery = this.trip.deliveries[this.trip.deliveries.length - 1];
              (lastDelivery as any).qrCodeData = qrData!.content;
              (lastDelivery as any).qrCodeFormat = qrData!.format;
              (lastDelivery as any).qrCodeTimestamp = qrData!.timestamp;
            } else if (!this.trip.deliveries) {
              // Create deliveries array if it doesn't exist
              this.trip.deliveries = [{
                sequence: 1,
                qrCodeData: qrData!.content,
                qrCodeFormat: qrData!.format,
                qrCodeTimestamp: qrData!.timestamp
              } as any];
            }
            
            // Mark as receipt
            await this.updateStatus('Receipt');
            
            // Clear QR data
            this.scannedQRCode = null;
            this.manualQRCode = '';
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Update trip status
   */
  async updateStatus(newStatus: string) {
    if (this.isUpdating) {
      console.log('Update already in progress');
      return;
    }

    this.isUpdating = true;

    // Determine backend status
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

    // Convert frontend status to TripStatus enum
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
        // API call with backend status
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
   * Get display text for status in French
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
   * Get CSS class for status
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