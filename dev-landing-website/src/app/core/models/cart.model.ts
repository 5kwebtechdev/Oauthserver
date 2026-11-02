export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  thumbnailUrl: string;
  schoolName: string | null;
  sizeLabel: string | null;
  quantity: number;
  mrp: number;
  sellingPrice: number;
}

export interface Cart {
  items: CartItem[];
  itemsTotal: number;
  gstTotal: number;
  payableTotal: number;
}

export interface SchoolClassContext {
  schoolId: number;
  classId: number;
}

export interface AddToCartRequest {
  productId: number;
  sizeLabel: string | null;
  quantity: number;
  forUserId?: string;
  schoolId?: number;
  classId?: number;
}

export interface AddToCartInput {
  productId: number;
  categoryName: string;
  sizeLabel: string | null;
  quantity: number;
  schoolContext?: SchoolClassContext;
}

export interface UpdateCartItemRequest {
  quantity: number;
  forUserId?: string;
}

/**
 * Thrown by CartService.addItem() when a category requires a school/class
 * context that wasn't supplied (Uniform/Textbooks, pending backend classId
 * support). Lets callers distinguish this expected, known condition from a
 * genuine failure (network/backend error) instead of treating both the same.
 */
export class SchoolContextRequiredError extends Error {
  constructor(public readonly categoryName: string) {
    super(`"${categoryName}" requires a school/class selection, which isn't available yet (pending backend classId support).`);
    this.name = 'SchoolContextRequiredError';
  }
}
