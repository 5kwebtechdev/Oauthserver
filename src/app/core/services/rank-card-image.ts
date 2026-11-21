/** Add the API referral code to the existing blank plaque without redrawing art. */
export async function renderRankCardImage(artwork: Blob, referralCode: string): Promise<Blob> {
  const url = URL.createObjectURL(artwork);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Your achievement image could not be prepared. Please try again.')), 8000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Your achievement image could not be decoded. Please try again.')); };
      image.src = url;
    });
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your achievement image could not be prepared. Please try again.');
    context.drawImage(image, 0, 0);

    // All ten original exports share this plaque position, including the
    // smaller silver/blue exports. Coordinates scale with native resolution.
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.888;
    const maxWidth = canvas.width * 0.38;
    let size = canvas.width * 0.048;
    const font = () => `700 ${size}px Arial, sans-serif`;
    context.font = font();
    while (context.measureText(referralCode).width > maxWidth && size > 8) {
      size -= 1;
      context.font = font();
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0, 0, 0, 0.65)';
    context.shadowBlur = canvas.width * 0.002;
    context.shadowOffsetY = canvas.height * 0.001;
    context.fillText(referralCode, centerX, centerY, maxWidth);

    return await new Promise<Blob>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Your achievement image could not be saved. Please try again.')), 8000);
      canvas.toBlob(result => {
        clearTimeout(timer);
        if (result) resolve(result);
        else reject(new Error('Your achievement image could not be saved. Please try again.'));
      }, 'image/png');
    });
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = '';
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
