import { Download, ExternalLink, FileText, Loader2, Receipt, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CODocumentType } from '@/types/changeOrder';

interface COHeaderCommandPanelProps {
  documentType: CODocumentType;
  linkedInvoiceNumber?: string | null;
  canCreateInvoice: boolean;
  downloadingPdf: boolean;
  downloadingProposal: boolean;
  onDownloadPdf: () => void;
  onDownloadProposal: () => void;
  onInvoice: () => void;
  onOutsideApproval: () => void;
  onInviteExternal?: () => void;
}

const documentButtonClass = 'h-full min-h-12 w-full justify-start rounded-xl border border-command-foreground/15 bg-command-foreground px-3 py-2.5 text-left text-xs font-semibold text-foreground shadow-sm hover:bg-command-foreground/90 hover:text-foreground sm:whitespace-normal';

export function COHeaderCommandPanel({
  documentType,
  linkedInvoiceNumber,
  canCreateInvoice,
  downloadingPdf,
  downloadingProposal,
  onDownloadPdf,
  onDownloadProposal,
  onInvoice,
  onOutsideApproval,
  onInviteExternal,
}: COHeaderCommandPanelProps) {
  const isWorkOrder = documentType === 'WO';
  const invoiceDisabled = !linkedInvoiceNumber && !canCreateInvoice;
  const invoiceActionLabel = canCreateInvoice ? 'Create invoice' : 'Invoice';

  return (
    <div className="mt-4 border-t border-command-foreground/15 pt-4" aria-label="Order document actions">
      <div className="grid grid-cols-2 gap-2 xl:flex xl:items-stretch xl:gap-2.5">
        <div className="contents xl:flex xl:gap-2.5">
          <div className="min-w-0 xl:w-36">
            <Button
              type="button"
              variant="outline"
              className={documentButtonClass}
              onClick={onDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 className="animate-spin" /> : <Download />}
              <span className="min-w-0 flex-1 break-words">{downloadingPdf ? 'Preparing PDF…' : 'PDF document'}</span>
            </Button>
          </div>

          <div className="min-w-0 xl:w-36">
            <Button
              type="button"
              variant="outline"
              className={documentButtonClass}
              onClick={onDownloadProposal}
              disabled={!isWorkOrder || downloadingProposal || downloadingPdf}
              title={!isWorkOrder ? 'Proposals are available for work orders' : undefined}
            >
              {downloadingProposal ? <Loader2 className="animate-spin" /> : <FileText />}
              <span className="min-w-0 flex-1 break-words">{downloadingProposal ? 'Preparing proposal…' : 'Proposal'}</span>
            </Button>
          </div>

          <div className="min-w-0 xl:w-64">
            <Button
              type="button"
              variant="outline"
              className={documentButtonClass}
              onClick={onInvoice}
              disabled={invoiceDisabled}
              title={invoiceDisabled ? 'No billable balance is currently available' : undefined}
              aria-label={canCreateInvoice ? 'Create invoice' : linkedInvoiceNumber ? `Open linked invoice ${linkedInvoiceNumber}` : 'Invoice'}
            >
              <Receipt />
              <span className="min-w-0 flex-1">
                <span className="block break-words">{invoiceActionLabel}</span>
                {!canCreateInvoice && linkedInvoiceNumber && (
                  <span className="mt-0.5 block font-mono text-[10px] font-medium leading-tight opacity-70 [overflow-wrap:anywhere]">
                    {linkedInvoiceNumber}
                  </span>
                )}
              </span>
            </Button>
          </div>
        </div>

        <div className="min-w-0 xl:ml-auto xl:w-52 xl:border-l xl:border-command-foreground/15 xl:pl-3">
          <Button
            type="button"
            variant="outline"
            className="h-full min-h-12 w-full justify-start rounded-xl border border-state-approved/50 bg-state-approved px-3 py-2.5 text-left text-xs font-semibold text-state-approved-foreground shadow-sm hover:bg-state-approved/90 hover:text-state-approved-foreground sm:whitespace-normal"
            onClick={onOutsideApproval}
          >
            <ShieldCheck />
            <span className="min-w-0 flex-1 break-words">Outside approval</span>
          </Button>
        </div>
      </div>

      {onInviteExternal && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 gap-1.5 px-1 text-xs text-command-foreground/70 hover:bg-command-foreground/10 hover:text-command-foreground"
          onClick={onInviteExternal}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Invite external party
        </Button>
      )}
    </div>
  );
}
