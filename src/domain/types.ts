export type MemberId = string;
export type GroupId = string;
export type ExpenseId = string;
export type SettlementId = string;

export type SplitMode = 'equal' | 'manual';
export type SettlementStatus = 'simulated' | 'confirmed';

export interface Member {
  id: MemberId;
  name: string;
  username: string;
  avatar: string;
}

export interface Group {
  id: GroupId;
  title: string;
  subtitle: string;
  currency: 'USD';
  imageName: 'finance-trip.png' | 'finance-balance.png' | 'finance-cover.png';
  memberIds: MemberId[];
  color: string;
}

export interface Expense {
  id: ExpenseId;
  groupId: GroupId;
  title: string;
  category: string;
  amountCents: number;
  paidBy: MemberId;
  splitMode: SplitMode;
  splitParticipants: MemberId[];
  manualSplits?: Record<MemberId, number>;
  paidAt: string;
  note?: string;
}

export interface Settlement {
  id: SettlementId;
  groupId: GroupId;
  fromId: MemberId;
  toId: MemberId;
  amountCents: number;
  status: SettlementStatus;
  createdAt: string;
}

export interface FinanceState {
  currentUserId: MemberId;
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
}

export interface MemberBalance {
  memberId: MemberId;
  paidCents: number;
  owedCents: number;
  settlementPaidCents: number;
  settlementReceivedCents: number;
  netCents: number;
}

export interface SettlementSuggestion {
  fromId: MemberId;
  toId: MemberId;
  amountCents: number;
}
