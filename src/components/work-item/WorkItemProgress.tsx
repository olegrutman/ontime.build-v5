import { StateProgressBar } from '@/components/StateProgressBar';
import { WorkItemState } from './WorkItemPage';

interface WorkItemProgressProps {
  state: WorkItemState;
}

export function WorkItemProgress({ state }: WorkItemProgressProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Progress</h3>
      <StateProgressBar currentState={state} readonly />
    </div>
  );
}
