import type {
  Expense,
  FinanceState,
  GroupId,
  MemberBalance,
  MemberId,
  SettlementSuggestion,
} from './types';

export function calculateSplits(expense: Expense): Record<MemberId, number> {
  if (expense.splitMode === 'manual') {
    return { ...(expense.manualSplits ?? {}) };
  }

  const participants = expense.splitParticipants;
  if (participants.length === 0) {
    return {};
  }

  const base = Math.floor(expense.amountCents / participants.length);
  const remainder = expense.amountCents % participants.length;

  return participants.reduce<Record<MemberId, number>>((splits, memberId, index) => {
    splits[memberId] = base + (index < remainder ? 1 : 0);
    return splits;
  }, {});
}

export function sumSplits(splits: Record<MemberId, number>): number {
  return Object.values(splits).reduce((sum, amount) => sum + amount, 0);
}

export function calculateGroupBalances(state: FinanceState, groupId: GroupId): MemberBalance[] {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return [];
  }

  const balances = new Map<MemberId, MemberBalance>();

  group.memberIds.forEach((memberId) => {
    balances.set(memberId, {
      memberId,
      paidCents: 0,
      owedCents: 0,
      settlementPaidCents: 0,
      settlementReceivedCents: 0,
      netCents: 0,
    });
  });

  state.expenses
    .filter((expense) => expense.groupId === groupId)
    .forEach((expense) => {
      const payer = balances.get(expense.paidBy);
      if (payer) {
        payer.paidCents += expense.amountCents;
      }

      Object.entries(calculateSplits(expense)).forEach(([memberId, owedCents]) => {
        const balance = balances.get(memberId);
        if (balance) {
          balance.owedCents += owedCents;
        }
      });
    });

  state.settlements
    .filter((settlement) => settlement.groupId === groupId && settlement.status === 'confirmed')
    .forEach((settlement) => {
      const from = balances.get(settlement.fromId);
      const to = balances.get(settlement.toId);
      if (from) {
        from.settlementPaidCents += settlement.amountCents;
      }
      if (to) {
        to.settlementReceivedCents += settlement.amountCents;
      }
    });

  return [...balances.values()].map((balance) => ({
    ...balance,
    netCents:
      balance.paidCents -
      balance.owedCents +
      balance.settlementPaidCents -
      balance.settlementReceivedCents,
  }));
}

export function calculateAllGroupsNetForMember(state: FinanceState, memberId: MemberId): number {
  return state.groups.reduce((total, group) => {
    const balance = calculateGroupBalances(state, group.id).find((item) => item.memberId === memberId);
    return total + (balance?.netCents ?? 0);
  }, 0);
}

export function suggestSettlements(balances: MemberBalance[]): SettlementSuggestion[] {
  const debtors = balances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ memberId: balance.memberId, amountCents: -balance.netCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const creditors = balances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ memberId: balance.memberId, amountCents: balance.netCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.amountCents, creditor.amountCents);

    if (amountCents > 0) {
      suggestions.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amountCents,
      });
    }

    debtor.amountCents -= amountCents;
    creditor.amountCents -= amountCents;

    if (debtor.amountCents === 0) {
      debtorIndex += 1;
    }
    if (creditor.amountCents === 0) {
      creditorIndex += 1;
    }
  }

  return suggestions;
}

export function groupExpenseTotal(state: FinanceState, groupId: GroupId): number {
  return state.expenses
    .filter((expense) => expense.groupId === groupId)
    .reduce((total, expense) => total + expense.amountCents, 0);
}
