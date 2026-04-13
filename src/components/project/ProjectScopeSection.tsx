import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Edit, Home, Building2, ArrowUpDown, Layers, ChevronDown, ChevronRight, Check, X, Hammer } from 'lucide-react';
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

/* ─── Small helper components ─── */

function ScopeChip({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/60">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-[11px] text-muted-foreground font-medium">{label}:</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function InclusionDot({ included }: { included: boolean | null }) {
  if (included === null || included === undefined) return null;
  return (
    <span className={cn(
      "inline-block w-2 h-2 rounded-full shrink-0",
      included ? "bg-green-500" : "bg-muted-foreground/30"
    )} />
  );
}

function InclusionRow({ label, included }: { label: string; included: boolean | null }) {
  if (included === null || included === undefined) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <InclusionDot included={included} />
      <span className={cn("text-xs", included ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

/* ─── Main component ─── */

export function ProjectScopeSection({ projectId, projectType }: ProjectScopeSectionProps) {
  const navigate = useNavigate();
  const [scope, setScope] = useState<(ScopeDetails & { scope_description?: string | null }) | null>(null);
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
    const materials = [...(scope.siding_materials || [])];
    if (scope.siding_material_other) materials.push(scope.siding_material_other);
    return materials.length > 0 ? materials.join(', ') : null;
  };

  const getDecorativeItems = () => {
    if (!scope) return null;
    const items = [...(scope.decorative_items || [])];
    if (scope.decorative_item_other) items.push(scope.decorative_item_other);
    return items.length > 0 ? items.join(', ') : null;
  };

  // Build summary chips
  const summaryChips: { label: string; value: string | number }[] = [];
  if (scope) {
    if (isSingleFamily) {
      if (scope.home_type) summaryChips.push({ label: 'Type', value: scope.home_type });
      if (scope.floors) summaryChips.push({ label: 'Floors', value: scope.floors });
      if (scope.foundation_type) summaryChips.push({ label: 'Foundation', value: scope.foundation_type });
    } else if (isMultiFamily) {
      if (scope.num_buildings) summaryChips.push({ label: 'Buildings', value: scope.num_buildings });
      if (scope.stories) summaryChips.push({ label: 'Stories', value: scope.stories });
      if (scope.num_units) summaryChips.push({ label: 'Units', value: scope.num_units });
    }
    if (scope.roof_type) summaryChips.push({ label: 'Roof', value: scope.roof_type });
  }

  // Inclusions list
  const inclusions = scope ? [
    { label: 'Siding', included: scope.siding_included },
    { label: 'Fascia', included: scope.fascia_included },
    { label: 'Soffit', included: scope.soffit_included },
    { label: 'Windows', included: scope.windows_included },
    { label: 'WRB', included: scope.wrb_included },
    { label: 'Ext. Doors', included: scope.ext_doors_included },
    { label: 'Decking', included: scope.decking_included },
    { label: 'Decorative', included: scope.decorative_included },
  ].filter(item => item.included !== null) : [];

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Scope</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-muted/30 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-medium">Scope</CardTitle>
                  {!isOpen && scope && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {summaryChips.slice(0, 4).map((chip, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/8 text-primary font-medium border border-primary/15">
                          {chip.value}
                        </span>
                      ))}
                      {inclusions.filter(i => i.included).length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 font-medium border border-green-500/20">
                          {inclusions.filter(i => i.included).length} inclusions
                        </span>
                      )}
                    </div>
                  )}
                  {!scope && (
                    <p className="text-sm text-muted-foreground mt-0.5">Not configured</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-sm px-3 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects/${projectId}/scope`);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                {scope ? 'Edit' : 'Add'}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 pt-3">
            {!scope ? (
              <div className="text-center py-6">
                <Hammer className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No scope details added yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate(`/projects/${projectId}/scope`)}
                >
                  Configure Scope
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scope Description callout */}
                {scope.scope_description && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                    <p className="text-xs font-medium text-primary mb-1">Scope Description</p>
                    <p className="text-sm text-foreground leading-relaxed">{scope.scope_description}</p>
                  </div>
                )}

                {/* Summary chips — always visible */}
                {summaryChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {summaryChips.map((chip, i) => (
                      <ScopeChip key={i} label={chip.label} value={chip.value} />
                    ))}
                  </div>
                )}

                {/* Inclusions grid */}
                {inclusions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Scope Inclusions
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5">
                      {inclusions.map(item => (
                        <InclusionRow key={item.label} label={item.label} included={item.included} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Detail sections — 2 col grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Structure */}
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Structure</span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {isSingleFamily && (
                        <>
                          <DetailRow label="Type" value={scope.home_type} />
                          <DetailRow label="Floors" value={scope.floors} />
                          <DetailRow label="Foundation" value={scope.foundation_type} />
                          {scope.basement_type && (
                            <DetailRow label="Basement" value={`${scope.basement_type}${scope.basement_finish ? ` (${scope.basement_finish})` : ''}`} />
                          )}
                        </>
                      )}
                      {isMultiFamily && (
                        <>
                          <DetailRow label="Buildings" value={scope.num_buildings} />
                          <DetailRow label="Stories" value={scope.stories} />
                          <DetailRow label="Construction" value={scope.construction_type_other || scope.construction_type} />
                          <DetailRow label="Units" value={scope.num_units} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Roof & Outdoor */}
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Home className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Roof & Outdoor</span>
                    </div>
                    <div className="divide-y divide-border/40">
                      <DetailRow label="Roof Type" value={scope.roof_type} />
                      {scope.has_roof_deck && <DetailRow label="Roof Deck" value={scope.roof_deck_type || 'Yes'} />}
                      {scope.has_balconies && <DetailRow label="Balconies" value={scope.balcony_type || 'Yes'} />}
                      {scope.decking_included && <DetailRow label="Decking" value={scope.decking_type_other || scope.decking_type || 'Yes'} />}
                    </div>
                  </div>

                  {/* Exterior Materials */}
                  {(getSidingMaterials() || getDecorativeItems()) && (
                    <div className="rounded-lg border border-border/60 p-3 sm:col-span-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Materials</span>
                      </div>
                      <div className="divide-y divide-border/40">
                        <DetailRow label="Siding" value={getSidingMaterials()} />
                        <DetailRow label="Fascia/Soffit" value={scope.fascia_soffit_material_other || scope.fascia_soffit_material} />
                        <DetailRow label="Decorative" value={getDecorativeItems()} />
                      </div>
                    </div>
                  )}

                  {/* Vertical Access */}
                  {(scope.stairs_type || scope.has_elevator) && (
                    <div className="rounded-lg border border-border/60 p-3 sm:col-span-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vertical Access</span>
                      </div>
                      <div className="divide-y divide-border/40">
                        <DetailRow label="Stairs" value={scope.stairs_type} />
                        {scope.has_elevator && <DetailRow label="Elevator Shaft" value={scope.shaft_type || 'Yes'} />}
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
