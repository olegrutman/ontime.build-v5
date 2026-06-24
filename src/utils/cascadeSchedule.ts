import { differenceInDays, addDays, format } from 'date-fns';

export interface CascadeItem {
  id: string;
  start_date: string;
  end_date: string | null;
  dependency_ids: string[];
  buffer_days?: number;
}

export interface CascadeResult {
  updates: Map<string, { start_date: string; end_date: string }>;
  conflicts: string[];
}

/**
 * Walk the dependency graph from a changed task and compute cascaded dates
 * for all downstream tasks. Each downstream task starts buffer_days after
 * its latest predecessor ends.
 */
export function cascadeFromTask(
  items: CascadeItem[],
  changedId: string,
  newStart: string,
  newEnd: string
): CascadeResult {
  const itemMap = new Map(items.map(i => [i.id, { ...i }]));
  // Apply the change
  const changed = itemMap.get(changedId);
  if (changed) {
    changed.start_date = newStart;
    changed.end_date = newEnd;
  }

  // Build reverse dependency map: parent → children
  const children = new Map<string, string[]>();
  for (const item of items) {
    for (const depId of item.dependency_ids) {
      if (!children.has(depId)) children.set(depId, []);
      children.get(depId)!.push(item.id);
    }
  }

  // BFS from changedId
  const updates = new Map<string, { start_date: string; end_date: string }>();
  const visited = new Set<string>();
  const queue = [changedId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    if (visited.has(parentId)) continue;
    visited.add(parentId);

    const kids = children.get(parentId) || [];
    for (const kidId of kids) {
      const kid = itemMap.get(kidId);
      if (!kid) continue;

      // Find latest end date among all of this kid's dependencies
      let latestEnd: Date | null = null;
      for (const depId of kid.dependency_ids) {
        const dep = itemMap.get(depId);
        if (!dep) continue;
        const depEnd = new Date(dep.end_date || dep.start_date);
        if (!latestEnd || depEnd > latestEnd) latestEnd = depEnd;
      }

      if (latestEnd) {
        const buffer = kid.buffer_days ?? 0;
        const kidNewStart = addDays(latestEnd, 1 + buffer);
        const kidDuration = kid.end_date
          ? differenceInDays(new Date(kid.end_date), new Date(kid.start_date))
          : 0;
        const kidNewEnd = addDays(kidNewStart, kidDuration);

        const oldStart = kid.start_date;
        kid.start_date = format(kidNewStart, 'yyyy-MM-dd');
        kid.end_date = format(kidNewEnd, 'yyyy-MM-dd');

        if (kid.start_date !== oldStart) {
          updates.set(kidId, { start_date: kid.start_date, end_date: kid.end_date });
          queue.push(kidId);
        }
      }
    }
  }

  return { updates, conflicts: [] };
}

/**
 * Find downstream tasks that would be affected by moving a given task.
 */
export function findDownstreamTasks(items: CascadeItem[], taskId: string): string[] {
  const children = new Map<string, string[]>();
  for (const item of items) {
    for (const depId of item.dependency_ids) {
      if (!children.has(depId)) children.set(depId, []);
      children.get(depId)!.push(item.id);
    }
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [taskId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const kids = children.get(id) || [];
    for (const kid of kids) {
      result.push(kid);
      queue.push(kid);
    }
  }
  return result;
}

/**
 * Find the critical path — the longest chain through the dependency graph.
 * Returns a set of item IDs on the critical path.
 */
export function findCriticalPath(items: CascadeItem[]): Set<string> {
  const itemMap = new Map(items.map(i => [i.id, i]));

  // Memoized longest path ending at each node
  const memo = new Map<string, { length: number; path: string[] }>();

  function longestPathTo(id: string): { length: number; path: string[] } {
    if (memo.has(id)) return memo.get(id)!;
    const item = itemMap.get(id);
    if (!item) return { length: 0, path: [] };

    const duration = item.end_date
      ? differenceInDays(new Date(item.end_date), new Date(item.start_date)) + 1
      : 1;

    if (item.dependency_ids.length === 0) {
      const result = { length: duration, path: [id] };
      memo.set(id, result);
      return result;
    }

    let best = { length: 0, path: [] as string[] };
    for (const depId of item.dependency_ids) {
      const sub = longestPathTo(depId);
      if (sub.length > best.length) best = sub;
    }

    const result = { length: best.length + duration, path: [...best.path, id] };
    memo.set(id, result);
    return result;
  }

  let globalBest = { length: 0, path: [] as string[] };
  for (const item of items) {
    const res = longestPathTo(item.id);
    if (res.length > globalBest.length) globalBest = res;
  }

  return new Set(globalBest.path);
}

/**
 * Detect schedule conflicts: tasks whose start date is before
 * the end date of any of their dependencies.
 */
export function detectConflicts(items: CascadeItem[]): Set<string> {
  const itemMap = new Map(items.map(i => [i.id, i]));
  const conflicts = new Set<string>();

  for (const item of items) {
    for (const depId of item.dependency_ids) {
      const dep = itemMap.get(depId);
      if (!dep) continue;
      const depEnd = new Date(dep.end_date || dep.start_date);
      const itemStart = new Date(item.start_date);
      if (itemStart <= depEnd) {
        conflicts.add(item.id);
      }
    }
  }

  return conflicts;
}
