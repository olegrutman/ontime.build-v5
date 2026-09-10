import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import sashaAvatar from '@/assets/sasha-avatar.png';
import idleAsset from '@/assets/sasha-idle.mp4.asset.json';
import talkingAsset from '@/assets/sasha-talking.mp4.asset.json';

interface SashaAvatarStageProps {
  /** Sasha is speaking — play the talking clip. */
  speaking: boolean;
  /** The user is talking — show a listening ring. */
  listening?: boolean;
  /** Waiting on a reply or on voice. */
  thinking?: boolean;
  className?: string;
}

/**
 * Video avatar for Sasha. Loops a calm idle clip and switches to a talking
 * clip while her voice plays, so she reads as an animated presenter.
 */
export function SashaAvatarStage({
  speaking,
  listening = false,
  thinking = false,
  className,
}: SashaAvatarStageProps) {
  const idleRef = useRef<HTMLVideoElement>(null);
  const talkRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const idle = idleRef.current;
    const talk = talkRef.current;
    if (!idle || !talk) return;
    if (speaking) {
      idle.pause();
      talk.currentTime = 0;
      void talk.play().catch(() => {});
    } else {
      talk.pause();
      void idle.play().catch(() => {});
    }
  }, [speaking]);

  const status = speaking ? 'Speaking' : listening ? 'Listening…' : thinking ? 'Thinking…' : 'Ready';

  return (
    <div className={cn('relative flex flex-col items-center gap-2 py-3', className)}>
      <div
        className={cn(
          'relative h-28 w-28 overflow-hidden rounded-full ring-2 transition-all duration-300',
          speaking
            ? 'ring-primary shadow-lg shadow-primary/30 scale-105'
            : listening
              ? 'ring-destructive/70 shadow-lg shadow-destructive/20 animate-pulse'
              : 'ring-border',
        )}
      >
        <video
          ref={idleRef}
          src={idleAsset.url}
          poster={sashaAvatar}
          muted
          loop
          playsInline
          preload="auto"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            speaking ? 'opacity-0' : 'opacity-100',
          )}
        />
        <video
          ref={talkRef}
          src={talkingAsset.url}
          poster={sashaAvatar}
          muted
          loop
          playsInline
          preload="auto"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            speaking ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
