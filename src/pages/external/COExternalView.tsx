import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Loader2, AlertTriangle, FileText, DollarSign, ClipboardCheck, MessageSquare } from 'lucide-react';
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
      // Fetch invite by token
      const { data: inviteData, error: invErr } = await supabase
        .from('co_external_invites')
        .select('*')
        .eq('token', token!)
        .maybeSingle();

      if (invErr || !inviteData) {
        setError('This link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const inv = inviteData as unknown as InviteData;

      // Check expiry
      if (new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired. Please request a new link from the project team.');
        setLoading(false);
        return;
      }

      if (inv.responded_at) {
        setInvite(inv);
        setDone(true);
        setLoading(false);
        return;
      }

      setInvite(inv);
      setRespondentEmail(inv.email);

      // Fetch CO details
      const { data: coData } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, document_type, location_tag, reason_note, pricing_type')
        .eq('id', inv.co_id)
        .single();

      if (coData) {
        setCO(coData as unknown as COData);

        // Fetch line items
        const { data: items } = await supabase
          .from('co_line_items')
          .select('id, item_name, description, unit')
          .eq('co_id', inv.co_id)
          .order('sort_order');

        if (items) {
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
    if (!invite || !respondentName.trim() || !respondentEmail.trim()) return;
    setSubmitting(true);

    try {
      const responseData: any = {
        purpose: invite.invite_purpose,
        notes: notes.trim(),
        submitted_at: new Date().toISOString(),
        respondent_email: respondentEmail.trim(),
        user_agent: navigator.userAgent,
      };

      if (invite.invite_purpose === 'pricing') {
        responseData.line_item_pricing = Object.entries(pricingItems).map(([itemId, data]) => ({
          line_item_id: itemId,
          price: data.price ? parseFloat(data.price) : null,
          note: data.note,
        }));
        responseData.total_price = Object.values(pricingItems).reduce(
          (sum, d) => sum + (d.price ? parseFloat(d.price) : 0), 0
        );
      }

      if (invite.invite_purpose === 'scope_ack') {
        responseData.scope_acknowledged = scopeAcknowledged;
      }

      const { error: updateErr } = await supabase
        .from('co_external_invites')
        .update({
          responded_at: new Date().toISOString(),
          response_data: responseData,
          respondent_name: respondentName.trim(),
        } as any)
        .eq('id', invite.id);

      if (updateErr) throw updateErr;

      // Log activity on the CO
      await supabase.from('co_activity').insert({
        co_id: invite.co_id,
        project_id: co?.id ? undefined : undefined,
        actor_user_id: null,
        actor_role: 'EXT',
        action: 'external_response',
        detail: `External response from ${respondentName.trim()} (${respondentEmail.trim()}) — ${invite.invite_purpose}`,
      } as any);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link Issue</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Response Submitted</h1>
          <p className="text-slate-600">
            Your response has been recorded. The project team will be notified. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  const purposeConfig = {
    pricing: { icon: DollarSign, title: 'Pricing Request', color: 'text-blue-600' },
    scope_ack: { icon: ClipboardCheck, title: 'Scope Confirmation', color: 'text-emerald-600' },
    acknowledge: { icon: MessageSquare, title: 'Acknowledgment Request', color: 'text-slate-600' },
  }[invite?.invite_purpose ?? 'pricing'] ?? { icon: FileText, title: 'Response', color: 'text-slate-600' };

  const PurposeIcon = purposeConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-3">
            <PurposeIcon className={`h-6 w-6 ${purposeConfig.color === 'text-blue-600' ? 'text-blue-400' : purposeConfig.color === 'text-emerald-600' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <h1 className="text-lg font-bold font-['Barlow_Condensed'] uppercase tracking-wide">
              {purposeConfig.title}
            </h1>
          </div>
          {co && (
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-sm text-slate-300">{co.co_number}</span>
              <span className="text-white font-medium">{co.title}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* CO Details - Read Only */}
        {co && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Change Order Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Number</span><p className="font-mono font-semibold">{co.co_number ?? '—'}</p></div>
              <div><span className="text-slate-500">Type</span><p className="font-semibold">{co.document_type}</p></div>
              {co.location_tag && <div><span className="text-slate-500">Location</span><p className="font-semibold">{co.location_tag}</p></div>}
              {co.reason_note && <div><span className="text-slate-500">Reason</span><p className="font-semibold">{co.reason_note}</p></div>}
            </div>
          </div>
        )}

        {/* Scope Items */}
        {lineItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
              Scope Items ({lineItems.length})
            </h2>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-slate-400 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.item_name}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      )}

                      {/* Pricing input for pricing purpose */}
                      {invite?.invite_purpose === 'pricing' && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-slate-500">Your Price</Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
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
                            <Label className="text-xs text-slate-500">Note (optional)</Label>
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
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  ${Object.values(pricingItems).reduce((s, d) => s + (d.price ? parseFloat(d.price) : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Scope acknowledgment checkbox */}
        {invite?.invite_purpose === 'scope_ack' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={scopeAcknowledged}
                onCheckedChange={(val) => setScopeAcknowledged(!!val)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">I acknowledge the scope above</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  By checking this box, you confirm you have reviewed the scope items and agree to proceed.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Response Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Your Response</h2>

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

          <p className="text-xs text-slate-400">
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
