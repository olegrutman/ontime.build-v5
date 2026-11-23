import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COHeaderCommandPanel } from './COHeaderCommandPanel';

const callbacks = vi.hoisted(() => ({
  pdf: vi.fn(),
  proposal: vi.fn(),
  invoice: vi.fn(),
  outside: vi.fn(),
}));

function renderPanel(overrides: Partial<Parameters<typeof COHeaderCommandPanel>[0]> = {}) {
  return render(
    <COHeaderCommandPanel
      documentType="WO"
      linkedInvoiceNumber={null}
      canCreateInvoice
      downloadingPdf={false}
      downloadingProposal={false}
      onDownloadPdf={callbacks.pdf}
      onDownloadProposal={callbacks.proposal}
      onInvoice={callbacks.invoice}
      onOutsideApproval={callbacks.outside}
      {...overrides}
    />,
  );
}

describe('CO header document commands', () => {
  beforeEach(() => Object.values(callbacks).forEach(callback => callback.mockReset()));

  it('shows the linked invoice number and keeps its open action', () => {
    renderPanel({ linkedInvoiceNumber: 'INV-5 C-PA-IM-COMULTI-0002', canCreateInvoice: false });
    const invoice = screen.getByRole('button', { name: 'Open linked invoice INV-5 C-PA-IM-COMULTI-0002' });
    expect(invoice).toBeEnabled();
    expect(screen.getByText('INV-5 C-PA-IM-COMULTI-0002')).toBeInTheDocument();
    fireEvent.click(invoice);
    expect(callbacks.invoice).toHaveBeenCalledTimes(1);
  });

  it('retains invoice creation when no invoice is linked and a balance is available', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Create invoice' }));
    expect(callbacks.invoice).toHaveBeenCalledTimes(1);
  });

  it('does not offer invoice creation without a linked invoice or available balance', () => {
    renderPanel({ canCreateInvoice: false });
    expect(screen.getByRole('button', { name: 'Invoice' })).toBeDisabled();
  });

  it('preserves download and signing callbacks and disables unavailable actions', () => {
    renderPanel({ documentType: 'CO', downloadingPdf: true, downloadingProposal: true });
    expect(screen.getByRole('button', { name: 'Preparing PDF…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preparing proposal…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Outside approval' }));
    expect(callbacks.outside).toHaveBeenCalledTimes(1);
  });
});
