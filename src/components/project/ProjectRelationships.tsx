import { useEffect, useState } from 'react';
import { ArrowRight, Package, FileCheck, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Relationship {
  id: string;
  upstream_org_name: string;
  upstream_org_code: string;
  upstream_role: 'GC' | 'TC' | 'FC' | 'SUPPLIER';
  downstream_org_name: string;
  downstream_org_code: string;
  downstream_role: 'GC' | 'TC' | 'FC' | 'SUPPLIER';
  relationship_type: string;
  material_responsibility: string | null;
  po_requires_upstream_approval: boolean;
}

interface ProjectRelationshipsProps {
  projectId: string;
}

const roleColors: Record<string, string> = {
  GC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TC: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  FC: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  SUPPLIER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const roleLabels: Record<string, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Finishing Contractor',
  SUPPLIER: 'Supplier',
};

export function ProjectRelationships({ projectId }: ProjectRelationshipsProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelationships = async () => {
      const { data, error } = await supabase.rpc('get_project_relationships', {
        _project_id: projectId,
      });

      if (error) {
        console.error('Error fetching relationships:', error);
      } else {
        setRelationships(data || []);
      }
      setLoading(false);
    };

    fetchRelationships();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Relationships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (relationships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No relationships established yet. Invite partners and have them accept to see the relationship chain.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group relationships by type for better visualization
  const gcTcRelationships = relationships.filter(r => r.relationship_type === 'GC_TC');
  const tcFcRelationships = relationships.filter(r => r.relationship_type === 'TC_FC');
  const supplierRelationships = relationships.filter(r => r.relationship_type === 'BUYER_SUPPLIER');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Project Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Chain Visualization */}
        <div className="space-y-4">
          {gcTcRelationships.map((rel) => (
            <RelationshipRow key={rel.id} relationship={rel} />
          ))}
          {tcFcRelationships.map((rel) => (
            <RelationshipRow key={rel.id} relationship={rel} />
          ))}
        </div>

        {/* Supplier Relationships */}
        {supplierRelationships.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-3">SUPPLIER RELATIONSHIPS</p>
            <div className="space-y-3">
              {supplierRelationships.map((rel) => (
                <RelationshipRow key={rel.id} relationship={rel} isSupplier />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelationshipRow({ 
  relationship, 
  isSupplier = false 
}: { 
  relationship: Relationship; 
  isSupplier?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      {/* Upstream Org */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={roleColors[relationship.upstream_role]}>
            {relationship.upstream_role}
          </Badge>
          <span className="text-xs text-muted-foreground">{relationship.upstream_org_code}</span>
        </div>
        <p className="text-sm font-medium truncate">{relationship.upstream_org_name}</p>
      </div>

      {/* Arrow with indicators */}
      <div className="flex flex-col items-center gap-1 px-2">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="flex gap-1">
          {relationship.material_responsibility && (
            <div 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-background border"
              title={`Material responsibility: ${relationship.material_responsibility}`}
            >
              <Package className="h-3 w-3" />
              <span>{relationship.material_responsibility}</span>
            </div>
          )}
          {relationship.po_requires_upstream_approval && (
            <div 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-background border"
              title="PO requires upstream approval"
            >
              <FileCheck className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Downstream Org */}
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{relationship.downstream_org_code}</span>
          <Badge variant="outline" className={roleColors[relationship.downstream_role]}>
            {relationship.downstream_role}
          </Badge>
        </div>
        <p className="text-sm font-medium truncate">{relationship.downstream_org_name}</p>
      </div>
    </div>
  );
}
