import { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProjectContract, getContractDisplayName, createScheduleItemsFromSOVItems, getExistingSOVItems } from '@/hooks/useContractSOV';

interface UploadSOVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: ProjectContract[];
  projectId: string;
  onCreated: () => void;
}

interface ParsedItem {
  name: string;
  percent: number;
}

type Stage = 'upload' | 'processing' | 'review';

export function UploadSOVDialog({ open, onOpenChange, contracts, projectId, onCreated }: UploadSOVDialogProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [selectedContractId, setSelectedContractId] = useState(contracts.length === 1 ? contracts[0].id : '');
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedContractId && contracts.length === 1) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const totalPercent = items.reduce((s, i) => s + i.percent, 0);
  const isValid = Math.abs(totalPercent - 100) < 0.1 && items.length > 0;

  const reset = () => {
    setStage('upload');
    setFile(null);
    setItems([]);
    setWarnings([]);
    setSelectedContractId(contracts.length === 1 ? contracts[0].id : '');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedContractId || !selectedContract) return;

    setStage('processing');

    try {
      // Check if an SOV already exists on this project — if so, inherit items
      const existingItems = await getExistingSOVItems(projectId);
      
      if (existingItems) {
        // Skip AI parsing — use inherited items
        setItems(existingItems.map(i => ({ name: i.item_name, percent: i.percent_of_contract })));
        setWarnings(['Items and percentages were inherited from an existing SOV on this project to maintain consistency.']);
        setStage('review');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf';

      const { data, error } = await supabase.functions.invoke('parse-sov-document', {
        body: {
          file_base64: base64,
          file_type: fileType,
          contract_sum: selectedContract.contract_sum,
        },
      });

      if (error) throw new Error(error.message || 'Failed to parse document');
      if (data?.error) throw new Error(data.error);

      setItems(data.items || []);
      setWarnings(data.warnings || []);
      setStage('review');
    } catch (err: any) {
      console.error('SOV parse error:', err);
      toast({ title: 'Parse Failed', description: err.message || 'Could not parse the document.', variant: 'destructive' });
      setStage('upload');
    }
  }, [file, selectedContractId, selectedContract, projectId]);

  const updateItemName = (index: number, name: string) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, name } : item)));
  };

  const updateItemPercent = (index: number, value: string) => {
    const percent = parseFloat(value) || 0;
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, percent } : item)));
  };

  const deleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleApply = async () => {
    if (!isValid || !selectedContract || !projectId) return;

    setSaving(true);
    try {
      const sovName = getContractDisplayName(
        selectedContract.from_role,
        selectedContract.to_role,
        selectedContract.from_org_name,
        selectedContract.to_org_name
      );

      const { data: newSov, error: sovError } = await supabase
        .from('project_sov')
        .insert({
          project_id: projectId,
          contract_id: selectedContract.id,
          sov_name: sovName,
          created_from_template_key: 'user_upload',
        })
        .select()
        .single();

      if (sovError) throw sovError;

      const itemsToInsert = items.map((item, index) => ({
        project_id: projectId,
        sov_id: newSov.id,
        sort_order: index,
        item_name: item.name,
        percent_of_contract: item.percent,
        value_amount: Math.round((selectedContract.contract_sum * item.percent / 100) * 100) / 100,
        source: 'user' as const,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('project_sov_items')
        .insert(itemsToInsert)
        .select('id, item_name, sort_order');
      if (itemsError) throw itemsError;

      // Schedule tasks are now auto-created by database trigger on project_sov_items INSERT

      toast({ title: 'SOV Created', description: `Created SOV with ${items.length} items and added them as schedule tasks.` });
      handleClose(false);
      onCreated();
    } catch (err: any) {
      console.error('SOV creation error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create SOV.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Your SOV</DialogTitle>
          <DialogDescription>
            {stage === 'upload' && 'Upload a PDF or CSV of your Schedule of Values and AI will extract the line items.'}
            {stage === 'processing' && 'AI is reading your SOV...'}
            {stage === 'review' && 'Review and edit the extracted items. Percentages must total 100%.'}
          </DialogDescription>
        </DialogHeader>

        {stage === 'upload' && (
          <div className="space-y-4">
            {contracts.length > 1 && (
              <div className="space-y-2">
                <Label>Contract</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {getContractDisplayName(c.from_role, c.to_role, c.from_org_name, c.to_org_name)} — {formatCurrency(c.contract_sum)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>SOV Document (PDF or CSV)</Label>
              <Input type="file" accept=".pdf,.csv" onChange={handleFileChange} />
              {file && (
                <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !selectedContractId}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload & Parse
            </Button>
          </div>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is reading your SOV...</p>
          </div>
        )}

        {stage === 'review' && (
          <div className="space-y-4">
            {warnings.map((w, i) => (
              <Alert key={i} variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{w}</AlertDescription>
              </Alert>
            ))}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{items.length} items extracted</p>
              <Badge variant={isValid ? 'secondary' : 'destructive'} className={isValid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                {isValid ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
                {totalPercent.toFixed(1)}%
              </Badge>
            </div>

            <div className="border rounded-md overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-24 text-right">%</TableHead>
                    {selectedContract && <TableHead className="w-28 text-right">Value</TableHead>}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={e => updateItemName(i, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.percent}
                          onChange={e => updateItemPercent(i, e.target.value)}
                          className="h-8 text-sm text-right w-20 ml-auto"
                        />
                      </TableCell>
                      {selectedContract && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatCurrency(selectedContract.contract_sum * item.percent / 100)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { reset(); }}>
                Start Over
              </Button>
              <Button onClick={handleApply} disabled={!isValid || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply SOV
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
