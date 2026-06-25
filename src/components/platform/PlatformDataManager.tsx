import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { ProjectTypesTable } from './data-tables/ProjectTypesTable';
import { ScopeSectionsTable } from './data-tables/ScopeSectionsTable';
import { ScopeItemsTable } from './data-tables/ScopeItemsTable';
import { ContractCategoriesTable } from './data-tables/ContractCategoriesTable';
import { TradesTable } from './data-tables/TradesTable';
import { SOVTemplatesTable } from './data-tables/SOVTemplatesTable';

const TABS = [
  { value: 'project-types', label: 'Project Types', component: ProjectTypesTable },
  { value: 'scope-sections', label: 'Scope Sections', component: ScopeSectionsTable },
  { value: 'scope-items', label: 'Scope Items', component: ScopeItemsTable },
  { value: 'contract-categories', label: 'Contract Categories', component: ContractCategoriesTable },
  { value: 'trades', label: 'Trades', component: TradesTable },
  { value: 'sov-templates', label: 'SOV Templates', component: SOVTemplatesTable },
] as const;

export function PlatformDataManager() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Data Manager</CardTitle>
        </div>
        <CardDescription>
          Manage reference tables that drive project setup — types, scope questions, trades, and templates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="project-types">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <t.component />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
