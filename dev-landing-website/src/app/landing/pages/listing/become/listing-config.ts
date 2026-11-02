export type ListingType =
  | 'stationary'
  | 'bookstore'
  | 'secondhand'
  | 'sports'
  | 'counselor'
  | 'event'
  | 'workshop'
  | 'pg_hostel';

export interface ListingConfig {
  type: ListingType;
  entityType: string;
  eyebrow: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  benefits: string[];
  steps: string[];
  successTitle: string;
  successCopy: string;
}

export const LISTING_CONFIGS: Record<ListingType, ListingConfig> = {
  stationary: {
    type: 'stationary',
    entityType: 'stationary',
    eyebrow: 'List. Connect. Grow.',
    titlePrefix: 'Bring Your',
    titleHighlight: 'Stationery Shop Online',
    description:
      'List your stationery shop on SuperMe and help students and parents discover trusted stores near them.',
    benefits: ['Reach nearby families', 'Simple listing process', 'Grow local visibility'],
    steps: ['Business\nDetails', 'Location &\nContact', 'Photos &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  bookstore: {
    type: 'bookstore',
    entityType: 'bookstore',
    eyebrow: 'Books. Learners. Community.',
    titlePrefix: 'List Your',
    titleHighlight: 'Bookstore',
    description:
      'Help students and families discover your bookstore, educational books, guides and learning resources on SuperMe.',
    benefits: ['Reach more readers', 'Trusted discovery', 'Local visibility'],
    steps: ['Business\nDetails', 'Location &\nContact', 'Photos &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  secondhand: {
    type: 'secondhand',
    entityType: 'secondhand',
    eyebrow: 'Reuse. Save. Learn.',
    titlePrefix: 'List',
    titleHighlight: 'Second-Hand Books',
    description:
      'Make quality used books easier to discover for students and families looking for affordable learning resources.',
    benefits: ['Reach student buyers', 'Promote affordable books', 'Support reuse'],
    steps: ['Listing\nDetails', 'Location &\nContact', 'Photos &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  sports: {
    type: 'sports',
    entityType: 'sports',
    eyebrow: 'Play. Perform. Grow.',
    titlePrefix: 'List Your',
    titleHighlight: 'Sports Shop',
    description:
      'Showcase your sports shop to students, parents and young athletes searching for trusted sports gear nearby.',
    benefits: ['Reach young athletes', 'Promote your offers', 'Grow local visibility'],
    steps: ['Business\nDetails', 'Location &\nContact', 'Photos &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  counselor: {
    type: 'counselor',
    entityType: 'counselor',
    eyebrow: 'Guide. Support. Empower.',
    titlePrefix: 'Join as a',
    titleHighlight: 'Counsellor',
    description:
      'Create your SuperMe counsellor profile and connect with students and families looking for trusted guidance.',
    benefits: ['Build trusted visibility', 'Reach more families', 'Show your expertise'],
    steps: ['About\nYou', 'Professional\nDetails', 'Profile &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  event: {
    type: 'event',
    entityType: 'event',
    eyebrow: 'Discover. Participate. Connect.',
    titlePrefix: 'List an',
    titleHighlight: 'Event',
    description:
      'Publish educational, student-focused and community events on SuperMe so families can discover what is happening around them.',
    benefits: ['Reach interested families', 'Share event details', 'Support multiple venues'],
    steps: ['Event\nDetails', 'Schedule &\nVenue', 'Media &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  workshop: {
    type: 'workshop',
    entityType: 'workshop',
    eyebrow: 'Learn. Practice. Create.',
    titlePrefix: 'List a',
    titleHighlight: 'Workshop',
    description:
      'Share workshops that help students learn new skills, explore interests and grow through practical experiences.',
    benefits: ['Reach learners', 'Share workshop details', 'Support multiple venues'],
    steps: ['Workshop\nDetails', 'Schedule &\nVenue', 'Media &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },

  pg_hostel: {
    type: 'pg_hostel',
    entityType: 'pg_hostel',
    eyebrow: 'Stay. Study. Feel at Home.',
    titlePrefix: 'List Your',
    titleHighlight: 'PG / Hostel',
    description:
      'Help students and families discover trusted PG and hostel accommodation with clear room, food and amenity details.',
    benefits: ['Reach students and parents', 'Show rooms and amenities', 'Simple verification flow'],
    steps: ['Listing\nDetails', 'Rooms &\nAmenities', 'Photos &\nSubmit'],
    successTitle: "You're on your way!",
    successCopy:
      "We have received your submission. Our team will review your listing and contact you on your provided phone number and email address within 2 business days.",
  },
};
