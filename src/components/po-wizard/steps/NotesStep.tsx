import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Check } from 'lucide-react';
import { POWizardData, QUICK_NOTES } from '@/types/poWizard';
import { cn } from '@/lib/utils';

interface NotesStepProps {
  data: POWizardData;
  onChange: (updates: Partial<POWizardData>) => void;
}

export function NotesStep({ data, onChange }: NotesStepProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>(() => {
    // Initialize with any quick notes already in the notes field
    return QUICK_NOTES.filter(note => data.notes.includes(note));
  });

  const toggleQuickNote = (note: string) => {
    const isSelected = selectedChips.includes(note);
    let newSelected: string[];
    
    if (isSelected) {
      newSelected = selectedChips.filter(n => n !== note);
    } else {
      newSelected = [...selectedChips, note];
    }
    
    setSelectedChips(newSelected);
    
    // Build notes from quick notes + any custom text
    const customText = data.notes
      .split('\n')
      .filter(line => !QUICK_NOTES.includes(line.trim()))
      .join('\n')
      .trim();
    
    const newNotes = [...newSelected, customText].filter(Boolean).join('\n');
    onChange({ notes: newNotes });
  };

  const handleTextChange = (text: string) => {
    onChange({ notes: text });
    // Update selected chips based on text
    setSelectedChips(QUICK_NOTES.filter(note => text.includes(note)));
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const newNotes = data.notes ? `${data.notes}\n${transcript}` : transcript;
      onChange({ notes: newNotes });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Delivery Notes</h2>
        <p className="text-muted-foreground text-sm">
          Optional instructions for the supplier
        </p>
      </div>

      {/* Quick Notes Chips */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Quick Add
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_NOTES.map((note) => {
            const isSelected = selectedChips.includes(note);
            return (
              <Badge
                key={note}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all px-3 py-2 text-sm touch-manipulation',
                  isSelected ? '' : 'hover:bg-primary/10'
                )}
                onClick={() => toggleQuickNote(note)}
              >
                {isSelected && <Check className="h-3 w-3 mr-1" />}
                {note}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Voice Input */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Or Speak
        </p>
        <Card className="p-6 text-center">
          <Button
            variant={isListening ? 'destructive' : 'outline'}
            size="lg"
            className="h-16 w-16 rounded-full touch-manipulation"
            onClick={startVoiceInput}
            disabled={isListening}
          >
            {isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            {isListening ? 'Listening...' : 'Tap to speak'}
          </p>
        </Card>
      </div>

      {/* Text Input */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Or Type
        </p>
        <Textarea
          placeholder="Additional notes for the supplier..."
          value={data.notes}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
}
