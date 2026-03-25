

# Add Regenerate Button for Project Description

## What
Currently the "Generate Description" button only shows when no description exists. Once generated, there's no way to regenerate it. Add a regenerate option next to the existing description.

## Change

### `src/components/project/ScopeDetailsTab.tsx` (~lines 247-265)

Replace the current either/or logic (show description OR show generate button) with: always show the description if it exists, AND always show a generate/regenerate button. When a description exists, show a small `RefreshCw` icon button next to or below the description text. When no description exists, keep the current "Generate Description" button.

```
{projectInfo?.description && (
  <div className="flex items-start gap-2">
    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{projectInfo.description}</p>
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleGenerateDescription} disabled={generatingDesc}>
      {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
    </Button>
  </div>
)}
{!projectInfo?.description && (
  <Button variant="outline" size="sm" onClick={handleGenerateDescription} disabled={generatingDesc} className="gap-1.5">
    {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    {generatingDesc ? 'Generating...' : 'Generate Description'}
  </Button>
)}
```

Add `RefreshCw` to the existing lucide-react imports.

### Files Changed
- `src/components/project/ScopeDetailsTab.tsx` — add regenerate button when description exists

