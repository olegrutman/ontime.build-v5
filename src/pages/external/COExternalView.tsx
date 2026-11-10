import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Loader2, AlertTriangle, FileText, DollarSign, ClipboardCheck, MessageSquare, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface InviteData {
  id: string;
  co_id: string;
  email: string;
  invite_purpose: string;
  responded_at: string | null;
  response_data: any;
  respondent_name: string | null;
  expires_at: string;
}

interface COData {
  id: string;
  co_number: string | null;
  title: string | null;
  status: string;
  document_type: string;
  location_tag: string | null;
  reason_note: string | null;
  pricing_type: string;
}

interface LineItem {
  id: string;
  item_name: string;
  description: string | null;
  unit: string;
}

export default function COExternalView() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [co, setCO] = useState<COData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Form state
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [scopeAcknowledged, setScopeAcknowledged] = useState(false);
  const [pricingItems, setPricingItems] = useState<Record<string, { price: string; note: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    async function load() {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: { action: 'load_invite', token },
      });

      if (fnErr || !data || (data as any).error) {
        setError((data as any)?.error ?? 'This link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const { invite: inv, co: coData, line_items: items } = data as any;

      if (inv.responded_at) {
        setInvite(inv);
        setDone(true);
        setLoading(false);
        return;
      }

      setInvite(inv);
      setRespondentEmail(inv.email);

      if (coData) {
        setCO(coData as COData);
        if (items && Array.isArray(items)) {
          setLineItems(items as LineItem[]);
          const initial: Record<string, { price: string; note: string }> = {};
          items.forEach((it: any) => { initial[it.id] = { price: '', note: '' }; });
          setPricingItems(initial);
        }
      }

      setLoading(false);
    }

    load();
  }, [token]);


  const handleSubmit = async () => {
    if (!invite || !respondentName.trim() || !respondentEmail.trim() || !token) return;
    setSubmitting(true);

    try {
      const body: any = {
        action: 'submit_invite_response',
        token,
        respondent_name: respondentName.trim(),
        respondent_email: respondentEmail.trim(),
        notes: notes.trim(),
      };

      if (invite.invite_purpose === 'pricing') {
        body.line_item_pricing = Object.entries(pricingItems).map(([itemId, data]) => ({
          line_item_id: itemId,
          price: data.price ? parseFloat(data.price) : null,
          note: data.note,
        }));
        body.total_price = Object.values(pricingItems).reduce(
          (sum, d) => sum + (d.price ? parseFloat(d.price) : 0), 0
        );
      }

      if (invite.invite_purpose === 'scope_ack') {
        body.scope_acknowledged = scopeAcknowledged;
      }

      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', { body });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed');

      setDone(true);
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-state-open mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Link Issue</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-state-approved-bg flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-state-approved" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Response Submitted</h1>
          <p className="text-muted-foreground">
            Your response has been recorded. The project team will be notified. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  const purposeConfig = {
    pricing: { icon: DollarSign, title: 'Pricing Request', color: 'text-type-sov' },
    scope_ack: { icon: ClipboardCheck, title: 'Scope Confirmation', color: 'text-state-approved' },
    acknowledge: { icon: MessageSquare, title: 'Acknowledgment Request', color: 'text-muted-foreground' },
  }[invite?.invite_purpose ?? 'pricing'] ?? { icon: FileText, title: 'Response', color: 'text-muted-foreground' };

  const PurposeIcon = purposeConfig.icon;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-foreground text-white no-print">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <PurposeIcon className={`h-6 w-6 ${purposeConfig.color === 'text-type-sov' ? 'text-type-sov' : purposeConfig.color === 'text-state-approved' ? 'text-state-approved' : 'text-white/60'}`} />
              <h1 className="text-lg font-bold font-['Barlow_Condensed'] uppercase tracking-wide">
                {purposeConfig.title}
              </h1>
            </div>
            {co && (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-sm text-white/60">{co.co_number}</span>
                <span className="text-white font-medium">{co.title}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="shrink-0 bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 print-page">
        {/* CO Details - Read Only */}
        {co && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Change Order Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Number</span><p className="font-mono font-semibold">{co.co_number ?? '—'}</p></div>
              <div><span className="text-muted-foreground">Type</span><p className="font-semibold">{co.document_type}</p></div>
              {co.location_tag && <div><span className="text-muted-foreground">Location</span><p className="font-semibold">{co.location_tag}</p></div>}
              {co.reason_note && <div><span className="text-muted-foreground">Reason</span><p className="font-semibold">{co.reason_note}</p></div>}
            </div>
          </div>
        )}

        {/* Scope Items */}
        {lineItems.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Scope Items ({lineItems.length})
            </h2>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.item_name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}

                      {/* Pricing input for pricing purpose */}
                      {invite?.invite_purpose === 'pricing' && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Your Price</Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-7 h-8 text-sm"
                                placeholder="0.00"
                                value={pricingItems[item.id]?.price ?? ''}
                                onChange={e => setPricingItems(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], price: e.target.value },
                                }))}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Note (optional)</Label>
                            <Input
                              className="h-8 text-sm"
                              placeholder="Any notes…"
                              value={pricingItems[item.id]?.note ?? ''}
                              onChange={e => setPricingItems(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], note: e.target.value },
                              }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing total */}
            {invite?.invite_purpose === 'pricing' && (
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="font-mono text-lg font-bold text-foreground">
                  ${Object.values(pricingItems).reduce((s, d) => s + (d.price ? parseFloat(d.price) : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Scope acknowledgment checkbox */}
        {invite?.invite_purpose === 'scope_ack' && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={scopeAcknowledged}
                onCheckedChange={(val) => setScopeAcknowledged(!!val)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">I acknowledge the scope above</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By checking this box, you confirm you have reviewed the scope items and agree to proceed.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Response Form */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4 no-print">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Response</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Your Full Name *</Label>
              <Input
                value={respondentName}
                onChange={e => setRespondentName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Your Email *</Label>
              <Input
                type="email"
                value={respondentEmail}
                onChange={e => setRespondentEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes or Comments</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes, questions, or conditions…"
              rows={4}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            By submitting, you confirm your identity and consent to this response being used as a legal record.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !respondentName.trim() || !respondentEmail.trim() || (invite?.invite_purpose === 'scope_ack' && !scopeAcknowledged)}
            className="w-full"
            size="lg"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Response
          </Button>
        </div>
      </div>
    </div>
  );
}
