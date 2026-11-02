export type PgHostelSuitableFor = 'Boys' | 'Girls' | 'Co-ed';
export type PgHostelAccommodationType = 'PG' | 'Hostel';
export type PgHostelRoomOccupancy = 'Single' | 'Double' | 'Triple';
export type PgHostelStatus = 'Active' | 'Deactivated' | 'Verification pending';

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

export interface PgHostelListing {
  id?: number;
  entityType?: 'pg_hostel';
  name: string;
  suitableFor: PgHostelSuitableFor | '';
  phone?: string;
  email?: string;
  accommodationType: PgHostelAccommodationType | '';
  address?: string;
  country?: string;
  state?: string;
  city: string;
  description?: string;
  roomOccupancy: PgHostelRoomOccupancy[];
  amenities: PgHostelAmenity[];
  foodAvailable?: boolean | null;
  imageUrls?: string[];
  documentsVerified?: boolean;
  accountStatus?: PgHostelStatus;
  promoted?: boolean;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PgHostelPageResponse {
  content: PgHostelListing[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PgHostelFilters {
  search?: string;
  state?: string;
  city?: string;
  accommodationType?: PgHostelAccommodationType | '';
  suitableFor?: PgHostelSuitableFor | '';
  foodAvailable?: boolean | null;
}
