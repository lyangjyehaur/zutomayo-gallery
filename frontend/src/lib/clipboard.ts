export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
    }
  }

  const el = document.createElement('div');
  el.contentEditable = 'true';
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  el.style.position = 'fixed';
  el.style.left = '0';
  el.style.top = '0';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.opacity = '0.01';
  el.style.zIndex = '99999';
  el.style.overflow = 'hidden';
  el.style.whiteSpace = 'pre';
  el.style.pointerEvents = 'none';

  const fbContainer = document.querySelector('.fancybox__container');
  const parent = fbContainer || document.body;
  parent.appendChild(el);

  el.focus();

  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
  }

  sel?.removeAllRanges();
  parent.removeChild(el);
  return success;
}