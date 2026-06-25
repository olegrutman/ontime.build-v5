import { QuestionField } from './QuestionField';
import type { SetupQuestion } from '@/hooks/useSetupQuestions';

interface DynamicSectionProps {
  section: string;
  questions: SetupQuestion[];
  answers: Record<string, any>;
  buildingTypeSlug: string;
  onAnswer: (fieldKey: string, value: any) => void;
  getOptions: (q: SetupQuestion, slug: string) => string[] | null;
}

export function DynamicSection({
  section,
  questions,
  answers,
  buildingTypeSlug,
  onAnswer,
  getOptions,
}: DynamicSectionProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-base font-bold border-b border-border pb-2">
        {section}
      </h3>
      <div className="space-y-4">
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.field_key] ?? null}
            options={getOptions(q, buildingTypeSlug)}
            onChange={(val) => onAnswer(q.field_key, val)}
          />
        ))}
      </div>
    </div>
  );
}
