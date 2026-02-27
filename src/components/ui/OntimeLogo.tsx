import { cn } from '@/lib/utils';

interface OntimeLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export function OntimeLogo({ className, variant = 'full' }: OntimeLogoProps) {
  return (
    <img
      src="/ontime-logo.png"
      alt="OnTime.Build"
      className={cn('shrink-0 object-contain logo-blue-filter', className)}
    />
  );
}
