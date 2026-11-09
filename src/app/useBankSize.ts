import { useEffect, useState } from 'react';

function computeBankSize(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 8;
  if (window.matchMedia('(max-width: 700px)').matches) return 1;
  if (window.matchMedia('(max-width: 1100px)').matches) return 4;
  return 8;
}

export function useBankSize(): number {
  const [size, setSize] = useState(computeBankSize);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mobile = window.matchMedia('(max-width: 700px)');
    const tablet = window.matchMedia('(max-width: 1100px)');
    const update = () => setSize(computeBankSize());
    mobile.addEventListener('change', update);
    tablet.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mobile.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return size;
}
