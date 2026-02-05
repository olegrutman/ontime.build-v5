import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUp, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ParsedPack } from '@/lib/parseEstimateCSV';

type Phase = 'idle' | 'uploading' | 'parsing' | 'error';

interface PdfUploadStepProps {
  estimateId: string;
  onParsed: (packs: ParsedPack[], warnings: string[]) => void;
  onCancel: () => void;
}

export function PdfUploadStep({ estimateId, onParsed, onCancel }: PdfUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('PDF must be under 20MB. Try splitting into smaller files.');
      return;
    }

    setFileName(file.name);
    setErrorMessage('');
    setPhase('uploading');
    setUploadProgress(10);

    try {
      // 1. Upload to storage
      const filePath = `${estimateId}/${Date.now()}_${file.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('estimate-pdfs')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(50);

      // 2. Record upload in tracking table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('estimate_pdf_uploads').insert({
          estimate_id: estimateId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        });
      }
      setUploadProgress(60);

      // 3. Call AI parsing function
      setPhase('parsing');
      setUploadProgress(70);

      const { data, error: fnError } = await supabase.functions.invoke('parse-estimate-pdf', {
        body: { estimateId, filePath },
      });

      setUploadProgress(95);

      if (fnError) {
        // The function invoke wraps errors — check for structured error
        throw new Error(fnError.message || 'AI parsing failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.packs || data.packs.length === 0) {
        throw new Error('No items could be extracted from this PDF.');
      }

      setUploadProgress(100);

      // Show warnings as toasts
      const warnings: string[] = data.warnings || [];
      warnings.forEach((w: string) => toast.warning(w));

      toast.success(`Extracted ${data.totalItems} items from ${data.packs.length} packs`);
      onParsed(data.packs, warnings);
    } catch (err: any) {
      console.error('PDF processing error:', err);
      const msg = err?.message || 'Failed to process PDF';
      setErrorMessage(msg);
      setPhase('error');

      // Surface rate limit / credits errors as toasts
      if (msg.includes('busy') || msg.includes('429')) {
        toast.error('AI service is busy — please wait a moment and try again.');
      } else if (msg.includes('credits') || msg.includes('402')) {
        toast.error('AI credits exhausted. Please add credits to your workspace.');
      } else {
        toast.error(msg);
      }
    }
  }, [estimateId, onParsed]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleRetry = () => {
    setPhase('idle');
    setErrorMessage('');
    setUploadProgress(0);
    setFileName('');
  };

  return (
    <div className="space-y-4">
      {phase === 'idle' && (
        <div
          className={`flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-4 rounded-full bg-muted">
            <FileUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="font-medium mb-1">Drop your PDF quote here</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              AI will extract SKUs, descriptions, quantities, and UOMs automatically.
              Max 20MB. Pricing data is excluded.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button size="lg" variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <FileText className="h-5 w-5 mr-2" />
            Select PDF
          </Button>
        </div>
      )}

      {(phase === 'uploading' || phase === 'parsing') && (
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <h3 className="font-medium">
              {phase === 'uploading' ? 'Uploading PDF…' : 'AI is extracting line items…'}
            </h3>
            <p className="text-sm text-muted-foreground">{fileName}</p>
            {phase === 'parsing' && (
              <p className="text-xs text-muted-foreground">
                This may take 15–30 seconds for large documents
              </p>
            )}
          </div>
          <Progress value={uploadProgress} className="w-64 h-2" />
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-medium">Extraction Failed</h3>
            <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleRetry}>Try Another File</Button>
          </div>
        </div>
      )}
    </div>
  );
}
