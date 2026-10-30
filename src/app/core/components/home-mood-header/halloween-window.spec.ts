import { isHalloweenHeaderTime } from './home-mood-header.component';

describe('Halloween header window (Asia/Kolkata)', () => {
  it('appears only from midnight to noon on 31 October 2026', () => {
    expect(isHalloweenHeaderTime(Date.parse('2026-10-30T18:29:59.999Z'))).toBeFalse();
    expect(isHalloweenHeaderTime(Date.parse('2026-10-30T18:30:00.000Z'))).toBeTrue();
    expect(isHalloweenHeaderTime(Date.parse('2026-10-31T06:29:59.999Z'))).toBeTrue();
    expect(isHalloweenHeaderTime(Date.parse('2026-10-31T06:30:00.000Z'))).toBeFalse();
  });
});
