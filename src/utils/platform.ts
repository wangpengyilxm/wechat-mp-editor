/** 是否在 Capacitor 原生壳（安卓平板 / 手机）内运行 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

export function isElectronDesktop(): boolean {
  if (typeof navigator === 'undefined') return false
  return /electron/i.test(navigator.userAgent)
}
