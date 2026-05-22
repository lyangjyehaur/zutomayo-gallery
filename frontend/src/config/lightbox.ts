export type LightboxProvider = 'lg' | 'fb';

export const getLightboxProvider = (): LightboxProvider => {
  let fromStorage: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      fromStorage = localStorage.getItem('ztmy_lightbox_provider');
    } catch {
      fromStorage = null;
    }
  }
  if (fromStorage === 'fb' || fromStorage === 'lg') return fromStorage;
  return import.meta.env.VITE_LIGHTBOX_PROVIDER === 'fb' ? 'fb' : 'fb';
};

export const setLightboxProvider = (provider: LightboxProvider) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ztmy_lightbox_provider', provider);
  } catch {
  }
};
