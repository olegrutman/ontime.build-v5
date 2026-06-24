// SOV Template Manager - Placeholder for new schema
// The sov_templates table no longer exists in the new schema

import { Button } from '@/components/ui/button';
import { Save, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface SovTemplateManagerProps {
  disabled?: boolean;
}

export default function SovTemplateManager({ disabled = false }: SovTemplateManagerProps) {
  const handleSave = () => {
    toast.info('Template saving coming soon');
  };

  const handleLoad = () => {
    toast.info('Template loading coming soon');
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        disabled={disabled}
        onClick={handleSave}
      >
        <Save className="h-4 w-4 mr-1" />
        Save Template
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        disabled={disabled}
        onClick={handleLoad}
      >
        <FolderOpen className="h-4 w-4 mr-1" />
        Load Template
      </Button>
    </div>
  );
}
