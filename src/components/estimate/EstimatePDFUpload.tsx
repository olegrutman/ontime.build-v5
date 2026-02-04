import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PDFUpload {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface EstimatePDFUploadProps {
  estimateId: string;
  supplierOrgId: string;
  existingUpload: PDFUpload | null;
  onUploadComplete: () => void;
  onParseComplete: (stats: { total_items: number; matched: number; needs_review: number }) => void;
  disabled?: boolean;
}

export function EstimatePDFUpload({
  estimateId,
  supplierOrgId,
  existingUpload,
  onUploadComplete,
  onParseComplete,
  disabled = false,
}: EstimatePDFUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be under 20MB');
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `${estimateId}/${timestamp}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('estimate-pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create upload record
      const { error: recordError } = await supabase
        .from('estimate_pdf_uploads')
        .insert({
          estimate_id: estimateId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user?.id,
        });

      if (recordError) {
        // Clean up uploaded file
        await supabase.storage.from('estimate-pdfs').remove([filePath]);
        throw recordError;
      }

      toast.success('PDF uploaded successfully');
      onUploadComplete();

      // Start parsing
      setParsing(true);
      setUploading(false);

      const { data, error: parseError } = await supabase.functions.invoke('parse-estimate-pdf', {
        body: {
          estimate_id: estimateId,
          file_path: filePath,
          supplier_org_id: supplierOrgId,
        },
      });

      if (parseError) {
        console.error('Parse error:', parseError);
        toast.error('Failed to parse PDF. You can review and add items manually.');
      } else if (data?.success) {
        toast.success(`Parsed ${data.stats.total_items} items from PDF`);
        onParseComplete(data.stats);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error?.message || 'Failed to upload PDF';
      toast.error(message.includes('policy') ? 'Storage access denied. Check bucket policies.' : message);
    } finally {
      setUploading(false);
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!existingUpload) return;

    try {
      // Delete from database first
      const { error: deleteError } = await supabase
        .from('estimate_pdf_uploads')
        .delete()
        .eq('id', existingUpload.id);

      if (deleteError) throw deleteError;

      toast.success('PDF removed');
      onUploadComplete();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove PDF');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (existingUpload) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{existingUpload.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(existingUpload.file_size)} • Uploaded {format(new Date(existingUpload.uploaded_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          {!disabled && (
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading || parsing}
      />
      <Card
        className={`border-dashed cursor-pointer hover:border-primary/50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && !uploading && !parsing && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading PDF...</p>
            </>
          ) : parsing ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Parsing estimate items...</p>
              <p className="text-xs text-muted-foreground">This may take a moment</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Upload PDF Estimate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF files up to 20MB
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
