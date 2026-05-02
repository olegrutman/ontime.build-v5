import { useParams, Navigate } from 'react-router-dom';
import { PickerShell } from '@/components/change-orders/picker-v3/PickerShell';

export default function COPickerV3Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/dashboard" replace />;
  return <PickerShell projectId={id} />;
}
