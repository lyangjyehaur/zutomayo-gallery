export type LightboxProvider = 'lg' | 'fb';

export const getLightboxProvider = (): LightboxProvider => {
  const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('ztmy_lightbox_provider') : null;
  if (fromStorage === 'fb' || fromStorage === 'lg') return fromStorage;
  return import.meta.env.VITE_LIGHTBOX_PROVIDER === 'fb' ? 'fb' : 'fb';
};

export const setLightboxProvider = (provider: LightboxProvider) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ztmy_lightbox_provider', provider);
};
