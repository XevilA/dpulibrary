// src/hooks/useCountdown.ts — Real-time countdown hook for borrowed books

import { useState, useEffect, useCallback } from 'react';
import { differenceInSeconds } from 'date-fns';

interface CountdownResult {
  secondsLeft: number;
  isExpired: boolean;
  formatted: string; // MM:SS
}

export function useCountdown(expiresAt: string | null): CountdownResult {
  const getSecondsLeft = useCallback((): number => {
    if (!expiresAt) return 0;
    const diff = differenceInSeconds(new Date(expiresAt), new Date());
    return Math.max(0, diff);
  }, [expiresAt]);

  const [secondsLeft, setSecondsLeft] = useState<number>(getSecondsLeft);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    // Set initial value
    setSecondsLeft(getSecondsLeft());

    const timer = setInterval(() => {
      const remaining = getSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, getSecondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0 && expiresAt !== null,
    formatted,
  };
}
