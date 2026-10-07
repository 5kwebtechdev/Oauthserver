import { EduHubCityService } from './eduhub-city.service';

describe('EduHubCityService state selection', () => {
  beforeEach(() => {
    localStorage.removeItem('superme_eduhub_city');
    localStorage.removeItem('superme_eduhub_state');
    sessionStorage.removeItem('superme_eduhub_auto_location');
  });

  afterEach(() => {
    localStorage.removeItem('superme_eduhub_city');
    localStorage.removeItem('superme_eduhub_state');
    sessionStorage.removeItem('superme_eduhub_auto_location');
  });

  it('defaults to Maharashtra without sending the old Mumbai city filter', () => {
    const location = new EduHubCityService();
    expect(location.filter).toEqual({ state: 'Maharashtra' });
    expect(location.hasSavedState()).toBeFalse();
  });

  it('sends only the selected state and persists it', () => {
    const location = new EduHubCityService();
    location.selectState('Jammu & Kashmir');
    expect(location.filter).toEqual({ state: 'Jammu & Kashmir' });
    expect(new EduHubCityService().filter).toEqual({ state: 'Jammu & Kashmir' });
  });

  it('lets an explicit legacy city override the selected state', () => {
    const location = new EduHubCityService();
    location.selectState('Gujarat');
    location.selectCity('Mumbai');
    expect(location.filter).toEqual({ city: 'Mumbai' });
    expect(location.state).toBe('');
  });

  it('uses resolved city and state together until the user manually selects a state', () => {
    const location = new EduHubCityService();
    location.applyResolvedLocation({ city: 'Mohali', state: 'Punjab', source: 'device' });
    expect(location.filter).toEqual({ state: 'Punjab', city: 'Mohali' });
    expect(new EduHubCityService().filter).toEqual({ state: 'Punjab', city: 'Mohali' });
    location.selectState('Punjab');
    expect(location.filter).toEqual({ state: 'Punjab' });
  });
});
