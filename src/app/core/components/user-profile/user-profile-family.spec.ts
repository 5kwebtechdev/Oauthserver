import { of } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';

describe('Parent profile family summary', () => {
  it('uses family status data for creator, co-parent and children without reward stats', () => {
    const profile = Object.create(UserProfileComponent.prototype) as UserProfileComponent;
    profile.user = { relationship: 'PARENT' };
    (profile as any).coreAuthService = {
      getUserData: () => ({ id: 10, relationship: 'PARENT' }),
      excludeRemovedFamilyMembers: (members: any[]) => members
    };
    (profile as any).authService = { getFamilyStatus: () => of({
      hasFamily: true,
      members: [
        { id: 10, name: 'Creator', age: 40, relationship: 'PARENT', coParent: false },
        { id: 11, name: 'Other parent', age: 38, relationship: 'CO_PARENT', coParent: true },
        { id: 12, name: 'Child', age: 9, relationship: 'CHILD' }
      ]
    }) };

    expect(profile.isParentProfile()).toBeTrue();
    (profile as any).loadFamilyDetails();
    expect(profile.creator?.name).toBe('Creator');
    expect(profile.familyMemberRole(profile.creator!, true)).toBe('Parent / Creator');
    expect(profile.members.map(member => profile.familyMemberRole(member))).toEqual(['Parent', 'Child']);
    expect(profile.members.map(member => member.age)).toEqual([38, 9]);
  });

  it('keeps Child profiles on the existing reward-stats path', () => {
    const profile = Object.create(UserProfileComponent.prototype) as UserProfileComponent;
    profile.user = { relationship: 'CHILD' };
    (profile as any).coreAuthService = { getUserData: () => ({ relationship: 'CHILD' }) };
    expect(profile.isParentProfile()).toBeFalse();
  });
});
