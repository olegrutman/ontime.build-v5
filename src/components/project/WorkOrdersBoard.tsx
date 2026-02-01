import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Copy } from 'lucide-react';
import { BoardColumn, BoardColumnEmpty, BoardItem } from '@/components/board';
import { ChangeOrderStatus, CHANGE_ORDER_STATUS_LABELS } from '@/types/changeOrderProject';
import { CHANGE_ORDER_STATUS_OPTIONS } from '@/components/ui/status-column';
import { HoverAction } from '@/components/ui/hover-actions';

interface ChangeOrder {
  id: string;
  title: string;
  description?: string | null;
  status: ChangeOrderStatus;
  work_type?: string | null;
  requires_materials?: boolean | null;
  requires_equipment?: boolean | null;
  created_at: string;
}

interface WorkOrdersBoardProps {
  changeOrders: ChangeOrder[];
  onStatusChange?: (id: string, newStatus: ChangeOrderStatus) => void;
}

const STATUS_ORDER: ChangeOrderStatus[] = [
  'draft',
  'fc_input',
  'tc_pricing',
  'ready_for_approval',
  'approved',
  'contracted',
];

export function WorkOrdersBoard({ changeOrders, onStatusChange }: WorkOrdersBoardProps) {
  const navigate = useNavigate();

  const ordersByStatus = React.useMemo(() => {
    const grouped: Record<ChangeOrderStatus, ChangeOrder[]> = {
      draft: [],
      fc_input: [],
      tc_pricing: [],
      ready_for_approval: [],
      approved: [],
      rejected: [],
      contracted: [],
    };

    changeOrders.forEach((order) => {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    });

    return grouped;
  }, [changeOrders]);

  const getStatusColor = (status: ChangeOrderStatus): string => {
    const option = CHANGE_ORDER_STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.color || '#C4C4C4';
  };

  const getItemTags = (order: ChangeOrder) => {
    const tags: { label: string; color: string }[] = [];
    
    if (order.work_type) {
      tags.push({
        label: order.work_type.replace('_', ' '),
        color: '#0086C0',
      });
    }
    if (order.requires_materials) {
      tags.push({ label: 'Materials', color: '#FDAB3D' });
    }
    if (order.requires_equipment) {
      tags.push({ label: 'Equipment', color: '#A25DDC' });
    }
    
    return tags;
  };

  const getItemActions = (order: ChangeOrder): HoverAction[] => [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View Details',
      onClick: () => navigate(`/change-order/${order.id}`),
    },
    {
      icon: <Edit className="h-4 w-4" />,
      label: 'Edit',
      onClick: () => navigate(`/change-order/${order.id}`),
    },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const orders = ordersByStatus[status];
        const color = getStatusColor(status);

        return (
          <BoardColumn
            key={status}
            title={CHANGE_ORDER_STATUS_LABELS[status]}
            color={color}
            count={orders.length}
          >
            {orders.length === 0 ? (
              <BoardColumnEmpty message="No work orders" />
            ) : (
              orders.map((order) => (
                <BoardItem
                  key={order.id}
                  id={order.id}
                  title={order.title}
                  subtitle={order.description || undefined}
                  tags={getItemTags(order)}
                  onClick={() => navigate(`/change-order/${order.id}`)}
                  actions={getItemActions(order)}
                  menuActions={[
                    {
                      label: 'View Details',
                      onClick: () => navigate(`/change-order/${order.id}`),
                    },
                    {
                      label: 'Duplicate',
                      onClick: () => console.log('Duplicate', order.id),
                    },
                  ]}
                />
              ))
            )}
          </BoardColumn>
        );
      })}
    </div>
  );
}
