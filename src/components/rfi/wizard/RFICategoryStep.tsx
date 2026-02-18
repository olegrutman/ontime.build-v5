import { Ruler, Package, FileQuestion, Building, Wrench, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RFI_CATEGORIES, RFI_QUESTION_TEMPLATES, type RFICategory, type RFIWizardData } from '@/types/rfi';

const CATEGORY_ICONS: Record<RFICategory, React.ElementType> = {
  dimensions: Ruler,
  product_material: Package,
  design_clarification: FileQuestion,
  structural: Building,
  mep_coordination: Wrench,
  general: MessageSquare,
};

interface RFICategoryStepProps {
  data: RFIWizardData;
  onChange: (updates: Partial<RFIWizardData>) => void;
}

export function RFICategoryStep({ data, onChange }: RFICategoryStepProps) {
  const selectedCategory = data.category;
  const templates = selectedCategory
    ? RFI_QUESTION_TEMPLATES.filter((t) => t.category === selectedCategory)
    : [];

  const handleCategorySelect = (key: RFICategory) => {
    onChange({ category: key, templateId: null, answers: {}, answerUnits: {} });
  };

  const handleTemplateSelect = (templateId: string) => {
    onChange({ templateId, answers: {}, answerUnits: {} });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">What is your question about?</h2>
        <p className="text-muted-foreground text-sm mt-1">Pick a category, then select a question</p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-3">
        {RFI_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.key];
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategorySelect(cat.key)}
              className={cn(
                'flex flex-col items-center text-center gap-2 p-4 rounded-lg border-2 transition-all',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{cat.label}</span>
              <span className={cn('text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {cat.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Template List */}
      {selectedCategory && templates.length > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-muted-foreground">Select a question:</p>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTemplateSelect(t.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all text-sm',
                data.templateId === t.id
                  ? 'bg-primary/10 border-primary font-medium'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
