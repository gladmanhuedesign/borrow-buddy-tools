
export interface ToolCategory {
  id: string;
  name: string;
  description?: string;
}

// Predefined tool categories
export const defaultToolCategories: ToolCategory[] = [
  { id: 'power-tools', name: 'Power Tools', description: 'Electric and battery-powered tools like drills, saws, etc.' },
  { id: 'hand-tools', name: 'Hand Tools', description: 'Manual tools like hammers, screwdrivers, wrenches, etc.' },
  { id: 'garden-tools', name: 'Garden & Outdoor', description: 'Tools for gardening, landscaping, and outdoor maintenance' },
  { id: 'automotive', name: 'Automotive', description: 'Tools for vehicle maintenance and repair' },
  { id: 'kitchen', name: 'Kitchen Appliances', description: 'Specialized kitchen tools and appliances' },
  { id: 'electronics', name: 'Electronics', description: 'Electronic testing equipment and tools' },
  { id: 'painting', name: 'Painting & Decorating', description: 'Tools for painting, decorating, and home improvement' },
  { id: 'cleaning', name: 'Cleaning Equipment', description: 'Specialized cleaning tools and machinery' },
  { id: 'other', name: 'Other', description: 'Other types of tools and equipment' }
];

// Tool condition options
export enum ToolCondition {
  NEW = 'new',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  WORN = 'worn'
}

// Tool status options
export enum ToolStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  UNAVAILABLE = 'unavailable',
  DAMAGED = 'damaged'
}

export const toolConditionLabels: Record<ToolCondition, string> = {
  [ToolCondition.NEW]: 'New',
  [ToolCondition.EXCELLENT]: 'Excellent',
  [ToolCondition.GOOD]: 'Good',
  [ToolCondition.FAIR]: 'Fair',
  [ToolCondition.WORN]: 'Worn'
};

export const toolStatusLabels: Record<ToolStatus, string> = {
  [ToolStatus.AVAILABLE]: 'Available',
  [ToolStatus.IN_USE]: 'In Use',
  [ToolStatus.UNAVAILABLE]: 'Unavailable',
  [ToolStatus.DAMAGED]: 'Damaged'
};
