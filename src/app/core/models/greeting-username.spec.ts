import { greetingUsername, homeGreetingName, messageWithUsername } from './greeting-username';

describe('Self/child greeting identity', () => {
  const user = { fullName: 'Tapsya Sharma', name: 'Tapsya', username: 'tapsya_star' };

  it('prefers the username and never falls back to a real name', () => {
    expect(greetingUsername(user)).toBe('tapsya_star');
    expect(greetingUsername({ name: 'Private Name' })).toBe('there');
    expect(greetingUsername({ userName: 'child_handle' })).toBe('child_handle');
  });

  it('uses the account name only for the Home header when username is missing', () => {
    expect(homeGreetingName(user)).toBe('tapsya_star');
    expect(homeGreetingName({ name: 'Codex Temp', username: null })).toBe('Codex Temp');
    expect(homeGreetingName({ name: '  ', fullName: 'Full Name' })).toBe('Full Name');
    expect(homeGreetingName({})).toBe('there');
  });

  it('uses the username in personalized pet and popup messages', () => {
    expect(messageWithUsername('Hey Tapsya Sharma! Tapsya, how are you feeling?', user))
      .toBe('Hey tapsya_star! tapsya_star, how are you feeling?');
    expect(messageWithUsername('Welcome <Name>! <DisplayName> is here.', user))
      .toBe('Welcome tapsya_star! tapsya_star is here.');
    expect(messageWithUsername('Antapsya is a different word.', user))
      .toBe('Antapsya is a different word.');
  });
});
