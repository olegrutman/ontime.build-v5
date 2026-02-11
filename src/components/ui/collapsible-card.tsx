import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function CollapsibleCard({
  title,
  description,
  icon,
  defaultOpen = true,
  children,
  className,
  headerRight,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={className}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {headerRight}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </div>
            </div>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
