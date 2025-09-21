import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';

@Component({
  standalone: true,
  selector: 'family-member',
  imports: [CommonModule, IonicModule, MindfulBadgeComponent],
  template: `
    <div class="member-detail">
      <div class="member-info">
        <div class="avtar-img">
          <img *ngIf="avatarUrl; else placeholder" [src]="avatarUrl" alt="{{name}} avatar" />
          <ng-template #placeholder>
            <div class="avatar-placeholder"></div>
          </ng-template>
        </div>
        <div class="name-age">
          <h1>{{ name }}</h1>
          <p>{{ age }} years old</p>
        </div>
      </div>

      <mindful-badge
        text="Active"
        type="green"
        [inactive]="!active"
        [active]="active"
        (click)="toggleActive()"
      ></mindful-badge>
    </div>
  `,
  styles: [
    `
    :host { display: block; }
    .member-detail{
      display: flex;
      width: 72px;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .member-info{
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 2px;
      align-self: stretch;
    }

    .avtar-img{
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      aspect-ratio: 1/1;
      border-radius: 80px;
      border: 1px solid #000;
      opacity: 0.2;
      background: #282527;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avtar-img img{
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-placeholder{
      width: 48px;
      height: 48px;
      background: #e0e0e0;
      border-radius: 50%;
    }

    .name-age{
      display: flex;
      width: 63px;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .name-age h1{
      color: #282527;
      text-align: center;
      font-family: Fredoka, sans-serif;
      font-size: 13px;
      font-style: normal;
      font-weight: 500;
      line-height: 140%;
      align-self: stretch;
      margin-bottom: 0px;
    }

    .name-age p{
      color: rgba(40, 37, 39, 0.70);
      font-family: Nunito, sans-serif;
      font-size: 10px;
      font-style: normal;
      font-weight: 500;
      align-self: stretch;
      line-height: 140%;
      margin-bottom: 0px;
    }
    `
  ]
})
export class FamilyMemberComponent {
  @Input() name: string = '';
  @Input() age: string = '';
  @Input() active: boolean = false;
  @Input() avatarUrl?: string;

  @Output() activeChange = new EventEmitter<boolean>();

  toggleActive() {
    this.active = !this.active;
    this.activeChange.emit(this.active);
  }
}
