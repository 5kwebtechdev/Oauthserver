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
      // Hide the WebView background so native camera shows through
      document.body.classList.add('barcode-scanner-active');

      // Add listener for scanned barcodes BEFORE starting the scan
      this.scanListener = await BarcodeScanner.addListener('barcodesScanned', async (result: BarcodesScannedEvent) => {
        console.log('Barcodes scanned:', result);

        // Get the first barcode from the result
        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];

          // Run in Angular zone to ensure UI updates
          this.ngZone.run(async () => {
            // Stop scanning when QR code is detected
            await this.stopScan();

            // Process the scanned QR code
            await this.handleScannedCode(barcode.displayValue || barcode.rawValue || '');
          });
        }
      });

      // Start continuous scanning - targeting QR codes specifically
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
      // Remove listener first
      if (this.scanListener) {
        await this.scanListener.remove();
        this.scanListener = null;
      }
      await BarcodeScanner.removeAllListeners();

      // Stop the scan
      await BarcodeScanner.stopScan();

      // Turn off flashlight if it's on
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
    // Extract family code if it has GROUP: prefix
    let familyCode = code;
    if (code && code.startsWith('GROUP:')) {
      familyCode = code.substring(6).trim();
    }

    // Validate the extracted code
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

    // Show confirmation alert with scanned code
    const alert = await this.alertController.create({
      header: 'Family Code Scanned',
      message: `Found family code: ${familyCode}`,
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
    try {
      if (code) {
        sessionStorage.setItem('familyCode', code);
      }
      // Store the user role for use after login
      sessionStorage.setItem('signup_role', this.userRole);
    } catch (e) {
      console.warn('Failed to persist family code', e);
    }

    // If the scanned flow is part of onboarding for child/self, send user to signup step 4 (pet selection)
    if (this.userRole === 'child' || this.userRole === 'self') {
      this.router.navigate(['/home/sign-up'], {
        queryParams: {
          step: 4,
          role: this.userRole,
          familyCode: code
        }
      });
      return;
    }

    // If returnTo is a join-family route, navigate there with scannedCode so that
    // the join-family component can auto-register (if signup data exists)
    if (this.returnTo === 'join-family2') {
      this.router.navigate(['/home/join-family2'], {
        queryParams: {
          role: this.userRole,
          scannedCode: code
        }
      });
      return;
    }

    // Default: Navigate to login with the role. After login completes, user will be redirected appropriately
    this.router.navigate(['/home/login'], {
      queryParams: {
        role: this.userRole,
        familyCode: code
      }
    });
  }

  /**
   * Navigate directly to the appropriate dashboard based on role
   * This can be called after successful authentication
   */
  navigateToDashboard(): void {
    const normalized = this.userRole?.toUpperCase?.() || '';
    const dashboardRoute = normalized === 'PARENT' ? '/authed/parent-account' : '/authed/user-dashboard';
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
