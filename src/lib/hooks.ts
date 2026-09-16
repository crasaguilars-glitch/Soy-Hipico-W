import { useState, useEffect } from 'react';

/**
 * Hook para detectar si la pestaña/app está activa o en segundo plano.
 * Ayuda a reducir consumo de recursos pausando procesos innecesarios.
 */
export function useAppVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsVisible(document.visibilityState === 'visible');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
