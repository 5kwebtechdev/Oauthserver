import { SecondHandBooksComponent } from './second-hand-books.component';

describe('Book listing photo and price step', () => {
  let component: SecondHandBooksComponent;

  beforeEach(() => {
    component = new SecondHandBooksComponent(null!, null!, null!, null!, null!, null!, null!);
    component.sellerStep = 3;
    component.seller.originalPrice = '5800';
    component.seller.sellingPrice = '1000';
  });

  afterEach(() => {
    [0, 1, 2].forEach(index => component.removeSellerPhoto(index));
  });

  function selectPhoto(index: number, file = new File(['book photo'], 'book.jpg', { type: 'image/jpeg' })): void {
    const input = document.createElement('input');
    input.type = 'file';
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    component.onSellerPhotoSelected({ target: input } as unknown as Event, index);
  }

  it('accepts input photos when the mobile file plugin replaces window.File', () => {
    const photo = new File(['book photo'], 'book.jpg', { type: 'image/jpeg' });
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'File')!;
    try {
      Object.defineProperty(window, 'File', { configurable: true, value: class CordovaFile {} });
      [0, 1, 2].forEach(index => selectPhoto(index, photo));
      expect(photo instanceof File).toBeFalse();
      expect(component.isSellerStepReady).toBeTrue();
      component.continueSellerFlow();
      expect(component.sellerStep).toBe(4);
      expect(component.isSellerStepReady).toBeFalse();
      expect(component.sellerStepRequirement).toBe('Select your state to continue.');
    } finally {
      Object.defineProperty(window, 'File', originalDescriptor);
    }
  });

  it('requires all three photos and becomes unavailable again after one is removed', () => {
    [0, 1].forEach(index => selectPhoto(index));
    expect(component.isSellerStepReady).toBeFalse();
    expect(component.sellerStepRequirement).toContain('all three');
    selectPhoto(2);
    expect(component.isSellerStepReady).toBeTrue();
    component.removeSellerPhoto(1);
    expect(component.isSellerStepReady).toBeFalse();
  });

  it('rejects empty images and explains invalid prices', () => {
    selectPhoto(0, new File([], 'empty.jpg', { type: 'image/jpeg' }));
    expect(component.sellerPhotos[0]).toBeNull();
    [0, 1, 2].forEach(index => selectPhoto(index));
    component.seller.sellingPrice = '6000';
    expect(component.isSellerStepReady).toBeFalse();
    expect(component.sellerStepRequirement).toContain('cannot be higher');
    component.seller.sellingPrice = '0';
    expect(component.isSellerStepReady).toBeFalse();
    component.setSellerListingType('donate');
    expect(component.isSellerStepReady).toBeTrue();
  });

  it('requests location and contact only on the final step', () => {
    [0, 1, 2].forEach(index => selectPhoto(index));
    component.continueSellerFlow();
    Object.assign(component.seller, { state: 'Maharashtra', city: 'Mumbai', address: 'Test address', contactNumber: '9999999999' });
    expect(component.isSellerStepReady).toBeFalse();
    expect(component.sellerStepRequirement).toContain('Confirm');
    component.seller.confirmed = true;
    expect(component.isSellerStepReady).toBeTrue();
    expect(component.sellerStepRequirement).toBe('');
  });
});
