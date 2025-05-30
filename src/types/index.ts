
// User related types
export interface User {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

// Group related types
export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  isPrivate: boolean;
  memberCount: number;
  imageUrl?: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt?: string;
}

// Tool related types
export interface Tool {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  condition: string;
  status: string;
  ownerId: string;
  groupId: string;
  instructions?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Request related types
export interface ToolRequest {
  id: string;
  toolId: string;
  borrowerId: string;
  status: 'pending' | 'approved' | 'denied' | 'picked_up' | 'return_pending' | 'returned' | 'canceled' | 'overdue';
  requestedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  pickupAt?: string;
  returnAt?: string;
  notes?: string;
  picked_up_at?: string;
  returned_at?: string;
  return_notes?: string;
}

// Tool History related types
export interface ToolHistory {
  id: string;
  toolId: string;
  requestId: string;
  borrowerId: string;
  ownerId: string;
  actionType: 'pending' | 'approved' | 'denied' | 'picked_up' | 'return_pending' | 'returned' | 'canceled' | 'overdue';
  actionBy: string;
  startDate?: string;
  endDate?: string;
  actualPickupDate?: string;
  actualReturnDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachment?: string;
}
