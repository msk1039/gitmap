import React from 'react';
import { HardDrive, Sparkles } from 'lucide-react';
import { GitRepository } from '../types/repository';
import { formatFileSize, formatSize } from '../lib/formatSize';

interface WorkspaceStatsProps {
  repositories: GitRepository[];
}

export const WorkspaceStats: React.FC<WorkspaceStatsProps> = ({ repositories }) => {
  const totalProjectSizeMb = repositories.reduce((total, repository) => total + repository.size_mb, 0);
  const totalCleanableBytes = repositories.reduce(
    (total, repository) => total + (repository.cleanable_info?.total_size_bytes ?? 0),
    0,
  );
  const cleanableItemCount = repositories.reduce(
    (total, repository) => total + (repository.cleanable_info?.item_count ?? 0),
    0,
  );
  const cleanableShare = totalProjectSizeMb > 0
    ? Math.min(100, (totalCleanableBytes / (totalProjectSizeMb * 1024 * 1024)) * 100)
    : 0;

  return (
    <section className="workspace-stats mt-4 flex w-full flex-col border-y bg-[#f7faf6] p-4 dark:bg-[#1b2518] inset-shadow-sm inset-shadow-lime-600/50 dark:inset-shadow-lime-400/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Workspace</h2>
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">Storage at a glance</p>
        </div>
        <div className="rounded-md bg-sky-100 p-1.5 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
          <HardDrive className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-md border bg-background/80 p-2.5 text-foreground">
          <div className="text-[11px] font-medium text-muted-foreground">Total size</div>
          <div className="mt-1 text-base font-semibold tracking-tight">{formatSize(totalProjectSizeMb)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{repositories.length} repos indexed</div>
        </div>

        <div className="rounded-md border border-emerald-200/80 bg-emerald-50/70 p-2.5 dark:border-emerald-900/80 dark:bg-emerald-950/40">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Cleanable space
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
            {formatFileSize(totalCleanableBytes)}
          </div>
          <div className="mt-0.5 text-[11px] leading-tight text-emerald-700 dark:text-emerald-300">
            {cleanableItemCount} generated item{cleanableItemCount === 1 ? '' : 's'} ready to review
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
            <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-[width]" style={{ width: `${cleanableShare}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
};
