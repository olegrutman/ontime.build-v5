import { useMemo, useState } from 'react';
import {
  LOCATION_TYPE_LABELS,
  LOCATION_SYSTEMS,
  SYSTEMS,
  SCOPES,
  type LocationType,
  allowedSystemsFor,
  allowedScopesFor,
} from '@/components/change-orders/picker-v3/catalog';

/**
 * Dev-only read-only matrix preview. Visit /dev/catalog-matrix to
 * red-line the Location × System × Scope constraints before wiring
 * them into the manual CO/WO picker.
 */
export default function CatalogMatrixPreview() {
  const locations = Object.keys(LOCATION_SYSTEMS) as LocationType[];
  const [openLoc, setOpenLoc] = useState<LocationType | null>(locations[0] ?? null);
  const [openSystem, setOpenSystem] = useState<string | null>(null);

  const systemCount = useMemo(
    () => Object.values(LOCATION_SYSTEMS).reduce((a, l) => a + l.length, 0),
    []
  );
  const scopeCount = useMemo(() => Object.keys(SCOPES).length, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            dev · catalog matrix preview
          </p>
          <h1 className="font-[Barlow_Condensed] text-4xl font-bold uppercase tracking-tight">
            Location × System × Scope
          </h1>
          <p className="text-sm text-muted-foreground">
            Red-line which systems belong in which locations and which scopes belong to each
            system. Edit{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              src/components/change-orders/picker-v3/catalog.ts
            </code>
            .
          </p>
          <div className="flex gap-4 pt-2 text-xs font-mono text-muted-foreground">
            <span>{locations.length} location types</span>
            <span>{Object.keys(SYSTEMS).length} systems</span>
            <span>{systemCount} location→system links</span>
            <span>{scopeCount} scopes</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Locations rail */}
          <nav className="space-y-1">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-2">
              Locations
            </p>
            {locations.map((loc) => {
              const active = openLoc === loc;
              const count = LOCATION_SYSTEMS[loc].length;
              return (
                <button
                  key={loc}
                  onClick={() => {
                    setOpenLoc(loc);
                    setOpenSystem(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted border-border'
                  }`}
                >
                  <span>{LOCATION_TYPE_LABELS[loc]}</span>
                  <span className="font-mono text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </nav>

          {/* Systems + scopes */}
          <section className="space-y-3">
            {openLoc && (
              <>
                <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
                  Allowed Systems in {LOCATION_TYPE_LABELS[openLoc]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allowedSystemsFor(openLoc).map((sys) => {
                    const isOpen = openSystem === sys.id;
                    const scopes = allowedScopesFor(sys.id);
                    return (
                      <div
                        key={sys.id}
                        className="rounded-2xl border border-border bg-card overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenSystem(isOpen ? null : sys.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted"
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm">{sys.label}</p>
                            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                              {sys.defaultTrade} · {scopes.length} scopes
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-border bg-muted/30 p-3 space-y-1.5">
                            {scopes.map((sc) => (
                              <div
                                key={sc.id}
                                className="flex items-start justify-between gap-3 text-xs"
                              >
                                <div>
                                  <p className="font-medium">{sc.label}</p>
                                  <p className="font-mono text-[0.65rem] text-muted-foreground">
                                    verbs: {sc.verbs.join(' · ')}
                                  </p>
                                </div>
                                <span className="font-mono text-[0.65rem] bg-background border border-border px-1.5 py-0.5 rounded shrink-0">
                                  {sc.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
