export interface StationeryCategory {
  id: string;
  label: string;
  icon: string;
}

export interface StationeryProduct {
  id: string;
  title: string;
  price: string;
  mrp: string;
  img: string;
  brand?: string;
  pageCount?: number;
  tag?: string;
  outOfStock?: boolean;
}
