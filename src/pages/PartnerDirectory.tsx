import { Search, Building2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePartnerDirectory } from '@/hooks/usePartnerDirectory';
import { OrganizationsTab, PeopleTab } from '@/components/partner-directory';
import { Users } from 'lucide-react';

export default function PartnerDirectory() {
  const {
    user,
    loading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    partners,
    people,
    filteredPartners,
    filteredPeople,
    groupedPartners,
    groupedPeople,
  } = usePartnerDirectory();

  if (!user) {
    return (
      <AppLayout title="Partner Directory">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Please sign in to access the Partner Directory.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const hasData = partners.length > 0 || people.length > 0;
  const noFilterResults = activeTab === 'organizations' ? filteredPartners.length === 0 : filteredPeople.length === 0;

  return (
    <AppLayout title="Partner Directory" subtitle="Everyone you've worked with on projects">
      <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
        {/* Search */}
        <div className="relative w-full max-w-md min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name, email, org code, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs className="min-w-0 max-w-full" value={activeTab} onValueChange={(v) => setActiveTab(v as 'organizations' | 'people')}>
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/50 p-1 min-[360px]:inline-flex min-[360px]:w-auto">
            <TabsTrigger value="organizations" className="min-w-0 gap-1.5 rounded-full px-2 text-xs min-[360px]:px-4">
              <Building2 className="h-3.5 w-3.5" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="people" className="min-w-0 gap-1.5 rounded-full px-2 text-xs min-[360px]:px-4">
              <Users className="h-3.5 w-3.5" />
              People
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-6 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <div className="space-y-2">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !hasData ? (
            <Card className="mt-4">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No project collaborators yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Partners will appear here once you work together on projects.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TabsContent value="organizations">
                {filteredPartners.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No organizations match your search.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <OrganizationsTab groupedPartners={groupedPartners} />
                )}
              </TabsContent>

              <TabsContent value="people">
                {filteredPeople.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No people match your search.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <PeopleTab groupedPeople={groupedPeople} />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
