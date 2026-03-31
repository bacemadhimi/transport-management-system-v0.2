import { Injectable } from '@angular/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

export interface ScannedBarcode {
  content: string;
  format: string;
  formatType: '1D' | '2D' | 'unknown';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {
  
  // All supported barcode formats
  private supportedFormats: BarcodeFormat[] = [
    // 1D Barcodes
    BarcodeFormat.Ean8,
    BarcodeFormat.Ean13,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    BarcodeFormat.Code39,
    BarcodeFormat.Code93,
    BarcodeFormat.Code128,
    BarcodeFormat.Itf,
    BarcodeFormat.Codabar,
    // 2D Barcodes
    BarcodeFormat.QrCode,
    BarcodeFormat.DataMatrix,
    BarcodeFormat.Pdf417,
    BarcodeFormat.Aztec
  ];

  constructor() {
    console.log('BarcodeScannerService initialized');
  }

  /**
   * Check if the app is running on a native device
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    if (!this.isNative()) {
      console.log('Web platform - no camera permission needed');
      return true;
    }

    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      const granted = camera === 'granted';
      console.log('Camera permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Check if camera permission is granted
   */
  async checkCameraPermission(): Promise<boolean> {
    if (!this.isNative()) {
      return true;
    }

    try {
      const status = await BarcodeScanner.checkPermissions();
      return status.camera === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Scan a single barcode
   */
  async scanBarcode(): Promise<ScannedBarcode | null> {
    console.log('Starting barcode scan...');

    // Check if on web platform
    if (!this.isNative()) {
      console.log('Web platform - using manual input fallback');
      return this.manualInputFallback();
    }

    try {
      // Check permission
      const hasPermission = await this.checkCameraPermission();
      if (!hasPermission) {
        const granted = await this.requestCameraPermission();
        if (!granted) {
          console.error('Camera permission denied');
          return null;
        }
      }

      console.log('Camera permission OK, starting scanner...');

      // Start scanning
      const { barcodes } = await BarcodeScanner.scan({
        formats: this.supportedFormats
      });

      console.log('Scan result:', barcodes);

      if (barcodes && barcodes.length > 0) {
        const barcode = barcodes[0];
        const formatType = this.detectBarcodeType(barcode.format);
        
        const result: ScannedBarcode = {
          content: barcode.rawValue || barcode.displayValue || '',
          format: barcode.format,
          formatType: formatType,
          timestamp: new Date()
        };
        
        console.log('Barcode scanned successfully:', result);
        return result;
      }
      
      console.log('No barcode detected');
      return null;
      
    } catch (error) {
      console.error('Error scanning barcode:', error);
      return null;
    }
  }

  /**
   * Scan multiple barcodes in sequence
   */
  async scanMultipleBarcodes(): Promise<ScannedBarcode[]> {
    const results: ScannedBarcode[] = [];
    let continueScanning = true;
    
    while (continueScanning) {
      const result = await this.scanBarcode();
      if (result) {
        results.push(result);
        continueScanning = await this.confirmContinue();
      } else {
        continueScanning = false;
      }
    }
    
    return results;
  }

  /**
   * Detect if barcode is 1D or 2D
   */
  private detectBarcodeType(format: string): '1D' | '2D' | 'unknown' {
    const formatUpper = format.toUpperCase();
    
    // 2D Formats
    const twoDFormats = ['QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC'];
    if (twoDFormats.some(f => formatUpper.includes(f))) {
      return '2D';
    }
    
    // 1D Formats
    const oneDFormats = ['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'CODE_39', 'CODE_93', 'CODE_128', 'ITF', 'CODABAR'];
    if (oneDFormats.some(f => formatUpper.includes(f))) {
      return '1D';
    }
    
    return 'unknown';
  }

  /**
   * Validate barcode content based on format
   */
  validateBarcode(content: string, format: string): boolean {
    if (!content) return false;
    
    switch (format) {
      case 'EAN_13':
        return /^\d{13}$/.test(content);
      case 'EAN_8':
        return /^\d{8}$/.test(content);
      case 'UPC_A':
        return /^\d{12}$/.test(content);
      case 'UPC_E':
        return /^\d{8}$/.test(content);
      case 'QR_CODE':
        return content.length > 0 && content.length < 3000;
      default:
        return content.length > 0;
    }
  }

  /**
   * Confirm if user wants to continue scanning
   */
  private async confirmContinue(): Promise<boolean> {
    // Simple confirmation for now
    // You can replace this with a proper Ionic AlertController
    return confirm('Scanner un autre code ?');
  }

  /**
   * Manual input fallback for web testing
   */
  private manualInputFallback(): Promise<ScannedBarcode | null> {
    console.log('Opening manual input dialog...');
    
    return new Promise((resolve) => {
      // Create modal container
      const modal = document.createElement('div');
      modal.style.cssText = `
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
      
      // Create dialog content
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 24px;
        width: 90%;
        max-width: 350px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      `;
      
      // Format selector for web testing
      const formatSelect = `
        <select 
          id="formatSelect" 
          style="
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 2px solid #ff8c00;
            border-radius: 12px;
            font-size: 14px;
            background: white;
          "
        >
          <option value="">Sélectionner le type (optionnel)</option>
          <option value="EAN_13">EAN-13 (Code produit)</option>
          <option value="QR_CODE">QR Code (2D)</option>
          <option value="CODE_128">Code 128 (Logistique)</option>
          <option value="UPC_A">UPC-A (Code US)</option>
        </select>
      `;
      
      dialog.innerHTML = `
        <h3 style="margin: 0 0 10px; color: #ff8c00;">Saisie manuelle</h3>
        <p style="margin: 0 0 20px; color: #666; font-size: 14px;">
          Entrez le code-barres manuellement
        </p>
        ${formatSelect}
        <input 
          id="barcodeInput" 
          type="text" 
          placeholder="Code-barres..." 
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #ff8c00;
            border-radius: 12px;
            font-size: 16px;
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
              color: #666;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
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
              font-size: 14px;
              font-weight: 600;
            "
          >Valider</button>
        </div>
      `;
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
      
      const input = dialog.querySelector('#barcodeInput') as HTMLInputElement;
      const formatSelectEl = dialog.querySelector('#formatSelect') as HTMLSelectElement;
      const confirmBtn = dialog.querySelector('#confirmBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');
      
      const cleanup = () => {
        modal.remove();
      };
      
      const handleConfirm = () => {
        const value = input.value.trim();
        const selectedFormat = formatSelectEl?.value || 'manual';
        
        if (value) {
          const formatType = this.detectBarcodeType(selectedFormat);
          resolve({
            content: value,
            format: selectedFormat,
            formatType: formatType,
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
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConfirm();
      });
      
      confirmBtn?.addEventListener('click', handleConfirm);
      cancelBtn?.addEventListener('click', handleCancel);
      
      input.focus();
    });
  }

  /**
   * Test the scanner with mock data (for development)
   */
  async testScanner(): Promise<ScannedBarcode | null> {
    console.log('Running scanner test...');
    
    // Mock test data
    const mockResults: ScannedBarcode[] = [
      { content: '5901234123457', format: 'EAN_13', formatType: '1D', timestamp: new Date() },
      { content: 'https://tms-app.com/trip/123', format: 'QR_CODE', formatType: '2D', timestamp: new Date() },
      { content: 'TRIP-2024-001', format: 'CODE_128', formatType: '1D', timestamp: new Date() },
      { content: 'https://example.com/delivery/456', format: 'QR_CODE', formatType: '2D', timestamp: new Date() },
      { content: '1234567890128', format: 'UPC_A', formatType: '1D', timestamp: new Date() },
      { content: 'DATA_MATRIX_SAMPLE', format: 'DATA_MATRIX', formatType: '2D', timestamp: new Date() }
    ];
    
    // Return a random mock result for testing
    const randomIndex = Math.floor(Math.random() * mockResults.length);
    console.log('Test result:', mockResults[randomIndex]);
    
    return mockResults[randomIndex];
  }

  /**
   * Get human-readable format name
   */
  getFormatName(format: string): string {
    const formatNames: { [key: string]: string } = {
      'EAN_13': 'EAN-13',
      'EAN_8': 'EAN-8',
      'UPC_A': 'UPC-A',
      'UPC_E': 'UPC-E',
      'CODE_39': 'Code 39',
      'CODE_93': 'Code 93',
      'CODE_128': 'Code 128',
      'ITF': 'ITF',
      'CODABAR': 'Codabar',
      'QR_CODE': 'QR Code',
      'DATA_MATRIX': 'Data Matrix',
      'PDF_417': 'PDF417',
      'AZTEC': 'Aztec',
      'manual': 'Saisie manuelle'
    };
    
    return formatNames[format] || format;
  }

  /**
   * Get icon name for barcode type
   */
  getIconForFormat(formatType: string): string {
    return formatType === '2D' ? 'qr-code-outline' : 'barcode-outline';
  }
}