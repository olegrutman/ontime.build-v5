/**
 * End-to-end behavior tests for the Voice → Problem Note flow.
 *
 * Covers:
 *  - recording start/stop via MediaRecorder
 *  - upload to the `co-voice-notes` storage bucket
 *  - invocation of the `co-voice-pn` edge function with the right payload
 *  - navigation to the freshly-created draft CO
 *  - re-record reset behavior
 *  - the 2-minute hard cap auto-stopping the recorder
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VoicePNRecorder } from './VoicePNRecorder';

// ── Mocks ────────────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (_bucket: string) => ({
        upload: uploadMock,
        createSignedUrl: createSignedUrlMock,
      }),
    },
    functions: {
      invoke: invokeMock,
    },
  },
}));

// ── MediaRecorder + getUserMedia harness ─────────────────────────────────────

type Listener = ((ev: any) => void) | null;

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: Listener = null;
  onstop: Listener = null;

  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? 'audio/webm';
    FakeMediaRecorder.instances.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    const data = new Blob(['fake-audio-bytes'], { type: this.mimeType });
    this.ondataavailable?.({ data });
    this.onstop?.({});
  }
  static isTypeSupported(t: string) {
    return t === 'audio/webm';
  }
}

const stopTrack = vi.fn();
const fakeStream: any = { getTracks: () => [{ stop: stopTrack }] };
const getUserMediaMock = vi.fn().mockResolvedValue(fakeStream);

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  navigateMock.mockReset();
  uploadMock.mockReset().mockResolvedValue({ error: null });
  createSignedUrlMock.mockReset().mockResolvedValue({
    data: { signedUrl: 'https://signed.example/voice.webm' },
    error: null,
  });
  invokeMock.mockReset().mockResolvedValue({
    data: { co_id: 'co-123', co_number: 'CO-ABC-PN001' },
    error: null,
  });
  stopTrack.mockReset();
  getUserMediaMock.mockClear();
  FakeMediaRecorder.instances = [];

  useAuthMock.mockReturnValue({
    user: { id: 'user-abcdef0123' },
    userOrgRoles: [{ organization_id: 'org-1' }],
  });

  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: getUserMediaMock },
  });
  // jsdom does not implement these
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:fake') as any;
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn() as any;
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function startAndStopRecording() {
  fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
  await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
  // Advance a couple of timer ticks so the on-screen timer increments.
  await act(async () => {
    vi.advanceTimersByTime(3000);
  });
  fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VoicePNRecorder — end-to-end flow', () => {
  it('records, uploads to co-voice-notes, invokes co-voice-pn, and navigates to the draft', async () => {
    render(
      <VoicePNRecorder projectId="proj-1" open onOpenChange={() => {}} />,
    );

    await startAndStopRecording();

    // After stop → enters "recorded" phase with Send / Re-record buttons.
    const sendBtn = await screen.findByRole('button', { name: /send to gc/i });
    expect(screen.getByRole('button', { name: /re-record/i })).toBeInTheDocument();

    fireEvent.click(sendBtn);

    // Storage upload → org/project scoped path, webm extension.
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));
    const [path, blob, opts] = uploadMock.mock.calls[0];
    expect(path).toMatch(/^org-1\/proj-1\/\d+-user-abc\.webm$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(opts).toMatchObject({ contentType: 'audio/webm', upsert: false });

    // Edge function invoked with base64 audio + voice_url from signed URL.
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    const [fnName, { body }] = invokeMock.mock.calls[0];
    expect(fnName).toBe('co-voice-pn');
    expect(body.project_id).toBe('proj-1');
    expect(body.mime_type).toBe('audio/webm');
    expect(body.voice_url).toBe('https://signed.example/voice.webm');
    expect(typeof body.audio_base64).toBe('string');
    expect(body.audio_base64.length).toBeGreaterThan(0);
    expect(body.duration_sec).toBeGreaterThanOrEqual(3);

    // Navigation to the newly created draft CO.
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/project/proj-1/change-orders/co-123',
      ),
    );

    // The mic stream tracks were released.
    expect(stopTrack).toHaveBeenCalled();
  });

  it('continues without voice_url if storage upload fails, but still drafts the CO', async () => {
    uploadMock.mockResolvedValueOnce({ error: { message: 'storage down' } });

    render(
      <VoicePNRecorder projectId="proj-1" open onOpenChange={() => {}} />,
    );
    await startAndStopRecording();
    fireEvent.click(await screen.findByRole('button', { name: /send to gc/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    const [, { body }] = invokeMock.mock.calls[0];
    expect(body.voice_url).toBeNull();
    // No signed URL attempted on failed upload.
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('surfaces edge-function errors and returns to the recorded phase for retry', async () => {
    const { toast } = await import('sonner');
    invokeMock.mockResolvedValueOnce({
      data: { error: 'transcribe_failed' },
      error: null,
    });

    render(
      <VoicePNRecorder projectId="proj-1" open onOpenChange={() => {}} />,
    );
    await startAndStopRecording();
    fireEvent.click(await screen.findByRole('button', { name: /send to gc/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('transcribe_failed'),
      ),
    );
    expect(navigateMock).not.toHaveBeenCalled();
    // Send button is available again for retry.
    expect(
      await screen.findByRole('button', { name: /send to gc/i }),
    ).toBeInTheDocument();
  });

  it('resets state when Re-record is clicked', async () => {
    render(
      <VoicePNRecorder projectId="proj-1" open onOpenChange={() => {}} />,
    );
    await startAndStopRecording();

    fireEvent.click(await screen.findByRole('button', { name: /re-record/i }));

    // Back to idle → big mic button reappears, timer reset to 0:00.
    expect(
      await screen.findByRole('button', { name: /start recording/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('auto-stops at the 2-minute cap', async () => {
    render(
      <VoicePNRecorder projectId="proj-1" open onOpenChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));

    // Tick past the 120s cap.
    await act(async () => {
      vi.advanceTimersByTime(121_000);
    });

    expect(FakeMediaRecorder.instances[0].state).toBe('inactive');
    expect(
      await screen.findByRole('button', { name: /send to gc/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });
});
