import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendNotificationEmail } from '@/hooks/useNotificationEmail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Receipt,
  CheckCircle2,
  DollarSign,
  Clock,
  Send,
  FileText,
  Download,
  Loader2,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';
type ApprovalStatus = 'DRAFT' | 'NEEDS_APPROVAL' | 'APPROVED' | 'REJECTED';

interface Invoice {
  id: string;
  invoice_number: number;
  status: string;
  approval_status: ApprovalStatus;
  approver_role: AppRole | null;
  created_by_user_id: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  rejected_at: string | null;
  rejected_by_user_id: string | null;
  rejection_comments: string | null;
  paid_at: string | null;
  created_at: string;
  contract_context_id: string;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number | null;
  unit: string | null;
  unit_cost: number | null;
  amount: number;
}

interface InvoiceDetailProps {
  invoiceId: string;
  projectId: string;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor'
};

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { icon: any; color: string; bg: string; label: string }> = {
  'DRAFT': { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Draft' },
  'NEEDS_APPROVAL': { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Pending Approval' },
  'APPROVED': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Approved' },
  'REJECTED': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Rejected' }
};

export default function InvoiceDetail({ 
  invoiceId,
  projectId, 
  onClose, 
  onEdit,
  onUpdated 
}: InvoiceDetailProps) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');
  const [creatorProfile, setCreatorProfile] = useState<{ company_name: string; email: string } | null>(null);
  const [retainagePercent, setRetainagePercent] = useState(0);

  useEffect(() => {
    fetchInvoice();
    fetchUserRole();
  }, [invoiceId]);

  const fetchUserRole = async () => {
    if (!user || !projectId) return;
    
    const { data } = await supabase.rpc('get_user_project_role', {
      _project_id: projectId,
      _user_id: user.id
    });
    
    if (data) {
      setUserRole(data as AppRole);
    }
  };

  const fetchInvoice = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData as Invoice);

      // Fetch creator profile with email
      if (invoiceData?.created_by_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, company_id')
          .eq('id', invoiceData.created_by_user_id)
          .single();

        if (profile) {
          let companyName = 'Unknown Company';
          if (profile.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profile.company_id)
              .single();
            
            if (company) {
              companyName = company.name;
            }
          }
          setCreatorProfile({ company_name: companyName, email: profile.email });
        }
      }

      // Fetch retainage from project
      if (invoiceData?.contract_context_id) {
        const { data: contextData } = await supabase
          .from('contract_contexts')
          .select('project_id')
          .eq('id', invoiceData.contract_context_id)
          .single();
        
        if (contextData?.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('retainage_percent')
            .eq('id', contextData.project_id)
            .single();
          
          if (projectData?.retainage_percent) {
            setRetainagePercent(Number(projectData.retainage_percent));
          }
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as InvoiceLineItem[]);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!invoice || !user) return;
    setProcessing(true);

    try {
      // Use the submit_invoice RPC for proper routing and notifications
      const { error } = await supabase.rpc('submit_invoice', {
        _invoice_id: invoiceId
      });

      if (error) throw error;

      // Send email notification to approvers
      try {
        // Get project info via contract context
        const { data: contextData } = await supabase
          .from('contract_contexts')
          .select('project_id, projects(name)')
          .eq('id', invoice.contract_context_id)
          .single();

        if (contextData?.projects) {
          // Get approvers for this project (those with higher roles)
          const { data: members } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', contextData.project_id);

          // Send to all project members (they'll filter by role server-side)
          for (const member of members || []) {
            if (member.user_id !== user.id) {
              // Fetch email for each member
              const { data: memberProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', member.user_id)
                .single();
              
              if (memberProfile?.email) {
                await sendNotificationEmail({
                  type: 'invoice_submitted',
                  recipientEmail: memberProfile.email,
                  projectName: (contextData.projects as any).name || 'Unknown Project',
                  projectId: contextData.project_id,
                  invoiceNumber: invoice.invoice_number,
                  amount: calculateTotal()
                });
              }
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Invoice submitted for approval!');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error submitting invoice:', error);
      toast.error('Failed to submit invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice || !user) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          approval_status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by_user_id: user.id
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Send approval email to invoice creator
      try {
        if (creatorProfile?.email) {
          const { data: contextData } = await supabase
            .from('contract_contexts')
            .select('project_id, projects(name)')
            .eq('id', invoice.contract_context_id)
            .single();

          await sendNotificationEmail({
            type: 'invoice_approved',
            recipientEmail: creatorProfile.email,
            projectName: (contextData?.projects as any)?.name || 'Unknown Project',
            projectId: contextData?.project_id,
            invoiceNumber: invoice.invoice_number,
            amount: calculateTotal()
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Invoice approved!');
      onUpdated();
      fetchInvoice();
    } catch (error) {
      console.error('Error approving invoice:', error);
      toast.error('Failed to approve invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!invoice || !user || !rejectionComments.trim()) {
      toast.error('Please provide rejection comments');
      return;
    }
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          approval_status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          rejected_by_user_id: user.id,
          rejection_comments: rejectionComments.trim()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Send rejection email to invoice creator
      try {
        if (creatorProfile?.email) {
          const { data: contextData } = await supabase
            .from('contract_contexts')
            .select('project_id, projects(name)')
            .eq('id', invoice.contract_context_id)
            .single();

          await sendNotificationEmail({
            type: 'invoice_rejected',
            recipientEmail: creatorProfile.email,
            projectName: (contextData?.projects as any)?.name || 'Unknown Project',
            projectId: contextData?.project_id,
            invoiceNumber: invoice.invoice_number,
            amount: calculateTotal(),
            rejectionReason: rejectionComments.trim()
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Invoice rejected');
      onUpdated();
      fetchInvoice();
      setShowRejectForm(false);
    } catch (error) {
      console.error('Error rejecting invoice:', error);
      toast.error('Failed to reject invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Invoice marked as paid!');
      onUpdated();
      fetchInvoice();
    } catch (error) {
      console.error('Error marking invoice paid:', error);
      toast.error('Failed to update invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId }
      });

      if (error) throw error;

      if (data?.pdf) {
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || `Invoice_${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('PDF downloaded!');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateRetainage = () => {
    return calculateTotal() * (retainagePercent / 100);
  };

  const calculateNetPayable = () => {
    return calculateTotal() - calculateRetainage();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Receipt className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const approvalStatus = APPROVAL_STATUS_CONFIG[invoice.approval_status] || APPROVAL_STATUS_CONFIG['DRAFT'];
  const StatusIcon = approvalStatus.icon;
  const isCreator = user?.id === invoice.created_by_user_id;
  const canSubmit = invoice.approval_status === 'DRAFT' && isCreator;
  const canApprove = invoice.approval_status === 'NEEDS_APPROVAL' && userRole === invoice.approver_role;
  const canMarkPaid = invoice.approval_status === 'APPROVED' && invoice.status !== 'PAID';
  const canEdit = invoice.approval_status === 'DRAFT' && isCreator;

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex items-center h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold">Invoice #{invoice.invoice_number}</h1>
            <p className="text-xs text-primary-foreground/70">
              Created {format(new Date(invoice.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full ${approvalStatus.bg} flex items-center gap-1`}>
            <StatusIcon className={`h-4 w-4 ${approvalStatus.color}`} />
            <span className={`text-xs font-medium ${approvalStatus.color}`}>{approvalStatus.label}</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Rejection Notice */}
        {invoice.approval_status === 'REJECTED' && invoice.rejection_comments && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Invoice Rejected</p>
                  <p className="text-sm text-muted-foreground mt-1">{invoice.rejection_comments}</p>
                  {invoice.rejected_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Rejected on {format(new Date(invoice.rejected_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Pending Notice */}
        {invoice.approval_status === 'NEEDS_APPROVAL' && canApprove && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Approval Required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This invoice requires your approval
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Amount */}
        <Card className="border-0 shadow-md bg-accent/5">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <p className="text-3xl font-bold font-mono-construction">{formatCurrency(calculateTotal())}</p>
              <p className="text-sm text-muted-foreground">Gross Amount</p>
            </div>
            
            {retainagePercent > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retainage ({retainagePercent}%)</span>
                  <span className="font-mono text-destructive">-{formatCurrency(calculateRetainage())}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Net Payable</span>
                  <span className="font-mono text-success">{formatCurrency(calculateNetPayable())}</span>
                </div>
              </div>
            )}
            
            {invoice.paid_at && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-success">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creator Info */}
        {creatorProfile && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{creatorProfile.company_name}</p>
                  <p className="text-xs text-muted-foreground">Created by</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        {items.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      {item.qty && item.unit && (
                        <p className="text-xs text-muted-foreground">
                          {item.qty} {item.unit} @ {formatCurrency(item.unit_cost || 0)}
                        </p>
                      )}
                    </div>
                    <p className="font-mono-construction font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reject Form */}
        {showRejectForm && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">Rejection Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejection">Reason for rejection (required)</Label>
                <Textarea
                  id="rejection"
                  value={rejectionComments}
                  onChange={(e) => setRejectionComments(e.target.value)}
                  placeholder="Please explain why this invoice is being rejected..."
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing || !rejectionComments.trim()}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>

          {canEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit Invoice
            </Button>
          )}

          {canSubmit && (
            <Button onClick={handleSubmit} disabled={processing}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}

          {canApprove && !showRejectForm && (
            <>
              <Button onClick={handleApprove} disabled={processing} className="bg-success hover:bg-success/90">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Invoice
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowRejectForm(true)} 
                disabled={processing}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Invoice
              </Button>
            </>
          )}

          {canMarkPaid && (
            <Button onClick={handleMarkPaid} disabled={processing}>
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
