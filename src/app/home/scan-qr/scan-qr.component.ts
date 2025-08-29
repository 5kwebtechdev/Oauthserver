import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scan-qr',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './scan-qr.component.html',
  styleUrls: ['./scan-qr.component.scss']
})
export class ScanQrComponent {
  constructor(private router: Router) {}

  openGallery() {
    // stub for gallery/scan
    console.log('open gallery');
  }

  enterCode() {
    // navigate back to join-family page where user can enter code
    this.router.navigate(['/home/join-family']);
  }

  close() {
    this.router.navigate(['/home/join-family']);
  }
}
