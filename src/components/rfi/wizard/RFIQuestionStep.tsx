import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RFI_QUESTION_TEMPLATES, UNIT_OPTIONS, type RFIWizardData } from '@/types/rfi';

interface RFIQuestionStepProps {
  data: RFIWizardData;
  onChange: (updates: Partial<RFIWizardData>) => void;
}

export function RFIQuestionStep({ data, onChange }: RFIQuestionStepProps) {
  const template = RFI_QUESTION_TEMPLATES.find((t) => t.id === data.templateId);

  if (!template) {
    return <p className="text-muted-foreground text-center py-8">No template selected</p>;
  }

  const updateAnswer = (key: string, value: string) => {
    onChange({ answers: { ...data.answers, [key]: value } });
  };

  const updateUnit = (key: string, value: string) => {
    onChange({ answerUnits: { ...data.answerUnits, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">{template.label}</h2>
        <p className="text-muted-foreground text-sm mt-1">Fill in the details below</p>
      </div>

      <div className="space-y-4">
        {template.prompts.map((prompt) => (
          <div key={prompt.key}>
            <Label className="mb-2 block">{prompt.label}</Label>
            {prompt.type === 'textarea' ? (
              <Textarea
                value={data.answers[prompt.key] || ''}
                onChange={(e) => updateAnswer(prompt.key, e.target.value)}
                placeholder={prompt.placeholder}
                rows={3}
              />
            ) : prompt.type === 'select' ? (
              <Select
                value={data.answers[prompt.key] || ''}
                onValueChange={(v) => updateAnswer(prompt.key, v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={`Select ${prompt.label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {prompt.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  className="h-11 flex-1"
                  value={data.answers[prompt.key] || ''}
                  onChange={(e) => updateAnswer(prompt.key, e.target.value)}
                  placeholder={prompt.placeholder}
                />
                {prompt.unit && (
                  <Select
                    value={data.answerUnits[prompt.key] || 'in'}
                    onValueChange={(v) => updateUnit(prompt.key, v)}
                  >
                    <SelectTrigger className="w-20 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
