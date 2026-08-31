import { of } from 'rxjs';
import { CheckoutComponent } from './checkout.component';

describe('Checkout online-only payment', () => {
    let component: CheckoutComponent;
    let post: jasmine.Spy;
    let reset: jasmine.Spy;

    beforeEach(() => {
        post = jasmine.createSpy('post').and.returnValue(of({ payableTotal: 100 }));
        reset = jasmine.createSpy('reset');
        component = new CheckoutComponent(
            { post } as any,
            { getToken: () => '', getUserId: () => 'test-user', getUserRelationship: () => 'PARENT' } as any,
            { reset } as any,
            { error: () => undefined } as any,
            {} as any,
            { detectChanges: () => undefined } as any,
        );
        component.addressId = 1;
    });

    it('requests the checkout summary with online payment by default', () => {
        component.fetchSummary();
        expect(component.paymentMethod).toBe('ONLINE');
        expect(post.calls.mostRecent().args[1].paymentMethod).toBe('ONLINE');
    });

    it('creates an online order and opens payment without completing an unpaid order', () => {
        component.fetchSummary();
        const gateway = spyOn<any>(component, 'openRazorpay');
        component.placeOrder();
        expect(post.calls.mostRecent().args[1].paymentMethod).toBe('ONLINE');
        expect(gateway).toHaveBeenCalled();
        expect(reset).not.toHaveBeenCalled();
        expect(component.showSuccessSheet).toBeFalse();
    });
});
