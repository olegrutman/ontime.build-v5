import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, HardHat, Truck, Check, Loader2 } from 'lucide-react';
import { ChangeOrderParticipant } from '@/types/changeOrderProject';

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface ParticipantActivationPanelProps {
  changeOrderId: string;
  participants: ChangeOrderParticipant[];
  availableFieldCrews: Organization[];
  availableSuppliers: Organization[];
  isTC: boolean;
  onActivateFC: (orgId: string) => Promise<void>;
  onActivateSupplier: (orgId: string) => Promise<void>;
  onDeactivate: (participantId: string) => Promise<void>;
  isActivating?: boolean;
}

export function ParticipantActivationPanel({
  changeOrderId,
  participants,
  availableFieldCrews,
  availableSuppliers,
  isTC,
  onActivateFC,
  onActivateSupplier,
  onDeactivate,
  isActivating = false,
}: ParticipantActivationPanelProps) {
  const [selectedFC, setSelectedFC] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  const activeFC = participants.find((p) => p.role === 'FC' && p.is_active);
  const activeSupplier = participants.find((p) => p.role === 'SUPPLIER' && p.is_active);
  const fcParticipants = participants.filter((p) => p.role === 'FC');
  const supplierParticipants = participants.filter((p) => p.role === 'SUPPLIER');

  const handleActivateFC = async () => {
    if (!selectedFC) return;
    await onActivateFC(selectedFC);
    setSelectedFC('');
  };

  const handleActivateSupplier = async () => {
    if (!selectedSupplier) return;
    await onActivateSupplier(selectedSupplier);
    setSelectedSupplier('');
  };

  if (!isTC) {
    // Read-only view for non-TC users
    return (
      <Card data-sasha-card="Participants">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fcParticipants.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-orange-600" />
                <span className="text-sm">Field Crew</span>
              </div>
              <Badge variant={activeFC ? 'default' : 'secondary'}>
                {activeFC ? activeFC.organization?.name || 'Active' : 'Not assigned'}
              </Badge>
            </div>
          )}
          {supplierParticipants.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Supplier</span>
              </div>
              <Badge variant={activeSupplier ? 'default' : 'secondary'}>
                {activeSupplier ? activeSupplier.organization?.name || 'Active' : 'Not assigned'}
              </Badge>
            </div>
          )}
          {fcParticipants.length === 0 && supplierParticipants.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No Field Crew or Supplier assigned yet.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Activate Participants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Crew Activation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-orange-600" />
            <Label className="font-medium">Field Crew</Label>
          </div>
          
          {activeFC ? (
            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">{activeFC.organization?.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(activeFC.id)}
                disabled={isActivating}
              >
                Deactivate
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedFC} onValueChange={setSelectedFC}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select Field Crew" />
                </SelectTrigger>
                <SelectContent>
                  {availableFieldCrews.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                  {availableFieldCrews.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No Field Crews available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleActivateFC}
                disabled={!selectedFC || isActivating}
              >
                {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Field Crew will log labor hours for this change order.
          </p>
        </div>

        {/* Supplier Activation */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <Label className="font-medium">Supplier</Label>
          </div>
          
          {activeSupplier ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{activeSupplier.organization?.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(activeSupplier.id)}
                disabled={isActivating}
              >
                Deactivate
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                  {availableSuppliers.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No Suppliers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleActivateSupplier}
                disabled={!selectedSupplier || isActivating}
              >
                {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Supplier will provide material pricing for this change order.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
