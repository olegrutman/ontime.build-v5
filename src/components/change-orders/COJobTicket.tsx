import { useParams } from 'react-router-dom';
import { CODetailLayout } from './CODetailLayout';

export function COJobTicket() {
  const { id: projectId, coId } = useParams<{ id: string; coId: string }>();

  if (!projectId || !coId) return null;

  return <CODetailLayout coId={coId} projectId={projectId} />;
}
