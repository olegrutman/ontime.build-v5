import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  SIDING_MATERIALS,
  DECORATIVE_ITEMS,
  FASCIA_SOFFIT_MATERIALS,
  BALCONY_TYPES,
  DECKING_TYPES,
  CONSTRUCTION_TYPES,
} from '@/types/projectWizard';

interface ScopeData {
  id?: string;
  project_id: string;
  home_type: string | null;
  floors: number | null;
  foundation_type: string | null;
  basement_type: string | null;
  basement_finish: string | null;
  stairs_type: string | null;
  has_elevator: boolean;
  shaft_type: string | null;
  shaft_type_notes: string | null;
  roof_type: string | null;
  has_roof_deck: boolean;
  roof_deck_type: string | null;
  has_covered_porches: boolean;
  has_balconies: boolean;
  balcony_type: string | null;
  decking_included: boolean;
  decking_type: string | null;
  decking_type_other: string | null;
  siding_included: boolean;
  siding_materials: string[];
  siding_material_other: string | null;
  decorative_included: boolean;
  decorative_items: string[];
  decorative_item_other: string | null;
  fascia_included: boolean;
  soffit_included: boolean;
  fascia_soffit_material: string | null;
  fascia_soffit_material_other: string | null;
  windows_included: boolean;
  wrb_included: boolean;
  ext_doors_included: boolean;
  num_buildings: number | null;
  stories: number | null;
  construction_type: string | null;
  construction_type_other: string | null;
  num_units: number | null;
  stories_per_unit: number | null;
  has_shared_walls: boolean;
}

const defaultScope: Omit<ScopeData, 'project_id'> = {
  home_type: null,
  floors: null,
  foundation_type: null,
  basement_type: null,
  basement_finish: null,
  stairs_type: null,
  has_elevator: false,
  shaft_type: null,
  shaft_type_notes: null,
  roof_type: null,
  has_roof_deck: false,
  roof_deck_type: null,
  has_covered_porches: false,
  has_balconies: false,
  balcony_type: null,
  decking_included: false,
  decking_type: null,
  decking_type_other: null,
  siding_included: false,
  siding_materials: [],
  siding_material_other: null,
  decorative_included: false,
  decorative_items: [],
  decorative_item_other: null,
  fascia_included: false,
  soffit_included: false,
  fascia_soffit_material: null,
  fascia_soffit_material_other: null,
  windows_included: false,
  wrb_included: false,
  ext_doors_included: false,
  num_buildings: null,
  stories: null,
  construction_type: null,
  construction_type_other: null,
  num_units: null,
  stories_per_unit: null,
  has_shared_walls: false,
};

export default function EditProjectScope() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [scope, setScope] = useState<ScopeData>({ ...defaultScope, project_id: id || '' });
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch project info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name, project_type')
        .eq('id', id)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        navigate('/dashboard');
        return;
      }

      setProjectName(project.name);
      setProjectType(project.project_type);

      // Fetch existing scope
      const { data: scopeData, error: scopeError } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', id)
        .single();

      if (scopeError && scopeError.code !== 'PGRST116') {
        console.error('Error fetching scope:', scopeError);
      }

      if (scopeData) {
        const sidingMaterials = Array.isArray(scopeData.siding_materials) 
          ? (scopeData.siding_materials as any[]).map(String)
          : [];
        const decorativeItems = Array.isArray(scopeData.decorative_items)
          ? (scopeData.decorative_items as any[]).map(String)
          : [];
        setScope({
          ...scopeData,
          siding_materials: sidingMaterials,
          decorative_items: decorativeItems,
        });
      } else {
        setIsNew(true);
        setScope({ ...defaultScope, project_id: id });
      }

      setLoading(false);
    };

    fetchData();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    try {
      const saveData = {
        project_id: id,
        home_type: scope.home_type,
        floors: scope.floors,
        foundation_type: scope.foundation_type,
        basement_type: scope.basement_type,
        basement_finish: scope.basement_finish,
        stairs_type: scope.stairs_type,
        has_elevator: scope.has_elevator,
        shaft_type: scope.shaft_type,
        shaft_type_notes: scope.shaft_type_notes,
        roof_type: scope.roof_type,
        has_roof_deck: scope.has_roof_deck,
        roof_deck_type: scope.roof_deck_type,
        has_covered_porches: scope.has_covered_porches,
        has_balconies: scope.has_balconies,
        balcony_type: scope.balcony_type,
        decking_included: scope.decking_included,
        decking_type: scope.decking_type,
        decking_type_other: scope.decking_type_other,
        siding_included: scope.siding_included,
        siding_materials: scope.siding_materials,
        siding_material_other: scope.siding_material_other,
        decorative_included: scope.decorative_included,
        decorative_items: scope.decorative_items,
        decorative_item_other: scope.decorative_item_other,
        fascia_included: scope.fascia_included,
        soffit_included: scope.soffit_included,
        fascia_soffit_material: scope.fascia_soffit_material,
        fascia_soffit_material_other: scope.fascia_soffit_material_other,
        windows_included: scope.windows_included,
        wrb_included: scope.wrb_included,
        ext_doors_included: scope.ext_doors_included,
        num_buildings: scope.num_buildings,
        stories: scope.stories,
        construction_type: scope.construction_type,
        construction_type_other: scope.construction_type_other,
        num_units: scope.num_units,
        stories_per_unit: scope.stories_per_unit,
        has_shared_walls: scope.has_shared_walls,
      };

      if (isNew) {
        const { error } = await supabase
          .from('project_scope_details')
          .insert(saveData);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_scope_details')
          .update(saveData)
          .eq('id', scope.id);

        if (error) throw error;
      }

      // Log activity
      await supabase.from('project_activity').insert({
        project_id: id,
        activity_type: 'SCOPE_UPDATED',
        description: 'Project scope details were updated',
        actor_user_id: user?.id,
      });

      toast.success('Scope saved successfully');
      navigate(`/project/${id}`);
    } catch (error: any) {
      console.error('Error saving scope:', error);
      toast.error(error.message || 'Failed to save scope');
    }

    setSaving(false);
  };

  const updateScope = (field: keyof ScopeData, value: any) => {
    setScope((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'siding_materials' | 'decorative_items', item: string) => {
    setScope((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const isSingleFamily = ['Single Family Home', 'residential'].includes(projectType);
  const isTownhome = ['Townhomes', 'Duplex'].includes(projectType);
  const isMultiFamily = ['Apartments/Condos', 'Hotels', 'commercial', 'mixed_use'].includes(projectType);

  if (loading) {
    return (
      <AppLayout title="Edit Scope">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit Scope - ${projectName}`}>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Scope & Project Details</h1>
              <p className="text-sm text-muted-foreground">{projectName}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Structure Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structure</CardTitle>
              <CardDescription>Basic building structure details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(isSingleFamily || isTownhome) && (
                <>
                  <div className="space-y-2">
                    <Label>Home Type</Label>
                    <Select
                      value={scope.home_type || ''}
                      onValueChange={(v) => updateScope('home_type', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select home type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Custom Home">Custom Home</SelectItem>
                        <SelectItem value="Track Home">Track Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Floors</Label>
                    <Input
                      type="number"
                      min={1}
                      value={scope.floors || ''}
                      onChange={(e) => updateScope('floors', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Foundation Type</Label>
                    <Select
                      value={scope.foundation_type || ''}
                      onValueChange={(v) => updateScope('foundation_type', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select foundation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Slab">Slab</SelectItem>
                        <SelectItem value="Crawl Space">Crawl Space</SelectItem>
                        <SelectItem value="Basement">Basement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scope.foundation_type === 'Basement' && (
                    <>
                      <div className="space-y-2">
                        <Label>Basement Type</Label>
                        <Select
                          value={scope.basement_type || ''}
                          onValueChange={(v) => updateScope('basement_type', v || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select basement type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Walkout">Walkout</SelectItem>
                            <SelectItem value="Garden Level">Garden Level</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Basement Finish</Label>
                        <Select
                          value={scope.basement_finish || ''}
                          onValueChange={(v) => updateScope('basement_finish', v || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select finish level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Finished">Finished</SelectItem>
                            <SelectItem value="Unfinished">Unfinished</SelectItem>
                            <SelectItem value="Partially Finished">Partially Finished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </>
              )}

              {isMultiFamily && (
                <>
                  <div className="space-y-2">
                    <Label>Number of Buildings</Label>
                    <Input
                      type="number"
                      min={1}
                      value={scope.num_buildings || ''}
                      onChange={(e) => updateScope('num_buildings', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Stories</Label>
                    <Input
                      type="number"
                      min={1}
                      value={scope.stories || ''}
                      onChange={(e) => updateScope('stories', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Construction Type</Label>
                    <Select
                      value={scope.construction_type || ''}
                      onValueChange={(v) => updateScope('construction_type', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select construction type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSTRUCTION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {scope.construction_type === 'Other' && (
                    <div className="space-y-2">
                      <Label>Specify Construction Type</Label>
                      <Input
                        value={scope.construction_type_other || ''}
                        onChange={(e) => updateScope('construction_type_other', e.target.value || null)}
                        placeholder="Enter construction type"
                      />
                    </div>
                  )}
                </>
              )}

              {isTownhome && (
                <>
                  <div className="space-y-2">
                    <Label>Number of Units</Label>
                    <Input
                      type="number"
                      min={1}
                      value={scope.num_units || ''}
                      onChange={(e) => updateScope('num_units', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stories per Unit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={scope.stories_per_unit || ''}
                      onChange={(e) => updateScope('stories_per_unit', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Shared Walls</Label>
                    <Switch
                      checked={scope.has_shared_walls}
                      onCheckedChange={(v) => updateScope('has_shared_walls', v)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Vertical Access Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vertical Access</CardTitle>
              <CardDescription>Stairs and elevator details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stairs Type</Label>
                <Select
                  value={scope.stairs_type || ''}
                  onValueChange={(v) => updateScope('stairs_type', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stairs type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Field Built">Field Built</SelectItem>
                    <SelectItem value="Manufactured">Manufactured</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Elevator</Label>
                <Switch
                  checked={scope.has_elevator}
                  onCheckedChange={(v) => updateScope('has_elevator', v)}
                />
              </div>

              {scope.has_elevator && (
                <>
                  <div className="space-y-2">
                    <Label>Shaft Type</Label>
                    <Input
                      value={scope.shaft_type || ''}
                      onChange={(e) => updateScope('shaft_type', e.target.value || null)}
                      placeholder="e.g., Hydraulic, Traction"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Shaft Notes</Label>
                    <Textarea
                      value={scope.shaft_type_notes || ''}
                      onChange={(e) => updateScope('shaft_type_notes', e.target.value || null)}
                      placeholder="Additional notes about elevator shaft"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Roof & Outdoor Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roof & Outdoor</CardTitle>
              <CardDescription>Roof, porches, and outdoor features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Roof Type</Label>
                <Select
                  value={scope.roof_type || ''}
                  onValueChange={(v) => updateScope('roof_type', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select roof type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gable">Gable</SelectItem>
                    <SelectItem value="Hip">Hip</SelectItem>
                    <SelectItem value="Flat">Flat</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Roof Deck</Label>
                <Switch
                  checked={scope.has_roof_deck}
                  onCheckedChange={(v) => updateScope('has_roof_deck', v)}
                />
              </div>

              {scope.has_roof_deck && (
                <div className="space-y-2">
                  <Label>Roof Deck Type</Label>
                  <Select
                    value={scope.roof_deck_type || ''}
                    onValueChange={(v) => updateScope('roof_deck_type', v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select roof deck type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Framed">Framed</SelectItem>
                      <SelectItem value="Concrete">Concrete</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Covered Porches</Label>
                <Switch
                  checked={scope.has_covered_porches}
                  onCheckedChange={(v) => updateScope('has_covered_porches', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Balconies</Label>
                <Switch
                  checked={scope.has_balconies}
                  onCheckedChange={(v) => updateScope('has_balconies', v)}
                />
              </div>

              {scope.has_balconies && (
                <div className="space-y-2">
                  <Label>Balcony Type</Label>
                  <Select
                    value={scope.balcony_type || ''}
                    onValueChange={(v) => updateScope('balcony_type', v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select balcony type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BALCONY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Decking Included</Label>
                <Switch
                  checked={scope.decking_included}
                  onCheckedChange={(v) => updateScope('decking_included', v)}
                />
              </div>

              {scope.decking_included && (
                <>
                  <div className="space-y-2">
                    <Label>Decking Type</Label>
                    <Select
                      value={scope.decking_type || ''}
                      onValueChange={(v) => updateScope('decking_type', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select decking type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DECKING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {scope.decking_type === 'Other' && (
                    <div className="space-y-2">
                      <Label>Specify Decking Type</Label>
                      <Input
                        value={scope.decking_type_other || ''}
                        onChange={(e) => updateScope('decking_type_other', e.target.value || null)}
                        placeholder="Enter decking type"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Exterior Scope Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exterior Scope</CardTitle>
              <CardDescription>Siding, fascia, soffit, and exterior items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Siding Included</Label>
                <Switch
                  checked={scope.siding_included}
                  onCheckedChange={(v) => updateScope('siding_included', v)}
                />
              </div>

              {scope.siding_included && (
                <div className="space-y-2">
                  <Label>Siding Materials (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIDING_MATERIALS.map((material) => (
                      <div key={material} className="flex items-center space-x-2">
                        <Checkbox
                          id={`siding-${material}`}
                          checked={scope.siding_materials?.includes(material)}
                          onCheckedChange={() => toggleArrayItem('siding_materials', material)}
                        />
                        <label htmlFor={`siding-${material}`} className="text-sm">
                          {material}
                        </label>
                      </div>
                    ))}
                  </div>
                  {scope.siding_materials?.includes('Other') && (
                    <Input
                      value={scope.siding_material_other || ''}
                      onChange={(e) => updateScope('siding_material_other', e.target.value || null)}
                      placeholder="Specify other siding material"
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Fascia Included</Label>
                <Switch
                  checked={scope.fascia_included}
                  onCheckedChange={(v) => updateScope('fascia_included', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Soffit Included</Label>
                <Switch
                  checked={scope.soffit_included}
                  onCheckedChange={(v) => updateScope('soffit_included', v)}
                />
              </div>

              {(scope.fascia_included || scope.soffit_included) && (
                <div className="space-y-2">
                  <Label>Fascia/Soffit Material</Label>
                  <Select
                    value={scope.fascia_soffit_material || ''}
                    onValueChange={(v) => updateScope('fascia_soffit_material', v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {FASCIA_SOFFIT_MATERIALS.map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scope.fascia_soffit_material === 'Other' && (
                    <Input
                      value={scope.fascia_soffit_material_other || ''}
                      onChange={(e) => updateScope('fascia_soffit_material_other', e.target.value || null)}
                      placeholder="Specify material"
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Decorative Items Included</Label>
                <Switch
                  checked={scope.decorative_included}
                  onCheckedChange={(v) => updateScope('decorative_included', v)}
                />
              </div>

              {scope.decorative_included && (
                <div className="space-y-2">
                  <Label>Decorative Items (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DECORATIVE_ITEMS.map((item) => (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`decorative-${item}`}
                          checked={scope.decorative_items?.includes(item)}
                          onCheckedChange={() => toggleArrayItem('decorative_items', item)}
                        />
                        <label htmlFor={`decorative-${item}`} className="text-sm">
                          {item}
                        </label>
                      </div>
                    ))}
                  </div>
                  {scope.decorative_items?.includes('Other') && (
                    <Input
                      value={scope.decorative_item_other || ''}
                      onChange={(e) => updateScope('decorative_item_other', e.target.value || null)}
                      placeholder="Specify other decorative items"
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Windows Included</Label>
                <Switch
                  checked={scope.windows_included}
                  onCheckedChange={(v) => updateScope('windows_included', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>WRB / Tyvek Included</Label>
                <Switch
                  checked={scope.wrb_included}
                  onCheckedChange={(v) => updateScope('wrb_included', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Exterior Doors Included</Label>
                <Switch
                  checked={scope.ext_doors_included}
                  onCheckedChange={(v) => updateScope('ext_doors_included', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(`/project/${id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
