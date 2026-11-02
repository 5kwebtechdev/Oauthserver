import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductApi } from '../api/product.api';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
    constructor(private productApi: ProductApi) { }

    getProduct(productId: string): Observable<Product> {
        return this.productApi.getProductById(productId).pipe(
            map(response => this.normalize(productId, response))
        );
    }

    private normalize(productId: string, response: unknown): Product {
        const record = this.unwrap(response);

        return {
            id: this.pickString(record, ['id', 'productId', '_id']) || productId,
            name: this.pickString(record, ['name', 'title', 'productName']) || '',
            description: this.pickString(record, ['description', 'details', 'longDescription']) || '',
            mrp: this.pickNumber(record, ['mrp', 'price', 'listPrice', 'originalPrice']),
            discountedPrice: this.pickNumber(record, ['discountedPrice', 'sellingPrice', 'salePrice', 'offerPrice']),
            images: this.pickImages(record),
            category: this.pickString(record, ['categoryName', 'category']) || '',
            sku: this.pickString(record, ['sku', 'skuCode', 'productCode']) || '',
            inStock: this.pickBoolean(record, ['inStock', 'available']),
            stockStatus: this.pickString(record, ['stockStatus', 'availabilityStatus']) || '',
            brand: this.pickString(record, ['brandName', 'brand']) || '',
            raw: record
        };
    }

    private unwrap(response: unknown): Record<string, unknown> {
        if (!response || typeof response !== 'object') return {};
        const body = response as Record<string, unknown>;
        const data = body['data'];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            return data as Record<string, unknown>;
        }
        return body;
    }

    private pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return undefined;
    }

    private pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && !Number.isNaN(value)) return value;
            if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
        }
        return null;
    }

    private pickBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'boolean') return value;
        }
        return null;
    }

    private pickImages(record: Record<string, unknown>): string[] {
        const images = record['images'];
        if (Array.isArray(images)) {
            return images.filter((item): item is string => typeof item === 'string' && !!item.trim());
        }
        const single = this.pickString(record, ['imageUrl', 'image', 'img', 'thumbnailUrl', 'logoUrl']);
        return single ? [single] : [];
    }
}
