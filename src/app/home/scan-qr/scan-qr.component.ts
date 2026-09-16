import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { BarcodeScanner, BarcodesScannedEvent, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { UserService } from '../../core/services/user.service';

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
  private scanListener: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private alertController: AlertController,
    private ngZone: NgZone,
    private userService: UserService
  ) { }

  async ngOnInit() {
    // Set up role and return route from params
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
      // Start QR scanning
      document.body.classList.add('barcode-scanner-active');

      this.scanListener = await BarcodeScanner.addListener('barcodesScanned', async (result: BarcodesScannedEvent) => {
        console.log('Barcodes scanned:', result);

        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];

          this.ngZone.run(async () => {
            await this.stopScan();

            await this.handleScannedCode(barcode.displayValue || barcode.rawValue || '');
          });
        }
      });

      await BarcodeScanner.startScan({
        formats: [BarcodeFormat.QrCode]
      });

      this.isScanning = true;
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
    try {
      if (this.scanListener) {
        await this.scanListener.remove();
        this.scanListener = null;
      }
      await BarcodeScanner.removeAllListeners();

      await BarcodeScanner.stopScan();

      if (this.isFlashlightOn) {
        try {
          await BarcodeScanner.toggleTorch();
        } catch (e) {
          // Ignore torch errors during cleanup
        }
        this.isFlashlightOn = false;
      }

      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');
    } catch (error) {
      console.error('Error stopping scan:', error);
      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');
    }
  }

  async handleScannedCode(code: string) {
    // Extract family code
    let familyCode = code;
    if (code && code.startsWith('GROUP:')) {
      familyCode = code.substring(6).trim();
    }

    if (!familyCode || familyCode.length < 6) {
      const alert = await this.alertController.create({
        header: 'Invalid QR Code',
        message: 'The scanned QR code does not contain a valid family code. Please try again.',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.startScan();
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Family Code Scanned',
      message: `Found family code: ${familyCode}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.startScan();
          }
        },
        {
          text: 'Join Family',
          handler: () => {
            this.saveCodeAndRedirect(familyCode);
          }
        }
      ]
    });

    await alert.present();
  }

  private saveCodeAndRedirect(code: string) {
    // Save scanned code and navigate based on user role
    try {
      if (code) {
        sessionStorage.setItem('familyCode', code);
      }
      sessionStorage.setItem('signup_role', this.userRole);
    } catch (e) {
      console.warn('Failed to persist family code', e);
    }

    if (this.userRole === 'child' || this.userRole === 'self') {
      this.router.navigate(['/signup'], {
        queryParams: {
          step: 4,
          role: this.userRole,
          familyCode: code
        }
      });
      return;
    }

    if (this.returnTo === 'join-family2') {
      try { sessionStorage.removeItem('familyCreator'); } catch (e) { }
      this.router.navigate(['/home/join-family2'], {
        queryParams: {
          role: this.userRole,
          mode: 'join',
          scannedCode: code
        }
      });
      return;
    }

    this.router.navigate(['/login'], {
      queryParams: {
        role: this.userRole,
        familyCode: code
      }
    });
  }

  navigateToDashboard(): void {
    const normalized = this.userRole?.toUpperCase?.() || '';
    const dashboardRoute = normalized === 'PARENT' ? '/authed/parent-account' : '/home';
    this.router.navigate([dashboardRoute]);
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
    const queryParams = this.returnTo === 'join-family2'
      ? { role: this.userRole, mode: 'join' }
      : { role: this.userRole };
    this.router.navigate([targetRoute], { queryParams });
  }

  async close() {
    await this.stopScan();

    // Try to go back in history, otherwise navigate to return route
    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        this.location.back();
        return;
      }
    } catch (e) {
      // fallback navigation
    }

    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    const queryParams = this.returnTo === 'join-family2'
      ? { role: this.userRole, mode: 'join' }
      : { role: this.userRole };
    this.router.navigate([targetRoute], { queryParams });
  }
}
