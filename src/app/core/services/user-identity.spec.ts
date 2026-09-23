import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { displayName } from '../models/display-name';
import { mapVibeToChildInfo } from '../models/child-info.model';

describe('Active family member identity', () => {
  let userData: BehaviorSubject<any>;
  let service: UserService;
  let savedProfile: string | null;
  let savedStats: string | null;

  beforeEach(() => {
    savedProfile = localStorage.getItem('user_profile');
    savedStats = localStorage.getItem('user_stats');
    localStorage.setItem('user_profile', JSON.stringify({ userId: 2, name: 'Previous Child', username: 'old-child' }));
    userData = new BehaviorSubject<any>({ id: 1, name: 'Parent Full Name', relationship: 'PARENT' });
    service = new UserService(null!, null!, null!, { userData$: userData.asObservable() } as AuthService);
  });

  afterEach(() => {
    userData.complete();
    for (const [key, value] of [['user_profile', savedProfile], ['user_stats', savedStats]]) {
      if (value === null) localStorage.removeItem(key!);
      else localStorage.setItem(key!, value!);
    }
  });

  it('replaces cached identities across parent, child two, parent, and child one', () => {
    const seen: string[] = [];
    service.userProfile$.subscribe(profile => { if (profile) seen.push(profile.name); });
    userData.next({ id: 3, name: 'Child Two Full Name', username: 'child-two', relationship: 'CHILD' });
    userData.next({ id: 1, name: 'Parent Full Name', relationship: 'PARENT' });
    userData.next({ id: 2, name: 'Child One Full Name', relationship: 'CHILD' });
    expect(seen).toEqual(['Parent Full Name', 'Child Two Full Name', 'Parent Full Name', 'Child One Full Name']);
    expect(service.getUserProfile()?.username).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('user_profile')!).userId).toBe(2);
  });

  it('updates full names for the same account and clears the profile on logout', () => {
    userData.next({ id: 1, name: 'Updated Parent Name', relationship: 'PARENT' });
    expect(service.getUserName()).toBe('Updated Parent Name');
    userData.next(null);
    expect(service.getUserProfile()).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
  });

  it('prefers full names over usernames and avatar labels across family data shapes', () => {
    expect(displayName({ fullName: 'Child Full Name', name: 'Short', username: 'handle', avatarName: 'Avatar' })).toBe('Child Full Name');
    expect(displayName({ name: 'Child Full Name', username: 'handle' })).toBe('Child Full Name');
    expect(displayName({ avatarName: 'Avatar' })).toBe('');
    expect(mapVibeToChildInfo({ userId: 2, userName: 'handle', profile: { name: 'Child Full Name' } }, '').name).toBe('Child Full Name');
  });
});
