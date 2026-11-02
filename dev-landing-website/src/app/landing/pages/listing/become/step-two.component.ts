import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ListingConfig } from './listing-config';
import {
  ListingDetailsData,
  ListingVenueData,
  PG_HOSTEL_AMENITIES,
  PgHostelAmenity,
  PgHostelRoomOccupancy,
  defaultDetails,
  isCounselorType,
  isEventType,
  isPgHostelType,
  isShopType,
  makeId,
} from './listing-shared';

@Component({
  selector: 'app-listing-step-two',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-two.component.html',
})
export class ListingStepTwoComponent implements OnChanges {
  @Input({ required: true }) config!: ListingConfig;
  @Input() initialData: ListingDetailsData | null = null;

  @Output() next = new EventEmitter<ListingDetailsData>();
  @Output() back = new EventEmitter<void>();

  readonly modes = ['Online', 'Offline'];
  readonly pgSuitableForOptions = ['Boys', 'Girls', 'Co-ed'] as const;
  readonly pgTypeOptions = ['PG', 'Hostel'] as const;
  readonly pgRoomOptions: PgHostelRoomOccupancy[] = ['Single', 'Double', 'Triple'];
  readonly pgAmenityOptions: PgHostelAmenity[] = [...PG_HOSTEL_AMENITIES];

  form: ListingDetailsData = defaultDetails();
  submitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.initialData) {
      this.form = {
        ...this.initialData,
        mode: [...(this.initialData.mode || [])],
        venues: (this.initialData.venues || []).map((v) => ({ ...v })),
        roomOccupancy: [...(this.initialData.roomOccupancy || [])],
        amenities: [...(this.initialData.amenities || [])],
      };
    }
  }

  get isEvent(): boolean {
    return isEventType(this.config.type);
  }

  get isCounselor(): boolean {
    return isCounselorType(this.config.type);
  }

  get isShop(): boolean {
    return isShopType(this.config.type);
  }

  get isPgHostel(): boolean {
    return isPgHostelType(this.config.type);
  }

  toggleMode(mode: string): void {
    this.form.mode = this.form.mode.includes(mode)
      ? this.form.mode.filter((m) => m !== mode)
      : [...this.form.mode, mode];
  }

  toggleRoom(room: PgHostelRoomOccupancy): void {
    this.form.roomOccupancy = this.form.roomOccupancy.includes(room)
      ? this.form.roomOccupancy.filter((item) => item !== room)
      : [...this.form.roomOccupancy, room];
  }

  toggleAmenity(amenity: PgHostelAmenity): void {
    this.form.amenities = this.form.amenities.includes(amenity)
      ? this.form.amenities.filter((item) => item !== amenity)
      : [...this.form.amenities, amenity];
  }

  addVenue(): void {
    this.form.venues = [
      ...this.form.venues,
      {
        id: makeId(),
        venueName: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
      },
    ];
  }

  removeVenue(id: string): void {
    if (this.form.venues.length <= 1) return;
    this.form.venues = this.form.venues.filter((v) => v.id !== id);
  }

  trackVenue(_: number, venue: ListingVenueData): string {
    return venue.id;
  }

  get isValid(): boolean {
    if (this.isEvent) {
      return Boolean(this.form.startDt && this.form.endDt);
    }

    if (this.isCounselor) {
      return Boolean(this.form.mode.length > 0);
    }

    if (this.isPgHostel) {
      return Boolean(
        this.form.suitableFor &&
        this.form.accommodationType &&
        this.form.city?.trim(),
      );
    }

    return true;
  }

  handleNext(): void {
    this.submitted = true;
    if (!this.isValid) return;

    this.next.emit({
      ...this.form,
      mode: [...this.form.mode],
      venues: this.form.venues.map((v) => ({ ...v })),
      roomOccupancy: [...this.form.roomOccupancy],
      amenities: [...this.form.amenities],
    });
  }
}
