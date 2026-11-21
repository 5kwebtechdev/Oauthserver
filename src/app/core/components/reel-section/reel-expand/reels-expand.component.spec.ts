import { ReelsExpandComponent } from './reels-expand.component';

describe('Reel playback controls', () => {
  function create() {
    const component = new ReelsExpandComponent({} as any, {} as any, {} as any);
    const postMessage = jasmine.createSpy('postMessage');
    const frame = { postMessage };
    component.youtubePlayer = { nativeElement: { contentWindow: frame } } as any;
    component.playlist = [{ youtubeEmbedUrl: 'test' }];
    return { component, frame, postMessage };
  }
  it('sends pause to the player without falsely claiming playback has stopped', () => {
    const { component, postMessage } = create();
    component.isPlaying = true;
    component.togglePlayPause(new Event('click'));
    expect(JSON.parse(postMessage.calls.mostRecent().args[0]).func).toBe('pauseVideo');
    expect(postMessage.calls.mostRecent().args[1]).toBe('https://www.youtube.com');
    expect(component.isPlaying).toBeTrue();
    component.ngOnDestroy();
  });
  it('updates the icon only from the active trusted player', () => {
    const { component, frame } = create();
    const receive = (origin: string, source: any, state: number) => (component as any).youtubeMessage({ origin, source, data: JSON.stringify({ event: 'onStateChange', info: state }) });
    receive('https://www.youtube.com', frame, 1);
    expect(component.isPlaying).toBeTrue();
    receive('https://evil.invalid', frame, 2);
    receive('https://www.youtube.com', {}, 2);
    expect(component.isPlaying).toBeTrue();
    receive('https://www.youtube.com', frame, 2);
    expect(component.isPlaying).toBeFalse();
  });
  it('pauses actual HTML video playback', () => {
    const { component } = create();
    const pause = jasmine.createSpy('pause');
    component.playlist = [{ video: 'test.mp4' }];
    component.playerVideo = { nativeElement: { paused: false, pause } } as any;
    component.togglePlayPause(new Event('click'));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(component.isPlaying).toBeFalse();
    component.ngOnDestroy();
  });
});
