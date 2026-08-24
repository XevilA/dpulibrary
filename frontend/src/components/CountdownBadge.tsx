// src/components/CountdownBadge.tsx
// Displays a live countdown for borrowed books. Calls onExpire when timer hits zero.

import { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import clsx from 'clsx';

interface CountdownBadgeProps {
  expiresAt: string;
  onExpire: () => void;
  compact?: boolean;
}

export default function CountdownBadge({
  expiresAt,
  onExpire,
  compact = false,
}: CountdownBadgeProps) {
  const { secondsLeft, formatted, isExpired } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired) {
      // Slight delay so the "00:00" flash is visible before refetch
      const t = setTimeout(onExpire, 800);
      return () => clearTimeout(t);
    }
  }, [isExpired, onExpire]);

  const isUrgent = secondsLeft <= 30 && secondsLeft > 0;

  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-full',
          isUrgent
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        )}
      >
        <Clock size={10} />
        {formatted}
      </span>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold',
        isUrgent
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      )}
    >
      <Clock size={14} className="shrink-0" />
      <span className="font-mono">{formatted}</span>
      <span className="font-normal text-xs opacity-80">เหลือเวลา</span>
    </div>
  );
}
