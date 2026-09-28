import { FamilyConnectionComponent } from './family-connection.component';

describe('My Family parent and co-parent roles', () => {
  let component: FamilyConnectionComponent;

  const members = [
    { id: 961, memberId: 336, name: 'Main Parent', relationship: 'parent', coParent: false },
    { id: 962, memberId: 337, name: 'Child', relationship: 'child', coParent: false },
    { id: 965, memberId: 340, name: 'Co-Parent', relationship: 'parent', coParent: true }
  ];

  beforeEach(() => {
    component = Object.create(FamilyConnectionComponent.prototype) as FamilyConnectionComponent;
    (component as any).coreAuthService = {
      getUserData: () => ({ id: 965, relationship: 'PARENT' }),
      isParentUser: () => true,
      setUserData: jasmine.createSpy('setUserData')
    };
    (component as any).cdr = { detectChanges: () => {} };
  });

  it('shows the main parent as creator when a co-parent is logged in', () => {
    (component as any).applyFamilyStatusResponse({
      relationship: 'PARENT', hasFamily: true, userId: 965, members
    });

    expect(component.creator?.name).toBe('Main Parent');
    expect(component.creator?.you).toBeFalse();
    expect(component.isCurrentUserCoParent).toBeTrue();
    const coParent = component.members.find(member => member.coParent === true)!;
    expect(component.getBadgeText(coParent)).toBe('Co-Parent / You');
    expect(component.canRemoveMember(component.creator!)).toBeFalse();
    component.removeMember(component.creator!);
    expect(component.showRemovePopup).toBeFalsy();
  });

  it('allows only the main parent to remove the co-parent', () => {
    (component as any).applyFamilyStatusResponse({
      relationship: 'PARENT', hasFamily: true, userId: 961, members
    });

    expect(component.creator?.name).toBe('Main Parent');
    expect(component.creator?.you).toBeTrue();
    expect(component.isCurrentUserCoParent).toBeFalse();
    expect(component.canRemoveMember(component.members.find(member => member.coParent === true)!)).toBeTrue();
  });

  it('uses coParent flags even when the fallback family response lists the co-parent as creator', () => {
    (component as any).applyFamilyDetailsResponse({ family: {
      creator: { ...members[2], you: true },
      members: [members[0], members[1]]
    } });

    expect(component.creator?.name).toBe('Main Parent');
    expect(component.members.find(member => member.coParent === true)?.you).toBeTrue();
    expect(component.canRemoveMember(component.creator!)).toBeFalse();
  });
});
