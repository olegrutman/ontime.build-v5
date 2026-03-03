import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ScopeDetails, 
  ProjectType,
  SIDING_MATERIALS,
  DECORATIVE_ITEMS,
  FASCIA_SOFFIT_MATERIALS,
  BALCONY_TYPES,
  DECKING_TYPES,
  CONSTRUCTION_TYPES,
  GARAGE_TYPES,
  FRAMING_METHODS,
  EXTERIOR_DOOR_TYPES,
} from '@/types/projectWizard';

interface ScopeStepProps {
  projectType: ProjectType | '';
  scope: ScopeDetails;
  onChange: (scope: ScopeDetails) => void;
}

export function ScopeStep({ projectType, scope, onChange }: ScopeStepProps) {
  const update = (updates: Partial<ScopeDetails>) => {
    onChange({ ...scope, ...updates });
  };

  const toggleArrayItem = (field: 'sidingMaterials' | 'decorativeItems' | 'extDoorTypes', item: string) => {
    const current = (scope[field] as string[] | undefined) || [];
    const updated = current.includes(item) 
      ? current.filter(i => i !== item)
      : [...current, item];
    update({ [field]: updated });
  };

  const isSingleFamily = projectType === 'Single Family Home';
  const isMultiFamily = projectType === 'Apartments/Condos' || projectType === 'Hotels';
  const isTownhome = projectType === 'Townhomes';
  const isDuplex = projectType === 'Duplex';
  const isResidentialUnit = isSingleFamily || isTownhome || isDuplex;

  if (!projectType) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Please select a project type in the Basics step first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Scope & Details</h2>
        <p className="text-sm text-muted-foreground">
          Framing-relevant details for {projectType}
        </p>
      </div>

      {/* Project Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Size</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isMultiFamily ? 'Total Project Sq Ft' : 'Living Area Sq Ft'}</Label>
              <Input
                type="number"
                min="0"
                placeholder={isMultiFamily ? 'e.g. 120000' : 'e.g. 3200'}
                value={scope.totalSqft || ''}
                onChange={(e) => update({ totalSqft: parseInt(e.target.value) || undefined })}
              />
            </div>
            {/* Bedrooms/Bathrooms — Single Family and Duplex only (not Townhomes) */}
            {(isSingleFamily || isDuplex) && (
              <>
                <div className="space-y-2">
                  <Label>{isDuplex ? 'Bedrooms per Unit' : 'Bedrooms'}</Label>
                  <Select
                    value={scope.bedrooms?.toString() || ''}
                    onValueChange={(v) => update({ bedrooms: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}{n === 6 ? '+' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isDuplex ? 'Bathrooms per Unit' : 'Bathrooms'}</Label>
                  <Select
                    value={scope.bathrooms?.toString() || ''}
                    onValueChange={(v) => update({ bathrooms: parseFloat(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}{n === 6 ? '+' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Garage — residential unit types only */}
      {isResidentialUnit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Garage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Garage Type</Label>
              <Select
                value={scope.garageType || ''}
                onValueChange={(v: 'Attached' | 'Detached' | 'None') => update({ garageType: v, garageCars: v === 'None' ? undefined : scope.garageCars })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GARAGE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scope.garageType && scope.garageType !== 'None' && (
              <div className="space-y-2">
                <Label>Number of Cars</Label>
                <Select
                  value={scope.garageCars?.toString() || ''}
                  onValueChange={(v) => update({ garageCars: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}{n === 3 ? '+' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Framing Method */}
      {(isSingleFamily || isTownhome || isDuplex) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Framing Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={scope.framingMethod || ''}
              onValueChange={(v: 'Stick Frame' | 'Panelized' | 'Hybrid') => update({ framingMethod: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {FRAMING_METHODS.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Multi-building info (Apartments/Hotels) */}
      {isMultiFamily && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Building Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Buildings</Label>
                <Input
                  type="number"
                  min="1"
                  value={scope.numBuildings || ''}
                  onChange={(e) => update({ numBuildings: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stories</Label>
                <Select
                  value={scope.stories?.toString() || ''}
                  onValueChange={(v) => update({ stories: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}{n === 6 ? '+' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Construction Type</Label>
              <Select
                value={scope.constructionType || ''}
                onValueChange={(v) => update({ constructionType: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CONSTRUCTION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scope.constructionType === 'Other' && (
                <Input
                  placeholder="Specify construction type"
                  value={scope.constructionTypeOther || ''}
                  onChange={(e) => update({ constructionTypeOther: e.target.value })}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Townhome/Duplex specific */}
      {(isTownhome || isDuplex) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {isTownhome && (
                <div className="space-y-2">
                  <Label>Number of Units</Label>
                  <Input
                    type="number"
                    min="1"
                    value={scope.numUnits || ''}
                    onChange={(e) => update({ numUnits: parseInt(e.target.value) || undefined })}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Shared/Party Walls?</Label>
              <Switch
                checked={scope.hasSharedWalls || false}
                onCheckedChange={(checked) => update({ hasSharedWalls: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Family structure */}
      {(isSingleFamily || isTownhome || isDuplex) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Structure Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSingleFamily && (
              <div className="space-y-2">
                <Label>Home Type</Label>
                <Select
                  value={scope.homeType || ''}
                  onValueChange={(v: 'Custom Home' | 'Track Home') => update({ homeType: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Custom Home">Custom Home</SelectItem>
                    <SelectItem value="Track Home">Track Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Floors</Label>
                <Select
                  value={scope.floors?.toString() || ''}
                  onValueChange={(v) => update({ floors: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Foundation Type</Label>
                <Select
                  value={scope.foundationType || ''}
                  onValueChange={(v: 'Slab' | 'Crawl Space' | 'Basement') => update({ foundationType: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Slab">Slab</SelectItem>
                    <SelectItem value="Crawl Space">Crawl Space</SelectItem>
                    <SelectItem value="Basement">Basement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scope.foundationType === 'Basement' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basement Type</Label>
                  <Select
                    value={scope.basementType || ''}
                    onValueChange={(v: 'Walkout' | 'Garden Level' | 'Standard') => update({ basementType: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                    value={scope.basementFinish || ''}
                    onValueChange={(v: 'Finished' | 'Unfinished' | 'Partially Finished') => update({ basementFinish: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Finished">Finished</SelectItem>
                      <SelectItem value="Unfinished">Unfinished</SelectItem>
                      <SelectItem value="Partially Finished">Partially Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stairs & Elevator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stairs & Elevator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Stairs Type</Label>
            <Select
              value={scope.stairsType || ''}
              onValueChange={(v: 'Field Built' | 'Manufactured' | 'Both') => update({ stairsType: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Field Built">Field Built</SelectItem>
                <SelectItem value="Manufactured">Manufactured</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Has Elevator?</Label>
            <Switch
              checked={scope.hasElevator || false}
              onCheckedChange={(checked) => update({ hasElevator: checked })}
            />
          </div>
          {scope.hasElevator && (
            <div className="space-y-2">
              <Label>Shaft Type</Label>
              <Select
                value={scope.shaftType || ''}
                onValueChange={(v) => update({ shaftType: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sandeblock">Sandeblock</SelectItem>
                  <SelectItem value="Wood">Wood</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {scope.shaftType === 'Other' && (
                <Input
                  placeholder="Shaft type notes"
                  value={scope.shaftTypeNotes || ''}
                  onChange={(e) => update({ shaftTypeNotes: e.target.value })}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roof */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roof</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Roof Type</Label>
            <Select
              value={scope.roofType || ''}
              onValueChange={(v: 'Gable' | 'Hip' | 'Flat' | 'Mixed') => update({ roofType: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gable">Gable</SelectItem>
                <SelectItem value="Hip">Hip</SelectItem>
                <SelectItem value="Flat">Flat</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Has Roof Deck?</Label>
            <Switch
              checked={scope.hasRoofDeck || false}
              onCheckedChange={(checked) => update({ hasRoofDeck: checked })}
            />
          </div>
          {scope.hasRoofDeck && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Roof Deck Finish</Label>
                <Select
                  value={scope.roofDeckFinish || ''}
                  onValueChange={(v: 'Finished' | 'Unfinished') => update({ roofDeckFinish: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finished">Finished</SelectItem>
                    <SelectItem value="Unfinished">Unfinished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Decking Type</Label>
                <Select
                  value={scope.roofDeckDecking || ''}
                  onValueChange={(v) => update({ roofDeckDecking: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DECKING_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exterior Features */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exterior Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Covered Porches?</Label>
            <Switch
              checked={scope.hasCoveredPorches || false}
              onCheckedChange={(checked) => update({ hasCoveredPorches: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Balconies?</Label>
            <Switch
              checked={scope.hasBalconies || false}
              onCheckedChange={(checked) => update({ hasBalconies: checked })}
            />
          </div>
          {scope.hasBalconies && (
            <div className="space-y-2">
              <Label>Balcony Type</Label>
              <Select
                value={scope.balconyType || ''}
                onValueChange={(v) => update({ balconyType: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BALCONY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Decking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Decking Included?</Label>
            <Switch
              checked={scope.deckingIncluded || false}
              onCheckedChange={(checked) => update({ deckingIncluded: checked })}
            />
          </div>
          {scope.deckingIncluded && (
            <div className="space-y-2">
              <Label>Decking Type</Label>
              <Select
                value={scope.deckingType || ''}
                onValueChange={(v) => update({ deckingType: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DECKING_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scope.deckingType === 'Other' && (
                <Input
                  placeholder="Specify decking type"
                  value={scope.deckingTypeOther || ''}
                  onChange={(e) => update({ deckingTypeOther: e.target.value })}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Siding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Siding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Siding Included?</Label>
            <Switch
              checked={scope.sidingIncluded || false}
              onCheckedChange={(checked) => update({ sidingIncluded: checked })}
            />
          </div>
          {scope.sidingIncluded && (
            <div className="space-y-2">
              <Label>Siding Materials (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {SIDING_MATERIALS.map(material => (
                  <div key={material} className="flex items-center space-x-2">
                    <Checkbox
                      id={`siding-${material}`}
                      checked={(scope.sidingMaterials || []).includes(material)}
                      onCheckedChange={() => toggleArrayItem('sidingMaterials', material)}
                    />
                    <label htmlFor={`siding-${material}`} className="text-sm">{material}</label>
                  </div>
                ))}
              </div>
              {(scope.sidingMaterials || []).includes('Other') && (
                <Input
                  placeholder="Specify other siding material"
                  value={scope.sidingMaterialOther || ''}
                  onChange={(e) => update({ sidingMaterialOther: e.target.value })}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fascia & Soffit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fascia & Soffit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Fascia Included?</Label>
            <Switch
              checked={scope.fasciaIncluded || false}
              onCheckedChange={(checked) => update({ fasciaIncluded: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Soffit Included?</Label>
            <Switch
              checked={scope.soffitIncluded || false}
              onCheckedChange={(checked) => update({ soffitIncluded: checked })}
            />
          </div>
          {(scope.fasciaIncluded || scope.soffitIncluded) && (
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                value={scope.fasciaSoffitMaterial || ''}
                onValueChange={(v) => update({ fasciaSoffitMaterial: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {FASCIA_SOFFIT_MATERIALS.map(material => (
                    <SelectItem key={material} value={material}>{material}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scope.fasciaSoffitMaterial === 'Other' && (
                <Input
                  placeholder="Specify other material"
                  value={scope.fasciaSoffitMaterialOther || ''}
                  onChange={(e) => update({ fasciaSoffitMaterialOther: e.target.value })}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decorative Elements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Decorative Elements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Decorative Elements Included?</Label>
            <Switch
              checked={scope.decorativeIncluded || false}
              onCheckedChange={(checked) => update({ decorativeIncluded: checked })}
            />
          </div>
          {scope.decorativeIncluded && (
            <div className="space-y-2">
              <Label>Select items (check all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {DECORATIVE_ITEMS.map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`decorative-${item}`}
                      checked={(scope.decorativeItems || []).includes(item)}
                      onCheckedChange={() => toggleArrayItem('decorativeItems', item)}
                    />
                    <label htmlFor={`decorative-${item}`} className="text-sm">{item}</label>
                  </div>
                ))}
              </div>
              {(scope.decorativeItems || []).includes('Other') && (
                <Input
                  placeholder="Specify other decorative items"
                  value={scope.decorativeItemOther || ''}
                  onChange={(e) => update({ decorativeItemOther: e.target.value })}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional Scope Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Optional Scope Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Framing contractor installs Windows?</Label>
            <Switch
              checked={scope.windowsIncluded || false}
              onCheckedChange={(checked) => update({ windowsIncluded: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Framing contractor installs Tyvek/WRB?</Label>
            <Switch
              checked={scope.wrbIncluded || false}
              onCheckedChange={(checked) => update({ wrbIncluded: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label>Exterior Door Types (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {EXTERIOR_DOOR_TYPES.map(doorType => (
                <div key={doorType} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ext-door-${doorType}`}
                    checked={(scope.extDoorTypes || []).includes(doorType)}
                    onCheckedChange={() => toggleArrayItem('extDoorTypes', doorType)}
                  />
                  <label htmlFor={`ext-door-${doorType}`} className="text-sm">{doorType}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
