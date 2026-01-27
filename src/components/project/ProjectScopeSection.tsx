import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Edit, Home, Building2, ArrowUpDown, Layers, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ScopeDetails {
  id: string;
  home_type: string | null;
  floors: number | null;
  foundation_type: string | null;
  basement_type: string | null;
  basement_finish: string | null;
  stairs_type: string | null;
  has_elevator: boolean | null;
  shaft_type: string | null;
  shaft_type_notes: string | null;
  roof_type: string | null;
  has_roof_deck: boolean | null;
  roof_deck_type: string | null;
  has_covered_porches: boolean | null;
  has_balconies: boolean | null;
  balcony_type: string | null;
  decking_included: boolean | null;
  decking_type: string | null;
  decking_type_other: string | null;
  siding_included: boolean | null;
  siding_materials: any;
  siding_material_other: string | null;
  decorative_included: boolean | null;
  decorative_items: any;
  decorative_item_other: string | null;
  fascia_included: boolean | null;
  soffit_included: boolean | null;
  fascia_soffit_material: string | null;
  fascia_soffit_material_other: string | null;
  windows_included: boolean | null;
  wrb_included: boolean | null;
  ext_doors_included: boolean | null;
  num_buildings: number | null;
  stories: number | null;
  construction_type: string | null;
  construction_type_other: string | null;
  num_units: number | null;
  stories_per_unit: number | null;
  has_shared_walls: boolean | null;
}

interface ProjectScopeSectionProps {
  projectId: string;
  projectType: string;
}

function ScopeItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function BooleanItem({ label, value }: { label: string; value: boolean | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
        {value ? 'Yes' : 'No'}
      </Badge>
    </div>
  );
}

export function ProjectScopeSection({ projectId, projectType }: ProjectScopeSectionProps) {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchScope = async () => {
      const { data, error } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching scope:', error);
      } else {
        setScope(data);
      }
      setLoading(false);
    };

    fetchScope();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Scope & Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!scope) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Scope & Project Details
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/scope`)}>
            <Edit className="h-3 w-3 mr-1" />
            Add Scope
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No scope details have been added to this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSingleFamily = ['Single Family Home', 'Townhomes', 'Duplex', 'residential'].includes(projectType);
  const isMultiFamily = ['Apartments/Condos', 'Hotels', 'commercial', 'mixed_use'].includes(projectType);

  const getSidingMaterials = () => {
    const materials = scope.siding_materials || [];
    if (scope.siding_material_other) {
      materials.push(scope.siding_material_other);
    }
    return materials.length > 0 ? materials.join(', ') : null;
  };

  const getDecorativeItems = () => {
    const items = scope.decorative_items || [];
    if (scope.decorative_item_other) {
      items.push(scope.decorative_item_other);
    }
    return items.length > 0 ? items.join(', ') : null;
  };

  const getDeckingType = () => {
    if (!scope.decking_included) return null;
    return scope.decking_type_other || scope.decking_type || 'Yes';
  };

  const getConstructionType = () => {
    return scope.construction_type_other || scope.construction_type;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Scope & Project Details
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/projects/${projectId}/scope`);
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit Scope
            </Button>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Structure Section */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <Building2 className="h-3 w-3" />
              Structure
            </h4>
            {isSingleFamily && (
              <>
                <ScopeItem label="Home Type" value={scope.home_type} />
                <ScopeItem label="Floors" value={scope.floors} />
                <ScopeItem label="Foundation Type" value={scope.foundation_type} />
                {scope.basement_type && (
                  <>
                    <ScopeItem label="Basement Type" value={scope.basement_type} />
                    <ScopeItem label="Basement Finish" value={scope.basement_finish} />
                  </>
                )}
              </>
            )}
            {isMultiFamily && (
              <>
                <ScopeItem label="Number of Buildings" value={scope.num_buildings} />
                <ScopeItem label="Stories" value={scope.stories} />
                <ScopeItem label="Construction Type" value={getConstructionType()} />
                <ScopeItem label="Number of Units" value={scope.num_units} />
                <ScopeItem label="Stories per Unit" value={scope.stories_per_unit} />
                <BooleanItem label="Shared Walls" value={scope.has_shared_walls} />
              </>
            )}
          </div>

          {/* Vertical Access Section */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <ArrowUpDown className="h-3 w-3" />
              Vertical Access
            </h4>
            <ScopeItem label="Stairs Type" value={scope.stairs_type} />
            <BooleanItem label="Elevator" value={scope.has_elevator} />
            {scope.has_elevator && (
              <>
                <ScopeItem label="Shaft Type" value={scope.shaft_type} />
                <ScopeItem label="Shaft Notes" value={scope.shaft_type_notes} />
              </>
            )}
          </div>

          {/* Roof & Outdoor Section */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <Home className="h-3 w-3" />
              Roof & Outdoor
            </h4>
            <ScopeItem label="Roof Type" value={scope.roof_type} />
            <BooleanItem label="Roof Deck" value={scope.has_roof_deck} />
            {scope.has_roof_deck && (
              <ScopeItem label="Roof Deck Type" value={scope.roof_deck_type} />
            )}
            <BooleanItem label="Covered Porches" value={scope.has_covered_porches} />
            <BooleanItem label="Balconies" value={scope.has_balconies} />
            {scope.has_balconies && (
              <ScopeItem label="Balcony Type" value={scope.balcony_type} />
            )}
            {scope.decking_included && (
              <ScopeItem label="Decking Type" value={getDeckingType()} />
            )}
          </div>

          {/* Exterior Section */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <Layers className="h-3 w-3" />
              Exterior Scope
            </h4>
            {scope.siding_included && (
              <ScopeItem label="Siding Materials" value={getSidingMaterials()} />
            )}
            <BooleanItem label="Fascia Included" value={scope.fascia_included} />
            <BooleanItem label="Soffit Included" value={scope.soffit_included} />
            {(scope.fascia_included || scope.soffit_included) && (
              <ScopeItem 
                label="Fascia/Soffit Material" 
                value={scope.fascia_soffit_material_other || scope.fascia_soffit_material} 
              />
            )}
            {scope.decorative_included && (
              <ScopeItem label="Decorative Items" value={getDecorativeItems()} />
            )}
            <BooleanItem label="Windows Included" value={scope.windows_included} />
            <BooleanItem label="WRB / Tyvek Included" value={scope.wrb_included} />
            <BooleanItem label="Exterior Doors Included" value={scope.ext_doors_included} />
          </div>
          </div>
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
  );
}
