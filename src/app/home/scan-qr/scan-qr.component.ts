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

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
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
    console.log('Gallery functionality removed');
  }

  toggleFlashlight() {
    console.log('Flashlight functionality removed');
  }

  enterCode() {
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }

  close() {
    const targetRoute = this.returnTo === 'join-family2' ? '/home/join-family2' : '/home/join-family';
    this.router.navigate([targetRoute], { queryParams: { role: this.userRole } });
  }
}
