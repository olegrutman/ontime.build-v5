import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CODescriptionEditor } from '@/components/change-orders/CODescriptionEditor';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function openEditor(lineItemId: string | null = null) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(<QueryClientProvider client={client}><CODescriptionEditor coId="order" lineItemId={lineItemId} status="approved" title="Old title" description="Old description" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Current title with spaces' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Current description replaces old wording.' } });
  return invalidate;
}

describe('description edit approval choices', () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ error: null }); });
  it('quiet header saves replace wording without asking for approval', async () => {
    const invalidate = openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Save without approval' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('update_co_description', {
      _co_id: 'order', _line_item_id: null, _title: 'Current title with spaces',
      _description: 'Current description replaces old wording.', _request_review: false,
    }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['change-orders'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['co-detail', 'order'] });
  });
  it('scope edits request approval only when explicitly selected', async () => {
    openEditor('scope-item');
    fireEvent.click(screen.getByRole('button', { name: 'Save & request approval' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('update_co_description', {
      _co_id: 'order', _line_item_id: 'scope-item', _title: 'Current title with spaces',
      _description: 'Current description replaces old wording.', _request_review: true,
    }));
  });
});