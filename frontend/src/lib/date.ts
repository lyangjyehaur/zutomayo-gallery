/**
 * 解析 MV 日期字符串（支援 YYYY/MM/DD、YYYY-MM-DD、ISO 字串等）
 * 使用本地時區解析，避免 UTC 偏移導致日期錯位
 */
function parseMVDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.trim().replace(/\//g, '-');
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
  // fallback：嘗試標準 Date 解析
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

const LANG_TO_LOCALE: Record<string, string> = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  'zh-HK': 'zh-HK',
  ja: 'ja-JP',
  ko: 'ko-KR',
  en: 'en-US',
  es: 'es-ES',
};

/**
 * 依當前語系格式化 MV 發行日期
 * - CJK (ja / zh-* / ko): YYYY.MM.DD
 * - en: MMM DD, YYYY
 * - es: DD/MM/YYYY
 */
export function formatMVDate(dateStr: string, lang: string): string {
  const d = parseMVDate(dateStr);
  if (!d) return dateStr;

  const locale = LANG_TO_LOCALE[lang] || 'zh-TW';

  switch (lang) {
    case 'ja':
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(d)
        .replace(/\//g, '.');

    case 'zh-TW':
    case 'zh-CN':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(d)
        .replace(/\//g, '.');

    case 'zh-HK':
      return new Intl.DateTimeFormat('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

    case 'ko':
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

    case 'en':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);

    case 'es':
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d).replace(/ (\w{3,}) /, ' $1. ');

    default:
      return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(d)
        .replace(/\//g, '.');
  }
}
