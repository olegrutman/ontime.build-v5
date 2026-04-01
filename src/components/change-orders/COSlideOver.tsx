import { useIsMobile } from '@/hooks/use-mobile';
import { CODetailLayout } from './CODetailLayout';

interface COSlideOverProps {
  coId: string;
  projectId: string;
  onClose: () => void;
}

export function COSlideOver({ coId, projectId, onClose }: COSlideOverProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Overlay — desktop only */}
      {!isMobile && (
        <div className="fixed inset-0 z-40 bg-[rgba(7,14,29,0.45)] backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[780px] bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        <CODetailLayout
          coId={coId}
          projectId={projectId}
          onClose={onClose}
          isSlideOver
        />
      </div>
    </>
  );
}
