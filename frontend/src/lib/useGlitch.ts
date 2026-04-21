import { useEffect, useRef } from 'react';

export function useGlitch() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const updateVars = () => {
      // Randomize animation durations and delays for different layers
      el.style.setProperty('--g-dur-1', `${Math.random() * 2 + 1.5}s`);
      el.style.setProperty('--g-dur-2', `${Math.random() * 3 + 2}s`);
      el.style.setProperty('--g-dur-3', `${Math.random() * 4 + 3}s`);
      el.style.setProperty('--g-dur-4', `${Math.random() * 1.5 + 1}s`);
      el.style.setProperty('--g-dur-5', `${Math.random() * 4 + 4}s`);
      el.style.setProperty('--g-dur-6', `${Math.random() * 3 + 2}s`); // Gradient border animation
      
      el.style.setProperty('--g-del-1', `${Math.random() * 2}s`);
      el.style.setProperty('--g-del-2', `${Math.random() * 3}s`);
      el.style.setProperty('--g-del-3', `${Math.random() * 4}s`);
      el.style.setProperty('--g-del-4', `${Math.random() * 2}s`);
      el.style.setProperty('--g-del-5', `${Math.random() * 5}s`);
      el.style.setProperty('--g-del-6', `${Math.random() * 2}s`); // Gradient border delay

      // Randomize glitch intensity/scale
      el.style.setProperty('--g-scale', `${Math.random() * 0.5 + 0.8}`);
    };

    updateVars();
    const id = setInterval(updateVars, 2000 + Math.random() * 2000);

    return () => clearInterval(id);
  }, []);

  return ref;
}
