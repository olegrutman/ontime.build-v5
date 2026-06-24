import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StructuredLocationPicker, { 
  StructuredLocation as CoStructuredLocation, 
  createEmptyLocation,
  getLocationDisplayString as getCoLocationDisplayString 
} from '@/components/change-orders/StructuredLocationPicker';
import { 
  ArrowLeft, 
  MapPin, 
  Send,
  Wrench,
  AlertTriangle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CorReason,
  AppRole,
  REASON_OPTIONS,
} from './types';

// Use the same scope types as Change Order form
type ScopeType = 'RE-FRAME' | 'ADDITION' | 'FIXING' | 'RE-INSTALL' | 'ADJUST';

const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: 'RE-FRAME', label: 'Re-frame' },
  { value: 'ADDITION', label: 'Addition' },
  { value: 'FIXING', label: 'Fixing' },
  { value: 'RE-INSTALL', label: 'Re-install' },
  { value: 'ADJUST', label: 'Adjust' },
];

interface CorFormProps {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldCrewMember {
  user_id: string;
  email: string;
  company_name: string;
}

export default function CorForm({ projectId, onClose, onSaved }: CorFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  
  // Form fields - use same location structure as Change Order
  const [structuredLocation, setStructuredLocation] = useState<CoStructuredLocation>(createEmptyLocation());
  const [scopeType, setScopeType] = useState<ScopeType>('RE-FRAME');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState<CorReason>('OWNER_REQUEST');
  
  // TC-specific: select Field Crew recipient
  const [fieldCrewMembers, setFieldCrewMembers] = useState<FieldCrewMember[]>([]);
  const [selectedFieldCrew, setSelectedFieldCrew] = useState<string>('');

  useEffect(() => {
    if (user?.id && projectId) {
      fetchUserRole();
    }
  }, [user?.id, projectId]);

  useEffect(() => {
    if (userRole === 'TRADE_CONTRACTOR') {
      fetchFieldCrewMembers();
    }
  }, [userRole, projectId]);

  const fetchUserRole = async () => {
    if (!user?.id || !projectId) return;
    
    const { data } = await supabase.rpc('get_user_project_role', {
      _project_id: projectId,
      _user_id: user.id,
    });
    
    if (data) {
      setUserRole(data as AppRole);
    }
  };

  const fetchFieldCrewMembers = async () => {
    if (!projectId) return;
    
    const { data } = await supabase.rpc('get_project_members_with_profiles', {
      _project_id: projectId,
    });
    
    if (data) {
      const fcMembers = data
        .filter((m: { project_role: string }) => m.project_role === 'FIELD_CREW')
        .map((m: { user_id: string; email: string; company_name: string }) => ({
          user_id: m.user_id,
          email: m.email,
          company_name: m.company_name,
        }));
      setFieldCrewMembers(fcMembers);
    }
  };

  const isLocationValid = () => {
    // Check if structured location has required fields
    if (!structuredLocation.location_primary) return false;
    if (structuredLocation.location_primary === 'OUTSIDE') {
      return !!structuredLocation.room_or_area;
    }
    // Inside requires at least level
    return !!structuredLocation.level;
  };

  const handleSubmit = async () => {
    if (!user?.id || !userRole) {
      toast.error('You must be logged in');
      return;
    }

    if (!isLocationValid()) {
      toast.error('Please specify at least one location field');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description of work');
      return;
    }

    // TC must select a field crew IF there are FC members on the project
    if (userRole === 'TRADE_CONTRACTOR' && fieldCrewMembers.length > 0 && !selectedFieldCrew) {
      toast.error('Please select a Field Crew');
      return;
    }

    setLoading(true);
    try {
      // Determine initial status based on who creates it
      let initialStatus: string;
      let recipientUserId: string | null = null;
      
      if (userRole === 'GC') {
        // GC creates COR → sent to TC (status: REQUESTED)
        initialStatus = 'REQUESTED';
      } else if (userRole === 'TRADE_CONTRACTOR') {
        // TC creates COR → sent to FC (status: SENT_TO_FIELD_CREW)
        initialStatus = 'SENT_TO_FIELD_CREW';
        recipientUserId = selectedFieldCrew;
      } else {
        toast.error('Only GC or TC can create Change Order Requests');
        return;
      }

      const insertData = {
        project_id: projectId,
        location: structuredLocation,
        scope_type: scopeType,
        description: description.trim(),
        reason: reason,
        status: initialStatus,
        created_by_user_id: user.id,
        recipient_user_id: recipientUserId,
      };

      const { error } = await supabase
        .from('change_order_requests')
        .insert(insertData as any);

      if (error) throw error;

      toast.success('Change Order Request created');
      onSaved();
    } catch (error) {
      console.error('Error creating COR:', error);
      toast.error('Failed to create Change Order Request');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = userRole === 'GC' || userRole === 'TRADE_CONTRACTOR';

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-background pb-safe-bottom">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
          <div className="container flex items-center h-14 px-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/10 mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">New Change Order Request</h1>
          </div>
        </header>
        <main className="container px-4 py-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
              <p className="text-muted-foreground">
                Only General Contractors and Trade Contractors can create Change Order Requests.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex items-center h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">New Change Order Request</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Label */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            Change Order Request – Pricing Optional
          </Badge>
        </div>

        {/* Location - using same picker as Change Order */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Location of Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StructuredLocationPicker
              projectId={projectId}
              value={structuredLocation}
              onChange={setStructuredLocation}
            />
          </CardContent>
        </Card>

        {/* Scope Type - using same options as Change Order */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-accent" />
              Scope of Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`px-3 py-2.5 text-sm rounded-lg border transition-all text-center font-medium ${
                    scopeType === type.value
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background border-border hover:border-accent/50'
                  }`}
                  onClick={() => setScopeType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <Label htmlFor="description">Description of Work</Label>
            <Textarea
              id="description"
              placeholder="Describe the work to be done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Reason */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={reason} onValueChange={(v) => setReason(v as CorReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* TC: Select Field Crew (Required) */}
        {userRole === 'TRADE_CONTRACTOR' && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Send to Field Crew
                <Badge variant="outline" className="text-xs ml-auto text-destructive border-destructive/30">Required</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fieldCrewMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Field Crew on this project. Add a Field Crew from the Team tab first.
                </p>
              ) : (
                <Select value={selectedFieldCrew} onValueChange={setSelectedFieldCrew}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Field Crew" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldCrewMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.company_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info about no pricing */}
        <Card className="border-0 shadow-md bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This is a work request only. 
              {userRole === 'GC' 
                ? ' Pricing will be added by the Trade Contractor after Field Crew submits hours.' 
                : ' Field Crew will submit hours, then you can add pricing before converting to a Change Order.'}
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || !isLocationValid() || !description.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {userRole === 'GC' ? 'Send to Trade Contractor' : 'Send to Field Crew'}
          </Button>
        </div>
      </main>
    </div>
  );
}
