import { Component, EventEmitter, Output, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { BarcodeScannerService, ScannedBarcode } from '../../services/barcode-scanner.service';

@Component({
  selector: 'app-barcode-scanner',
  templateUrl: './barcode-scanner.component.html',
  styleUrls: ['./barcode-scanner.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class BarcodeScannerComponent implements OnInit, OnDestroy {
  @Output() scanComplete = new EventEmitter<ScannedBarcode | null>();
  
  private barcodeScanner = inject(BarcodeScannerService);
  private modalController = inject(ModalController);
  
  isScanning = false;
  errorMessage: string | null = null;
  supportedFormats: string[] = [
    'EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'Code 39', 'Code 93', 
    'Code 128', 'ITF', 'Codabar', 'QR Code', 'Data Matrix', 'PDF417', 'Aztec'
  ];

  async ngOnInit() {
    await this.startScanning();
  }

  async startScanning() {
    this.isScanning = true;
    this.errorMessage = null;

    try {
      const result = await this.barcodeScanner.scanBarcode();
      
      if (result) {
        this.scanComplete.emit(result);
        this.closeModal();
      } else {
        this.errorMessage = 'Aucun code détecté';
        this.isScanning = false;
      }
    } catch (error) {
      console.error('Scanning error:', error);
      this.errorMessage = 'Erreur lors du scan';
      this.isScanning = false;
    }
  }

  closeModal() {
    this.modalController.dismiss();
  }

  ngOnDestroy() {
    this.isScanning = false;
  }

  getFormatIcon(format: string): string {
    const twoDFormats = ['QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC'];
    return twoDFormats.some(f => format.toUpperCase().includes(f)) 
      ? 'qr-code-outline' 
      : 'barcode-outline';
  }
}