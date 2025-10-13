
export interface ToolCategory {
  id: string;
  name: string;
  description?: string;
}

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

// Tool power source options
export enum ToolPowerSource {
  BATTERY = 'battery',
  CORDED = 'corded',
  GAS = 'gas',
  MANUAL = 'manual',
  PNEUMATIC = 'pneumatic',
  HYBRID = 'hybrid'
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

export const toolPowerSourceLabels: Record<ToolPowerSource, string> = {
  [ToolPowerSource.BATTERY]: 'Battery/Cordless',
  [ToolPowerSource.CORDED]: 'Corded/Electric',
  [ToolPowerSource.GAS]: 'Gas/Fuel',
  [ToolPowerSource.MANUAL]: 'Manual',
  [ToolPowerSource.PNEUMATIC]: 'Pneumatic/Air',
  [ToolPowerSource.HYBRID]: 'Hybrid'
};
