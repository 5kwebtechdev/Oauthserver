import { firstValueFrom, of } from 'rxjs';
import { BirthdayPopupStatusService } from './birthday-popup-status.service';

describe('BirthdayPopupStatusService', () => {
  const userId = 975;
  const sessionKeys = ['birthday_popup_status_975_login-a', 'birthday_popup_status_975_login-b'];

  afterEach(() => {
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    localStorage.removeItem('login_time');
  });

  it('shows a true response once and does not request again during the same login', async () => {
    localStorage.setItem('login_time', 'login-a');
    const api = jasmine.createSpyObj('CoinApi', ['getBirthdayPopupStatus']);
    api.getBirthdayPopupStatus.and.returnValue(of({
      success: true, userId, isBirthdayToday: true,
      shouldShowPopup: true, alreadyClaimedThisYear: false
    }));
    const status = new BirthdayPopupStatusService(api);

    expect(await firstValueFrom(status.checkOnce(userId))).toBeTrue();
    expect(status.consume(userId)).toBeTrue();
    expect(status.consume(userId)).toBeFalse();
    expect(await firstValueFrom(status.checkOnce(userId))).toBeTrue();
    expect(status.consume(userId)).toBeFalse();
    expect(api.getBirthdayPopupStatus).toHaveBeenCalledTimes(1);

    // A recreated Home component/service after refresh still cannot reopen it.
    const recreated = new BirthdayPopupStatusService(api);
    expect(await firstValueFrom(recreated.checkOnce(userId))).toBeFalse();
    expect(api.getBirthdayPopupStatus).toHaveBeenCalledTimes(1);
  });

  it('uses the backend decision on the next login, including false on the same-year birthday', async () => {
    localStorage.setItem('login_time', 'login-a');
    const api = jasmine.createSpyObj('CoinApi', ['getBirthdayPopupStatus']);
    api.getBirthdayPopupStatus.and.returnValues(
      of({ success: true, userId, isBirthdayToday: true, shouldShowPopup: true, alreadyClaimedThisYear: false }),
      of({ success: true, userId, isBirthdayToday: true, shouldShowPopup: false, alreadyClaimedThisYear: false })
    );
    const status = new BirthdayPopupStatusService(api);
    expect(await firstValueFrom(status.checkOnce(userId))).toBeTrue();
    expect(status.consume(userId)).toBeTrue();

    localStorage.setItem('login_time', 'login-b');
    expect(await firstValueFrom(status.checkOnce(userId))).toBeFalse();
    expect(status.consume(userId)).toBeFalse();
    expect(api.getBirthdayPopupStatus).toHaveBeenCalledTimes(2);
  });
});
