import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUp, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ParsedPack } from '@/lib/parseEstimateCSV';

type Phase = 'idle' | 'uploading' | 'parsing' | 'polling' | 'error';

interface PdfUploadStepProps {
  estimateId: string;
  onParsed: (packs: ParsedPack[], warnings: string[], estimateTotal?: number | null) => void;
  onCancel: () => void;
}

export function PdfUploadStep({ estimateId, onParsed, onCancel }: PdfUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup polling on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // On mount: check for in-progress or completed parses
  useEffect(() => {
    let cancelled = false;

    async function checkExisting() {
      try {
        const { data } = await supabase
          .from('estimate_pdf_uploads')
          .select('*')
          .eq('estimate_id', estimateId)
          .in('status', ['processing', 'completed'])
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || !data) return;

        if (data.status === 'completed' && data.parsed_result) {
          const result = data.parsed_result as any;
          toast.success(`Resumed: ${result.totalItems} items from ${result.packs.length} packs`);
          onParsed(result.packs, result.warnings || [], result.estimate_total ?? null);
        } else if (data.status === 'processing') {
          setFileName(data.file_name);
          setPhase('polling');
          setUploadProgress(70);
          startPolling(data.id);
        }
      } catch (err) {
        console.error('Error checking existing uploads:', err);
      }
    }

    checkExisting();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId]);

  const startPolling = useCallback((uploadId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let elapsed = 0;
    const maxWait = 120_000; // 2 minutes

    pollingRef.current = setInterval(async () => {
      elapsed += 3000;

      if (!mountedRef.current) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }

      if (elapsed > maxWait) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setErrorMessage('Parsing timed out. Please try again.');
        setPhase('error');
        return;
      }

      try {
        const { data } = await supabase
          .from('estimate_pdf_uploads')
          .select('status, parsed_result, error_message')
          .eq('id', uploadId)
          .single();

        if (!data || !mountedRef.current) return;

        if (data.status === 'completed' && data.parsed_result) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          const result = data.parsed_result as any;
          setUploadProgress(100);
          toast.success(`Extracted ${result.totalItems} items from ${result.packs.length} packs`);
          onParsed(result.packs, result.warnings || [], result.estimate_total ?? null);
        } else if (data.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(data.error_message || 'Parsing failed');
          setPhase('error');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  }, [onParsed]);

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
      let uploadRowId: string | null = null;
      if (user) {
        const { data: insertData } = await supabase.from('estimate_pdf_uploads').insert({
          estimate_id: estimateId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          status: 'pending',
        } as any).select('id').single();
        uploadRowId = insertData?.id ?? null;
      }
      setUploadProgress(60);

      // 3. Call AI parsing function
      setPhase('parsing');
      setUploadProgress(70);

      const { data, error: fnError } = await supabase.functions.invoke('parse-estimate-pdf', {
        body: { estimateId, filePath },
      });

      // If we're still mounted and got a response, use it directly
      if (!mountedRef.current) return;

      setUploadProgress(95);

      if (fnError) {
        throw new Error(fnError.message || 'AI parsing failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.packs || data.packs.length === 0) {
        throw new Error('No items could be extracted from this PDF.');
      }

      setUploadProgress(100);

      const warnings: string[] = data.warnings || [];
      warnings.forEach((w: string) => toast.warning(w));

      toast.success(`Extracted ${data.totalItems} items from ${data.packs.length} packs`);
      onParsed(data.packs, warnings, data.estimate_total ?? null);
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error('PDF processing error:', err);
      const msg = err?.message || 'Failed to process PDF';
      setErrorMessage(msg);
      setPhase('error');

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
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPhase('idle');
    setErrorMessage('');
    setUploadProgress(0);
    setFileName('');
  };

  const isProcessing = phase === 'uploading' || phase === 'parsing' || phase === 'polling';

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
              AI will extract items and total pricing automatically.
              Max 20MB.
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

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <h3 className="font-medium">
              {phase === 'uploading' ? 'Uploading PDF…' : 'AI is extracting line items…'}
            </h3>
            <p className="text-sm text-muted-foreground">{fileName}</p>
            {(phase === 'parsing' || phase === 'polling') && (
              <p className="text-xs text-muted-foreground">
                {phase === 'polling'
                  ? 'Resuming — checking for results…'
                  : 'This may take 15–30 seconds for large documents'}
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
