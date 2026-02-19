import { cn } from '@/lib/utils';

interface OntimeLogoProps {
  className?: string;
}

export function OntimeLogo({ className }: OntimeLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      {/* Hexagonal shield */}
      <path
        d="M50 5 L90 27.5 V72.5 L50 95 L10 72.5 V27.5 Z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
      {/* Building icon */}
      <g transform="translate(25, 22)" fill="hsl(var(--primary-foreground))">
        {/* Main building */}
        <rect x="10" y="20" width="30" height="38" rx="2" />
        {/* Tower */}
        <rect x="18" y="8" width="14" height="50" rx="1" />
        {/* Antenna */}
        <rect x="24" y="2" width="2" height="8" />
        {/* Windows - left column */}
        <rect x="14" y="26" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="14" y="34" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="14" y="42" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        {/* Windows - center column */}
        <rect x="22" y="16" width="6" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="22" y="26" width="6" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="22" y="34" width="6" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="22" y="42" width="6" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        {/* Windows - right column */}
        <rect x="31" y="26" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="31" y="34" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        <rect x="31" y="42" width="5" height="5" rx="0.5" fill="hsl(var(--primary))" opacity="0.6" />
        {/* Door */}
        <rect x="21" y="50" width="8" height="8" rx="1" fill="hsl(var(--primary))" opacity="0.4" />
      </g>
    </svg>
  );
}
