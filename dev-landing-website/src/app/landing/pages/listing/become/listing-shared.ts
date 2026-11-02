import { DEFAULT_PHONE_COUNTRY, PhoneCountry } from './phone-country';
import { ListingType } from './listing-config';

export type PgHostelSuitableFor = 'Boys' | 'Girls' | 'Co-ed';
export type PgHostelAccommodationType = 'PG' | 'Hostel';
export type PgHostelRoomOccupancy = 'Single' | 'Double' | 'Triple';

export const PG_HOSTEL_AMENITIES = [
  'Wi-Fi',
  'AC',
  'Power Backup',
  'Washing Machine',
  'Laundry',
  'CCTV',
  'Parking',
  'Housekeeping',
  'Attached Bathroom',
  'Geyser',
  'Study Table',
  'Wardrobe',
] as const;

export type PgHostelAmenity = (typeof PG_HOSTEL_AMENITIES)[number];

export interface ListingBasicData {
  name: string;
  title: string;
  phone: string;
  phoneCountry?: PhoneCountry;
  phone2?: string;
  phone3?: string;
  phone2Country?: PhoneCountry;
  phone3Country?: PhoneCountry;
  email: string;
  contactPerson: string;
  organizer: string;
  instructor: string;
  description: string;
}

export interface ListingVenueData {
  id: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface ListingDetailsData {
  address: string;
  city: string;
  state: string;
  country: string;
  exactLocation: string;

  qualifications: string;
  experience: string;
  fee: string;
  saleAmount: string;
  languages: string;
  specialization: string;
  mode: string[];
  bio: string;

  startDt: string;
  endDt: string;
  isFree: boolean;
  regLink: string;
  venues: ListingVenueData[];

  // PG / Hostel fields from the final sheet row.
  suitableFor: PgHostelSuitableFor | '';
  accommodationType: PgHostelAccommodationType | '';
  roomOccupancy: PgHostelRoomOccupancy[];
  amenities: PgHostelAmenity[];
  foodAvailable: boolean | null;
}

export interface ListingMediaData {
  images: File[];
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultBasic(): ListingBasicData {
  return {
    name: '',
    title: '',
    phone: '',
    phoneCountry: DEFAULT_PHONE_COUNTRY,
    phone2: '', phone3: '',
    phone2Country: DEFAULT_PHONE_COUNTRY, phone3Country: DEFAULT_PHONE_COUNTRY,
    email: '',
    contactPerson: '',
    organizer: '',
    instructor: '',
    description: '',
  };
}

export function defaultDetails(): ListingDetailsData {
  return {
    address: '',
    city: '',
    state: '',
    country: 'India',
    exactLocation: '',
    qualifications: '',
    experience: '',
    fee: '',
    saleAmount: '',
    languages: '',
    specialization: '',
    mode: [],
    bio: '',
    startDt: '',
    endDt: '',
    isFree: false,
    regLink: '',
    venues: [
      {
        id: makeId(),
        venueName: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
      },
    ],
    suitableFor: '',
    accommodationType: '',
    roomOccupancy: [],
    amenities: [],
    foodAvailable: null,
  };
}

export function isEventType(type: ListingType): boolean {
  return type === 'event' || type === 'workshop';
}

export function isShopType(type: ListingType): boolean {
  return ['stationary', 'bookstore', 'secondhand', 'sports'].includes(type);
}

export function isCounselorType(type: ListingType): boolean {
  return type === 'counselor';
}

export function isPgHostelType(type: ListingType): boolean {
  return type === 'pg_hostel';
}
