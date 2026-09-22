import { supabase } from '@/integrations/supabase/client';

const PREF_KEY = 'invoice-attach-pdf';

/** Whether the user wants a PDF copy linked in the submission email. Defaults to on. */
export function getAttachPdfPreference(): boolean {
  return localStorage.getItem(PREF_KEY) !== 'false';
}

export function setAttachPdfPreference(value: boolean) {
  localStorage.setItem(PREF_KEY, value ? 'true' : 'false');
}

/**
 * Builds the invoice PDF and stores a shareable download link on the invoice so
 * the notification email can carry it. Never throws — submitting must not fail
 * because a document could not be produced.
 */
export async function attachInvoicePdf(invoiceId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoice_id: invoiceId },
    });
    if (error) throw error;
    return (data as { url?: string })?.url ?? null;
  } catch (err) {
    console.error('Could not attach invoice PDF', err);
    return null;
  }
}

/** Clears a previously attached document link (e.g. when an invoice is revised). */
export async function clearInvoicePdf(invoiceId: string) {
  await supabase
    .from('invoices')
    .update({ invoice_pdf_url: null, invoice_pdf_generated_at: null })
    .eq('id', invoiceId);
}
