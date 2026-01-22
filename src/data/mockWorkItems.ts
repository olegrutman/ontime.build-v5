import { WorkItem } from '@/types/workItem';

export const mockWorkItems: WorkItem[] = [
  {
    id: '1',
    parent_work_item_id: null,
    type: 'PROJECT',
    state: 'EXECUTED',
    title: 'Downtown Office Tower',
    description: 'Mixed-use commercial development with 42 floors',
    code: 'PRJ-001',
    amount: 45000000,
    location: {
      structure: 'Tower A',
    },
    participants: [
      { id: 'p1', name: 'Metro Construction', organization: 'Metro Construction LLC', role: 'contractor' },
      { id: 'p2', name: 'Urban Developers', organization: 'Urban Dev Corp', role: 'owner' },
    ],
    created_at: '2024-01-15',
    updated_at: '2024-12-20',
  },
  {
    id: '2',
    parent_work_item_id: '1',
    type: 'SOV_ITEM',
    state: 'EXECUTED',
    title: 'Foundation & Excavation',
    description: 'Deep foundation system with caissons',
    code: 'SOV-001',
    amount: 3200000,
    location: {
      structure: 'Tower A',
      floor: 'Foundation',
      area: 'Full Site',
    },
    participants: [
      { id: 'p3', name: 'DeepDig Inc', organization: 'DeepDig Excavation', role: 'subcontractor' },
    ],
    created_at: '2024-01-20',
    updated_at: '2024-06-15',
  },
  {
    id: '3',
    parent_work_item_id: '1',
    type: 'SOV_ITEM',
    state: 'APPROVED',
    title: 'Structural Steel',
    description: 'Primary steel frame and connections',
    code: 'SOV-002',
    amount: 8500000,
    location: {
      structure: 'Tower A',
      floor: 'Floors 1-42',
    },
    participants: [
      { id: 'p4', name: 'SteelWorks Pro', organization: 'SteelWorks Industries', role: 'subcontractor' },
    ],
    created_at: '2024-02-01',
    updated_at: '2024-11-10',
  },
  {
    id: '4',
    parent_work_item_id: '1',
    type: 'SOV_ITEM',
    state: 'PRICED',
    title: 'MEP Systems',
    description: 'Mechanical, electrical, and plumbing rough-in',
    code: 'SOV-003',
    amount: 12400000,
    location: {
      structure: 'Tower A',
      floor: 'All Floors',
    },
    participants: [
      { id: 'p5', name: 'TechMEP Solutions', organization: 'TechMEP Corp', role: 'subcontractor' },
    ],
    created_at: '2024-03-15',
    updated_at: '2024-12-01',
  },
  {
    id: '5',
    parent_work_item_id: '1',
    type: 'CHANGE_WORK',
    state: 'APPROVED',
    title: 'Additional Elevator Shaft',
    description: 'Owner-requested 5th elevator for express service',
    code: 'CO-001',
    amount: 2100000,
    location: {
      structure: 'Tower A',
      floor: 'Core',
      area: 'East Side',
    },
    participants: [
      { id: 'p1', name: 'Metro Construction', organization: 'Metro Construction LLC', role: 'contractor' },
      { id: 'p6', name: 'ElevatorPro', organization: 'ElevatorPro Systems', role: 'subcontractor' },
    ],
    created_at: '2024-08-20',
    updated_at: '2024-12-15',
  },
  {
    id: '6',
    parent_work_item_id: '5',
    type: 'SOV_ITEM',
    state: 'APPROVED',
    title: 'Shaft Construction',
    description: 'Concrete shaft and structural modifications',
    code: 'CO-001-A',
    amount: 850000,
    location: {
      structure: 'Tower A',
      floor: 'Core',
      area: 'East Side',
    },
    participants: [],
    created_at: '2024-08-22',
    updated_at: '2024-12-10',
  },
  {
    id: '7',
    parent_work_item_id: '5',
    type: 'SOV_ITEM',
    state: 'PRICED',
    title: 'Elevator Equipment',
    description: 'High-speed elevator cab and machinery',
    code: 'CO-001-B',
    amount: 1250000,
    location: {
      structure: 'Tower A',
      floor: 'Core',
    },
    participants: [],
    created_at: '2024-08-22',
    updated_at: '2024-12-12',
  },
  {
    id: '8',
    parent_work_item_id: '1',
    type: 'TM_WORK',
    state: 'OPEN',
    title: 'Weather Damage Repairs',
    description: 'Storm damage to temporary enclosures - ongoing',
    code: 'TM-001',
    amount: 45000,
    location: {
      structure: 'Tower A',
      floor: 'Floors 35-38',
      area: 'West Facade',
    },
    participants: [
      { id: 'p1', name: 'Metro Construction', organization: 'Metro Construction LLC', role: 'contractor' },
    ],
    created_at: '2024-12-18',
    updated_at: '2024-12-20',
  },
  {
    id: '9',
    parent_work_item_id: '1',
    type: 'SOV_ITEM',
    state: 'OPEN',
    title: 'Interior Finishes',
    description: 'Drywall, paint, flooring, and ceiling systems',
    code: 'SOV-004',
    amount: 9800000,
    location: {
      structure: 'Tower A',
      floor: 'Floors 1-42',
    },
    participants: [
      { id: 'p7', name: 'FinishLine Interiors', organization: 'FinishLine Corp', role: 'subcontractor' },
    ],
    created_at: '2024-04-01',
    updated_at: '2024-12-19',
  },
  {
    id: '10',
    parent_work_item_id: '1',
    type: 'CHANGE_WORK',
    state: 'OPEN',
    title: 'Rooftop Terrace Addition',
    description: 'Architect-designed amenity terrace with landscaping',
    code: 'CO-002',
    amount: undefined,
    location: {
      structure: 'Tower A',
      floor: 'Roof',
      area: 'Full Rooftop',
    },
    participants: [
      { id: 'p8', name: 'SkyScape Design', organization: 'SkyScape Architects', role: 'architect' },
    ],
    created_at: '2024-12-15',
    updated_at: '2024-12-20',
  },
];

export function getWorkItemById(id: string): WorkItem | undefined {
  return mockWorkItems.find(item => item.id === id);
}

export function getChildWorkItems(parentId: string): WorkItem[] {
  return mockWorkItems.filter(item => item.parent_work_item_id === parentId);
}

export function getRootWorkItems(): WorkItem[] {
  return mockWorkItems.filter(item => item.parent_work_item_id === null);
}

export function buildWorkItemTree(items: WorkItem[]): WorkItem[] {
  const itemMap = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];

  // Create a map and initialize children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Build the tree
  itemMap.forEach(item => {
    if (item.parent_work_item_id === null) {
      roots.push(item);
    } else {
      const parent = itemMap.get(item.parent_work_item_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      }
    }
  });

  return roots;
}
