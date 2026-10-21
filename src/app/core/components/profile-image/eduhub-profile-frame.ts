/** Exact image crops and text positions from Figma EduHub-Initials (26882:14819). */
export interface EduHubProfileFrame {
  asset: string;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  imageLeft: number;
  imageTop: number;
  textX: number;
  textY: number;
}

const frames: Record<string, EduHubProfileFrame> = {
  tutor: { asset: 'badge-frames.png', width: 70, height: 76, imageWidth: 456.25, imageHeight: 280.77, imageLeft: -15.1, imageTop: -35.58, textX: 35, textY: 23 },
  academy: { asset: 'badge-frames.png', width: 67, height: 76, imageWidth: 453.89, imageHeight: 267.89, imageLeft: -123.32, imageTop: -30.73, textX: 34, textY: 28 },
  counselor: { asset: 'educational-frames.png', width: 81, height: 87, imageWidth: 431.53, imageHeight: 269.12, imageLeft: -326.6, imageTop: -29.95, textX: 41, textY: 30 },
  event: { asset: 'badge-frames.png', width: 79, height: 87, imageWidth: 465.96, imageHeight: 283.5, imageLeft: -18.09, imageTop: -155.83, textX: 40, textY: 27 },
  stationery: { asset: 'mint-frames.png', width: 74, height: 72, imageWidth: 263.6, imageHeight: 135.42, imageLeft: -17.09, imageTop: -17.1, textX: 33, textY: 19 },
  bookstore: { asset: 'educational-frames.png', width: 74, height: 72, imageWidth: 440.2, imageHeight: 301.03, imageLeft: -227.14, imageTop: -168.04, textX: 37, textY: 20 },
  sports: { asset: 'badge-frames.png', width: 72, height: 72, imageWidth: 431.53, imageHeight: 287.68, imageLeft: -324.14, imageTop: -163.55, textX: 29, textY: 17 },
  hostel: { asset: 'educational-frames.png', width: 67, height: 72, imageWidth: 442.42, imageHeight: 275.47, imageLeft: -229.29, imageTop: -33.49, textX: 32, textY: 20 }
};

/** Resolve category metadata supplied by the card, never the listing's name. */
export function eduHubProfileFrame(category: string | null | undefined): EduHubProfileFrame | null {
  const value = String(category || '').toLowerCase().replace(/[^a-z]/g, '');
  if (/academy|academies/.test(value)) return frames['academy'];
  if (/counsel/.test(value)) return frames['counselor'];
  if (/tutor|individual/.test(value)) return frames['tutor'];
  if (/event|workshop/.test(value)) return frames['event'];
  if (/stationery|stationary/.test(value)) return frames['stationery'];
  if (/book/.test(value)) return frames['bookstore'];
  if (/sport/.test(value)) return frames['sports'];
  if (/hostel|payingguest/.test(value) || value === 'pg' || value === 'pgs') return frames['hostel'];
  return null;
}
