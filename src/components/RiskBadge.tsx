import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const normalized = level.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-4 py-1.5 text-base',
        normalized === 'low' && 'bg-risk-low/15 text-risk-low',
        normalized === 'medium' && 'bg-risk-medium/15 text-risk-medium',
        normalized === 'high' && 'bg-risk-high/15 text-risk-high'
      )}
    >
      {level}
    </span>
  );
}
