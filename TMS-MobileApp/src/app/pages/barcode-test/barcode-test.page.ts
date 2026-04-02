import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular';
import { BarcodeScannerService, ScannedBarcode } from '../../services/barcode-scanner.service';
import { BarcodeScannerComponent } from 'src/app/components/barcode-scanner/barcode-scanner.component';


@Component({
  selector: 'app-barcode-test',
  templateUrl: './barcode-test.page.html',
  styleUrls: ['./barcode-test.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class BarcodeTestPage implements OnInit, OnDestroy {
  public  barcodeScanner = inject(BarcodeScannerService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private modalController = inject(ModalController);

  isScanning = false;
  lastScan: ScannedBarcode | null = null;
  scanHistory: ScannedBarcode[] = [];
  deviceInfo: string = '';
  isNativeDevice: boolean = false;
  isScannerAvailable: boolean = true;

  constructor() {
    this.loadScanHistory();
  }

  async ngOnInit() {
    await this.checkDevice();
  }

  ngOnDestroy() {
    // Clean up if needed
  }

  async checkDevice() {
    this.isNativeDevice = this.barcodeScanner.isNative();
    this.deviceInfo = this.isNativeDevice ? '📱 Appareil natif (Android/iOS)' : '🌐 Plateforme Web (Test)';
    
    if (!this.isNativeDevice) {
      await this.showToast('Mode Web - Utilisation de la saisie manuelle', 'warning');
    }
  }

  async scanBarcode() {
    this.isScanning = true;
    
    try {
      const result = await this.barcodeScanner.scanBarcode();
      
      if (result) {
        this.lastScan = result;
        this.scanHistory.unshift(result);
        this.saveScanHistory();
        
        const formatName = this.barcodeScanner.getFormatName(result.format);
        const icon = result.formatType === '2D' ? '📲' : '📊';
        
        await this.showToast(
          `${icon} Code scanné: ${result.content.substring(0, 30)}...\n` +
          `Type: ${formatName} (${result.formatType === '2D' ? 'Code 2D' : 'Code 1D'})`,
          'success'
        );
        
        console.log('Scan successful:', result);
      } else {
        await this.showToast('❌ Aucun code détecté', 'warning');
      }
    } catch (error) {
      console.error('Scan error:', error);
      await this.showToast('❌ Erreur lors du scan', 'danger');
    } finally {
      this.isScanning = false;
    }
  }

  async scanMultipleBarcodes() {
    const alert = await this.alertController.create({
      header: 'Scan multiple',
      message: 'Scannez plusieurs codes en séquence',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Commencer',
          handler: async () => {
            await this.startMultipleScan();
          }
        }
      ]
    });
    await alert.present();
  }

  async startMultipleScan() {
    this.isScanning = true;
    let count = 0;
    
    const scanNext = async (): Promise<void> => {
      const result = await this.barcodeScanner.scanBarcode();
      if (result) {
        count++;
        this.scanHistory.unshift(result);
        this.saveScanHistory();
        
        const continueScan = await this.confirmContinue(count);
        if (continueScan) {
          await scanNext();
        } else {
          this.isScanning = false;
          await this.showToast(`✅ ${count} code(s) scanné(s) avec succès`, 'success');
        }
      } else {
        this.isScanning = false;
        await this.showToast(`⚠️ ${count} code(s) scanné(s)`, 'warning');
      }
    };
    
    await scanNext();
  }

  async confirmContinue(count: number): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Scanner un autre ?',
      message: `Vous avez scanné ${count} code(s)`,
      buttons: [
        {
          text: 'Arrêter',
          role: 'cancel',
          handler: () => false
        },
        {
          text: 'Continuer',
          handler: () => true
        }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== 'cancel';
  }

  async testScanner() {
    this.isScanning = true;
    
    try {
      const result = await this.barcodeScanner.testScanner();
      
      if (result) {
        this.lastScan = result;
        this.scanHistory.unshift(result);
        this.saveScanHistory();
        
        const formatName = this.barcodeScanner.getFormatName(result.format);
        
        await this.showToast(
          `🧪 TEST: ${result.content}\nType: ${formatName} (${result.formatType})`,
          'primary'
        );
      }
    } finally {
      this.isScanning = false;
    }
  }

  clearHistory() {
    this.scanHistory = [];
    this.lastScan = null;
    localStorage.removeItem('barcode_scan_history');
    this.showToast('🗑️ Historique effacé', 'primary');
  }

  private saveScanHistory() {
    try {
      // Keep only last 50 scans
      const historyToSave = this.scanHistory.slice(0, 50);
      localStorage.setItem('barcode_scan_history', JSON.stringify(historyToSave));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  private loadScanHistory() {
    try {
      const saved = localStorage.getItem('barcode_scan_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        this.scanHistory = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        
        if (this.scanHistory.length > 0) {
          this.lastScan = this.scanHistory[0];
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async showInfo() {
    const alert = await this.alertController.create({
      header: '📱 Information Scanner',
      message: `
        <strong>Formats supportés:</strong><br>
        • Codes 1D: EAN-13, EAN-8, UPC-A, UPC-E, Code 39, Code 93, Code 128, ITF, Codabar<br>
        • Codes 2D: QR Code, Data Matrix, PDF417, Aztec<br><br>
        <strong>Utilisation:</strong><br>
        1. Placez le code dans le cadre<br>
        2. Maintenez l'appareil stable<br>
        3. Le code sera scanné automatiquement<br><br>
        ${!this.isNativeDevice ? '⚠️ Mode Web: Saisie manuelle uniquement' : '✅ Mode natif: Scanner la caméra'}
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  async openFullScanner() {
    if (!this.isNativeDevice) {
      await this.showToast('Scanner complet uniquement disponible sur appareil natif', 'warning');
      return;
    }
    
    const modal = await this.modalController.create({
      component: BarcodeScannerComponent,
      componentProps: {
        onScanComplete: (result: ScannedBarcode) => {
          if (result) {
            this.lastScan = result;
            this.scanHistory.unshift(result);
            this.saveScanHistory();
          }
        }
      },
      cssClass: 'fullscreen-modal'
    });
    
    await modal.present();
    const { data } = await modal.onWillDismiss();
    
    if (data?.result) {
      this.lastScan = data.result;
      this.scanHistory.unshift(data.result);
      this.saveScanHistory();
      await this.showToast(`Scanné: ${data.result.content}`, 'success');
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.showToast('📋 Copié dans le presse-papier', 'primary');
  }

  getFormatIcon(formatType: string): string {
    return formatType === '2D' ? 'qr-code-outline' : 'barcode-outline';
  }

  getFormatColor(formatType: string): string {
    return formatType === '2D' ? 'secondary' : 'primary';
  }
}