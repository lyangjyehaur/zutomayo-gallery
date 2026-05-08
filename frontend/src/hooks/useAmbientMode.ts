import { useState, useEffect } from 'react';

const AMBIENT_CLASS = 'ambient-midnight';

export function useAmbientMode() {
  const [isAmbient, setIsAmbient] = useState(false);

  useEffect(() => {
    if (document.body.classList.contains(AMBIENT_CLASS)) {
      setIsAmbient(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has('midnight')) {
      setIsAmbient(true);
      document.body.classList.add(AMBIENT_CLASS);
      return;
    }

    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() < 5) {
      setIsAmbient(true);
      document.body.classList.add(AMBIENT_CLASS);
    }
  }, []);

  return { isAmbient };
}
