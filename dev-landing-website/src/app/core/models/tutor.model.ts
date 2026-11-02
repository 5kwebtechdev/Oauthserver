export interface ITutor {
  id?: string;
  name: string;
  avatar?: string;
  profilePicUrl?: string;
  rating?: number; // hearts or rating count
  experience?: string; // e.g. '3-5 years Exp'
  subjects?: string[];
  classes?: string[];
  availableHours?: string;
  availability?: string;
  hourlyRate?: number;
  price?: number;
  hearts?: number;
  priceUnit?: string;
  totalStudents?: number;
  location?: string;
  // Additional fields from API
  champsLiked?: number;
  likes?: any[];
  qualification?: string;
  description?: string;
  levels?: string[];
  contactModes?: string[];
  startTime?: string;
  endTime?: string;
  fees?: number;
  feeType?: string;
  categoryMappings?: any[];
  createdAt?: string;
}

function toNum(v: any): number {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

export function normalizeTutor(src: any): ITutor {
  if (!src) return { name: 'Unknown' };

  const subjects = Array.isArray(src.subjects)
    ? src.subjects
    : typeof src.subjects === 'string' && src.subjects.length
      ? src.subjects.split(',').map((s: string) => s.trim())
      : src.subjects || [];

  const classes = Array.isArray(src.classes)
    ? src.classes
    : typeof src.classes === 'string' && src.classes.length
      ? src.classes.split(',').map((s: string) => s.trim())
      : src.classes || [];

  return {
    id: src.id || src.name?.toString()?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-') || undefined,
    name: src.name || 'Unknown',
    avatar: src.avatar || src.image || src.photo || '/assets/images/default-tutor-avatar.png',
    profilePicUrl: src.profilePicUrl || src.profile_pic_url || src.avatar || src.image || src.photo || undefined,
    rating: toNum(src.rating) || toNum(src.hearts) || 0,
    experience: formatExperience(src.experience) || (src.years ? `${src.years} years Exp` : undefined),
    subjects: subjects,
    classes: classes,
    availableHours: src.availableHours || src.hours || src.availability,
    hourlyRate: src.hourlyRate ?? src.price,
    price: src.price ?? src.hourlyRate,
    hearts: toNum(src.hearts) || toNum(src.rating) || undefined,
    priceUnit: typeof src.priceUnit === 'string' && /^\s*\/\s*(?:(?:per\s*)?hour|hr)\s*$/i.test(src.priceUnit)
      ? '/ Hour'
      : (src.priceUnit || src.priceUnit === '' ? src.priceUnit : '/ Hour')
    ,
    // map additional API fields defensively
    champsLiked: src.champsLiked ?? src.champsLikedCount ?? (Array.isArray(src.likes) ? src.likes.length : undefined),
    likes: src.likes ?? undefined,
    qualification: src.qualification ?? src.subjectExpertise ?? undefined,
    description: src.description ?? src.bio ?? undefined,
    levels: src.levels ?? classes,
    contactModes: src.contactModes ?? src.contact_modes ?? undefined,
    startTime: src.startTime ?? src.start_time ?? undefined,
    endTime: src.endTime ?? src.end_time ?? undefined,
    fees: src.fees ?? src.fee ?? undefined,
    feeType: src.feeType ?? src.fee_type ?? undefined,
    categoryMappings: src.categoryMappings ?? src.category_mappings ?? undefined,
    availability: src.availability ?? src.schedule ?? undefined
    ,
    totalStudents: src.totalStudents ?? src.total_students ?? undefined,
    location: src.location ?? src.city ?? src.address ?? undefined,
    createdAt: src.createdAt ?? undefined
  };
}

/**
 * Helper function to format experience
 */
export function formatExperience(exp: string): string {
  const expMap: Record<string, string> = {
    'FRESHER': 'Fresher',
    'PLUS_1': '1+ years Exp',
    'PLUS_2': '2+ years Exp',
    'PLUS_3': '3+ years Exp',
    'PLUS_5': '5+ years Exp',
    'PLUS_10': '10+ years Exp'
  };
  return expMap[exp] || exp || 'Fresher';
}
