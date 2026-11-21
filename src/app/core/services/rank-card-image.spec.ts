import { renderRankCardImage } from './rank-card-image';

describe('Referral code on achievement PNG', () => {
  async function artwork(width = 400, height = 540): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#c08010'; context.fillRect(0, 0, width, height);
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
  }

  it('renders the actual code in the bottom plaque at original resolution', async () => {
    const original = await artwork();
    const fill = spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callThrough();
    const result = await renderRankCardImage(original, 'REALUSER99');
    expect(result.type).toBe('image/png');
    expect(fill).toHaveBeenCalledOnceWith('REALUSER99', 200, 540 * 0.888, 152);
    const bitmap = await createImageBitmap(result);
    expect(bitmap.width).toBe(400); expect(bitmap.height).toBe(540);
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 540;
    const context = canvas.getContext('2d')!; context.drawImage(bitmap, 0, 0);
    expect(Array.from(context.getImageData(0, 0, 1, 1).data)).toEqual([192, 128, 16, 255]);
    const plaque = context.getImageData(125, 465, 150, 30).data;
    expect(Array.from(plaque).some((value, index) => index % 4 === 0 && value > 220)).toBeTrue();
    bitmap.close();
  });

  it('fits long codes inside the plaque without changing their characters', async () => {
    const fill = spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callThrough();
    const code = 'LongActualReferralCode1234567890';
    await renderRankCardImage(await artwork(), code);
    expect(fill.calls.mostRecent().args[0]).toBe(code);
    expect(fill.calls.mostRecent().args[3]).toBe(152);
  });

  it('fails clearly if the original PNG cannot be decoded', async () => {
    await expectAsync(renderRankCardImage(new Blob(['not-png'], { type: 'image/png' }), 'REALCODE'))
      .toBeRejectedWithError(/could not be decoded/);
  });
});
