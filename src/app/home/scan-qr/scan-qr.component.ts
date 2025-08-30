import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scan-qr',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './scan-qr.component.html',
  styleUrls: ['./scan-qr.component.scss']
})
export class ScanQrComponent implements OnInit {
  userRole: 'child' | 'parent' | 'self' = 'parent';
  returnTo: string = 'join-family';
  flashlightOn: boolean = false;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    // Get query parameters passed from the previous component
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
  }

  openGallery() {
    // stub for gallery/scan
    console.log('open gallery');
    // TODO: Implement actual QR scanning from gallery
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    console.log('Flashlight toggled:', this.flashlightOn);
    // TODO: Implement actual flashlight control
  }

  enterCode() {
    // Navigate back to the component that called this scanner
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }

  close() {
    // Navigate back to the component that called this scanner
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }

  // Method to handle scanned QR code result
  onQRCodeScanned(scannedCode: string) {
    // Navigate back with the scanned code
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { 
      queryParams: { 
        role: this.userRole, 
        scannedCode: scannedCode 
      } 
    });
  }
}
