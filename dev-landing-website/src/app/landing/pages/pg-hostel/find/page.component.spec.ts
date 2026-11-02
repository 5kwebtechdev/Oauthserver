import { PgHostelListing } from '../../../../core/models/pg-hostel.model';
import { PgHostelPublicService } from '../../../../core/services/pg-hostel-public.service';
import { PgHostelFindPageComponent } from './page.component';
import { environment } from '../../../../../environments/environment';

describe('public PG/Hostel listing images', () => {
  const service = new PgHostelPublicService({} as never);
  const page = new PgHostelFindPageComponent(service);
  const listing = (imageUrls: string[]): PgHostelListing => ({
    name: 'Test hostel', city: 'Bengaluru', suitableFor: 'Boys',
    accommodationType: 'Hostel', roomOccupancy: [], amenities: [], imageUrls
  });

  it('uses the public backend download endpoint for filename keys', () => {
    expect(service.imageUrl(' photo one.jpg ')).toBe(
      `${environment.apiUrl}/admin/pg-hostels/download/photo%20one.jpg`
    );
  });

  it('uses the first nonempty image and tries the next image after a load failure', () => {
    const item = listing([' ', 'first.jpg', 'second.jpg']);
    expect(page.image(item)).toBe(service.imageUrl('first.jpg'));
    page.onImageError(item);
    expect(page.image(item)).toBe(service.imageUrl('second.jpg'));
    page.onImageError(item);
    expect(page.image(item)).toBe('');
  });

  it('preserves complete external URLs and ignores whitespace-only values', () => {
    expect(service.imageUrl(' https://images.example.com/hostel.jpg ')).toBe(
      'https://images.example.com/hostel.jpg'
    );
    expect(service.imageUrl('   ')).toBe('');
  });

  it('keeps a single valid image and shows the placeholder for empty or failed images', () => {
    const single = listing(['only.jpg']);
    expect(page.image(single)).toBe(service.imageUrl('only.jpg'));
    page.onImageError(single);
    expect(page.image(single)).toBe('');
    expect(page.image(listing([]))).toBe('');
  });
});
