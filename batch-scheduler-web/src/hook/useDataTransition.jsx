import { useState, useRef, useEffect } from 'react';

export function useDataTransition(real, inTransition, timeout) {
  const [timeExpired, setTimeExpired] = useState(false);
  const cache = useRef(real);

  useEffect(() => {
    if (!inTransition) cache.current = real;
  }, [inTransition, real]);

  useEffect(() => {
    let id;
    if (inTransition) {
      id = setTimeout(() => setTimeExpired(true), timeout);
    } else {
      setTimeExpired(false);
    }
    return () => clearTimeout(id);
  }, [inTransition, timeout]);

  if (inTransition && !timeExpired) return cache.current;
  else return real;
}