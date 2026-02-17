import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { TMPeriod } from './types';
import { TMPeriodStatusBadge } from './TMPeriodStatusBadge';
import { TMPeriodActions } from './TMPeriodActions';
import { TMLaborEntries } from './TMLaborEntries';
import { TMMaterialEntries } from './TMMaterialEntries';
import { TMMarkupEditor } from './TMMarkupEditor';
import { AppRole } from '@/types/organization';

interface TMPeriodCardProps {
  period: TMPeriod;
  currentRole: AppRole | null;
  canViewRates: boolean;
  canSubmitTime?: boolean;
  onUpdate: () => void;
}

export function TMPeriodCard({ period, currentRole, canViewRates, canSubmitTime = true, onUpdate }: TMPeriodCardProps) {
  const [isOpen, setIsOpen] = useState(period.status === 'OPEN');
  
  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const showFinancials = canViewRates && (period.status === 'APPROVED' || period.status === 'SUBMITTED');
  const canEditMarkup = isTC && period.status === 'OPEN';

  const formatDateRange = () => {
    const start = format(new Date(period.period_start), 'MMM d');
    const end = format(new Date(period.period_end), 'MMM d, yyyy');
    return period.period_type === 'DAILY' ? start : `${start} - ${end}`;
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatDateRange()}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {period.period_type.toLowerCase()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {showFinancials && period.final_amount !== null && (
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.final_amount)}
                </span>
              )}
              <TMPeriodStatusBadge status={period.status} />
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <div className="p-4 space-y-4">
            {/* Rejection Alert */}
            {period.status === 'REJECTED' && period.rejection_notes && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rejected:</strong> {period.rejection_notes}
                </AlertDescription>
              </Alert>
            )}

            {/* GC only sees summary after submitted */}
            {isGC ? (
              <div className="text-center py-4 text-muted-foreground">
                {period.status === 'APPROVED' && period.final_amount !== null ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.final_amount)}
                    </p>
                    <p className="text-sm">Period Total</p>
                  </div>
                ) : (
                  <p className="text-sm">Detailed entries are not visible to your role.</p>
                )}
              </div>
            ) : (
              <>
                {/* Labor Entries */}
                <TMLaborEntries 
                  period={period} 
                  currentRole={currentRole} 
                  canViewRates={canViewRates}
                  canSubmitTime={canSubmitTime}
                />

                <Separator />

                {/* Material Entries */}
                <TMMaterialEntries 
                  period={period} 
                  currentRole={currentRole} 
                  canViewCosts={canViewRates} 
                />

                {/* Markup Editor (TC only, OPEN status) */}
                {isTC && canViewRates && (
                  <>
                    <Separator />
                    <TMMarkupEditor 
                      period={period} 
                      isEditable={canEditMarkup} 
                      onUpdate={onUpdate} 
                    />
                  </>
                )}

                {/* Approved Period Totals */}
                {period.status === 'APPROVED' && canViewRates && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Labor</p>
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.labor_total || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Materials</p>
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.material_total || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-bold text-lg">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.final_amount || 0)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <TMPeriodActions period={period} currentRole={currentRole} onAction={onUpdate} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
