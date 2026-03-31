import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Project } from './mockData';

interface ProjectCardProps {
  project: Project;
  index: number;
  onViewProject: (id: string) => void;
}

function formatK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

export function ProjectCard({ project, index, onViewProject }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      mounted.current = true;
      setBarWidth(project.percentComplete);
    }, 200 + index * 60);
    return () => clearTimeout(t);
  }, [project.percentComplete, index]);

  return (
    <div
      className="bg-[#0D1F3C] rounded-lg overflow-hidden opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
      style={{ animationDelay: `${200 + index * 50}ms` }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {project.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 shrink-0">
              {project.phase}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white/50 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatK(project.contractValue)}
            </span>
            <span className="text-white/30 text-xs">{project.percentComplete}%</span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/30 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 mx-3.5">
        <div
          className="h-full rounded-full transition-all duration-[1200ms] ease-out"
          style={{ width: `${barWidth}%`, background: project.color }}
        />
      </div>

      {/* Expanded content */}
      <div
        className="overflow-hidden transition-all duration-[380ms]"
        style={{
          maxHeight: expanded ? '260px' : '0',
          transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div className="p-3.5 pt-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Contract', value: formatK(project.contractValue) },
              { label: 'Paid', value: formatK(project.paid) },
              { label: 'Pending', value: formatK(project.pending) },
              { label: 'Status', value: project.status },
            ].map((tile, i) => (
              <div key={i} className="bg-white/5 rounded px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-white/30">{tile.label}</p>
                <p className="text-white text-sm font-medium mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onViewProject(project.id)}
              className="flex-1 py-2 rounded-md bg-[#F5A623] text-[#0D1F3C] text-xs font-semibold hover:bg-[#F5A623]/90 transition-colors"
            >
              View Project
            </button>
            <button className="flex-1 py-2 rounded-md bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors">
              Orders
            </button>
            <button className="flex-1 py-2 rounded-md bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors">
              Budget
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
