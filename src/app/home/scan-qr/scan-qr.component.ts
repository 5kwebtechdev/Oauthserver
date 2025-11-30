import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-scan-qr',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './scan-qr.component.html',
  styleUrls: ['./scan-qr.component.scss']
})
export class ScanQrComponent implements OnInit, OnDestroy {
  userRole: 'child' | 'parent' | 'self' = 'parent';
  returnTo: string = 'join-family';
  isScanning: boolean = false;
  isFlashlightOn: boolean = false;
  scannerSupported: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const role = params['role'];
      const returnTo = params['returnTo'];

      if (role && ['child', 'parent', 'self'].includes(role)) {
        this.userRole = role;
      }

      if (returnTo) {
        this.returnTo = returnTo;
      }
    });

    // Check if barcode scanning is supported
    const { supported } = await BarcodeScanner.isSupported();
    this.scannerSupported = supported;

    if (supported) {
      await this.checkPermissions();
    }
  }

  async ngOnDestroy() {
    await this.stopScan();
  }

  async checkPermissions(): Promise<boolean> {
    try {
      // Check camera permission
      const { camera } = await BarcodeScanner.checkPermissions();

      if (camera === 'granted') {
        await this.startScan();
        return true;
      }

      if (camera === 'denied') {
        const alert = await this.alertController.create({
          header: 'Permission Denied',
          message: 'Camera permission is required to scan QR codes. Please enable it in your device settings.',
          buttons: ['OK']
        });
        await alert.present();
        return false;
      }

      // Request permission
      const { camera: newStatus } = await BarcodeScanner.requestPermissions();

      if (newStatus === 'granted') {
        await this.startScan();
        return true;
      } else {
        const alert = await this.alertController.create({
          header: 'Permission Required',
          message: 'Camera permission is required to scan QR codes.',
          buttons: ['OK']
        });
        await alert.present();
        return false;
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  async startScan() {
    if (this.isScanning) {
      return;
    }

    try {
      // Hide background behind scanner
      document.body.classList.add('barcode-scanner-active');

      this.isScanning = true;

      // Start scanning
      const listener = await BarcodeScanner.addListener('barcodesScanned', async (result: BarcodesScannedEvent) => {
        console.log('Barcodes scanned:', result);

        // Get the first barcode from the result
        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];

          // Stop scanning when QR code is detected
          await this.stopScan();

          // Process the scanned QR code
          await this.handleScannedCode(barcode.displayValue);
        }
      });

      await BarcodeScanner.startScan();
    } catch (error) {
      console.error('Error starting scan:', error);
      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');

      const alert = await this.alertController.create({
        header: 'Scanner Error',
        message: 'Failed to start the camera scanner. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async stopScan() {
    if (!this.isScanning) {
      return;
    }

    try {
      await BarcodeScanner.stopScan();
      await BarcodeScanner.removeAllListeners();

      // Turn off flashlight if it's on
      if (this.isFlashlightOn) {
        this.isFlashlightOn = false;
      }

      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }

  async handleScannedCode(code: string) {
    // Show alert with scanned code
    const alert = await this.alertController.create({
      header: 'QR Code Scanned',
      message: `Scanned code: ${code}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // Resume scanning
            this.startScan();
          }
        },
        {
          text: 'Use Code',
          handler: () => {
            this.saveCodeAndRedirect(code);
          }
        }
      ]
    });

    await alert.present();
  }

  private saveCodeAndRedirect(code: string) {
    try {
      if (code) {
        sessionStorage.setItem('familyCode', code);
      }
    } catch (e) {
      console.warn('Failed to persist family code', e);
    }
    this.router.navigate(['/home/login']);
  }

  async toggleFlashlight() {
    if (!this.isScanning) {
      return;
    }

    try {
      this.isFlashlightOn = !this.isFlashlightOn;
      await BarcodeScanner.toggleTorch();
    } catch (error) {
      console.error('Error toggling flashlight:', error);
      this.isFlashlightOn = !this.isFlashlightOn; // Revert on error
    }
  }

  async openGallery() {
    // This would require additional plugin for image picking and QR code reading from image
    const alert = await this.alertController.create({
      header: 'Coming Soon',
      message: 'Gallery upload feature will be available soon.',
      buttons: ['OK']
    });
    await alert.present();
  }

  enterCode() {
    this.stopScan();
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }

  async close() {
    await this.stopScan();

    // Prefer navigating back in history so we return to the exact page that opened the scanner.
    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        this.location.back();
        return;
      }
    } catch (e) {
      // fall through to fallback navigation
    }

    // Fallback: navigate to the configured return route
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }
}
