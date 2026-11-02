export interface Product {
  id: string;
  name: string;
  description: string;
  /** Regular / list price. */
  mrp: number | null;
  /** Offer / selling price, when lower than mrp. */
  discountedPrice: number | null;
  images: string[];
  category: string;
  sku: string;
  inStock: boolean | null;
  stockStatus: string;
  brand: string;
  /** Full, unmodified API response record — use this to surface any field
   *  not explicitly mapped above (there is no fixed schema guarantee). */
  raw: Record<string, unknown>;
}
