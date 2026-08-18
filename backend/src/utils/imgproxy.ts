/**
 * imgproxy 會依來源圖片格式自動補上下載副檔名，因此 filename option
 * 只能傳入不含最後一段副檔名的 basename，避免產生 image.jpg.jpg。
 */
export const toImgproxyFilenameBase = (filename: string): string => {
  const lastSeparator = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const lastDot = filename.lastIndexOf('.');

  if (lastDot <= lastSeparator + 1 || lastDot === filename.length - 1) {
    return filename;
  }

  return filename.slice(0, lastDot);
};

export const encodeImgproxySourceUrl = (sourceUrl: string): string => (
  Buffer.from(sourceUrl).toString('base64url')
);
