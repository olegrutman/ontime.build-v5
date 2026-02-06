import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Edit, Home, Building2, ArrowUpDown, Layers, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
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

function ScopeRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function BooleanIndicator({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) return null;
  return value ? (
    <Check className="h-4 w-4 text-green-500" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/50" />
  );
}

function InclusionBadges({ scope }: { scope: ScopeDetails }) {
  const inclusions = [
    { label: 'Siding', included: scope.siding_included },
    { label: 'Fascia', included: scope.fascia_included },
    { label: 'Soffit', included: scope.soffit_included },
    { label: 'Windows', included: scope.windows_included },
    { label: 'WRB', included: scope.wrb_included },
    { label: 'Ext. Doors', included: scope.ext_doors_included },
    { label: 'Decking', included: scope.decking_included },
    { label: 'Decorative', included: scope.decorative_included },
  ].filter(item => item.included !== null);

  if (inclusions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {inclusions.map(item => (
        <Badge 
          key={item.label}
          variant={item.included ? 'default' : 'secondary'}
          className={cn(
            "text-[10px] h-5 px-1.5",
            item.included 
              ? "bg-primary/10 text-primary border-primary/20" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {item.included ? <Check className="h-2.5 w-2.5 mr-0.5" /> : null}
          {item.label}
        </Badge>
      ))}
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

  const isSingleFamily = ['Single Family Home', 'Townhomes', 'Duplex', 'residential'].includes(projectType);
  const isMultiFamily = ['Apartments/Condos', 'Hotels', 'commercial', 'mixed_use'].includes(projectType);

  const getSidingMaterials = () => {
    if (!scope) return null;
    const materials = scope.siding_materials || [];
    if (scope.siding_material_other) {
      materials.push(scope.siding_material_other);
    }
    return materials.length > 0 ? materials.join(', ') : null;
  };

  const getDecorativeItems = () => {
    if (!scope) return null;
    const items = scope.decorative_items || [];
    if (scope.decorative_item_other) {
      items.push(scope.decorative_item_other);
    }
    return items.length > 0 ? items.join(', ') : null;
  };

  // Build summary stats
  const buildSummary = () => {
    if (!scope) return [];
    const items: string[] = [];
    
    if (isSingleFamily) {
      if (scope.home_type) items.push(scope.home_type);
      if (scope.floors) items.push(`${scope.floors} floor${scope.floors > 1 ? 's' : ''}`);
    } else if (isMultiFamily) {
      if (scope.num_buildings) items.push(`${scope.num_buildings} building${scope.num_buildings > 1 ? 's' : ''}`);
      if (scope.stories) items.push(`${scope.stories} stories`);
      if (scope.num_units) items.push(`${scope.num_units} units`);
    }
    
    return items;
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Scope
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const summaryItems = buildSummary();

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-muted/30 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Scope</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {scope ? summaryItems.join(' • ') || 'Details configured' : 'Not configured'}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-10 text-sm px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects/${projectId}/scope`);
                }}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                {scope ? 'Edit' : 'Add'}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 pt-2">
            {!scope ? (
              <p className="text-sm text-muted-foreground">
                No scope details added yet.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Inclusions Summary */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Scope Inclusions
                  </h4>
                  <InclusionBadges scope={scope} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Structure */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3 w-3" />
                      Structure
                    </h4>
                    <div className="divide-y divide-border/50">
                      {isSingleFamily && (
                        <>
                          <ScopeRow label="Type" value={scope.home_type} />
                          <ScopeRow label="Floors" value={scope.floors} />
                          <ScopeRow label="Foundation" value={scope.foundation_type} />
                          {scope.basement_type && (
                            <ScopeRow label="Basement" value={`${scope.basement_type}${scope.basement_finish ? ` (${scope.basement_finish})` : ''}`} />
                          )}
                        </>
                      )}
                      {isMultiFamily && (
                        <>
                          <ScopeRow label="Buildings" value={scope.num_buildings} />
                          <ScopeRow label="Stories" value={scope.stories} />
                          <ScopeRow label="Construction" value={scope.construction_type_other || scope.construction_type} />
                          <ScopeRow label="Units" value={scope.num_units} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Roof & Outdoor */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <Home className="h-3 w-3" />
                      Roof & Outdoor
                    </h4>
                    <div className="divide-y divide-border/50">
                      <ScopeRow label="Roof Type" value={scope.roof_type} />
                      {scope.has_roof_deck && <ScopeRow label="Roof Deck" value={scope.roof_deck_type || 'Yes'} />}
                      {scope.has_balconies && <ScopeRow label="Balconies" value={scope.balcony_type || 'Yes'} />}
                      {scope.decking_included && <ScopeRow label="Decking" value={scope.decking_type_other || scope.decking_type || 'Yes'} />}
                    </div>
                  </div>

                  {/* Exterior Materials */}
                  {(getSidingMaterials() || getDecorativeItems()) && (
                    <div className="bg-muted/30 rounded-lg p-3 sm:col-span-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Layers className="h-3 w-3" />
                        Materials
                      </h4>
                      <div className="divide-y divide-border/50">
                        <ScopeRow label="Siding" value={getSidingMaterials()} />
                        <ScopeRow label="Fascia/Soffit" value={scope.fascia_soffit_material_other || scope.fascia_soffit_material} />
                        <ScopeRow label="Decorative" value={getDecorativeItems()} />
                      </div>
                    </div>
                  )}

                  {/* Vertical Access */}
                  {(scope.stairs_type || scope.has_elevator) && (
                    <div className="bg-muted/30 rounded-lg p-3 sm:col-span-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <ArrowUpDown className="h-3 w-3" />
                        Vertical Access
                      </h4>
                      <div className="divide-y divide-border/50">
                        <ScopeRow label="Stairs" value={scope.stairs_type} />
                        {scope.has_elevator && (
                          <ScopeRow label="Elevator Shaft" value={scope.shaft_type || 'Yes'} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
