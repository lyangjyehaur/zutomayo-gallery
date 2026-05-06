export type ThemeMode = 'ios' | 'material'

export const detectTheme = (): ThemeMode => {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'material'
  return 'ios'
}
