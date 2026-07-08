import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  History,
  Home,
  Plus,
  ReceiptText,
  RotateCcw,
  Scale,
  Search,
  Send,
} from 'lucide-react';
import { categories } from './domain/demoData';
import {
  calculateAllGroupsNetForMember,
  calculateGroupBalances,
  calculateSplits,
  groupExpenseTotal,
  suggestSettlements,
} from './domain/calculations';
import { formatCents, parseCentsInput } from './domain/money';
import { loadFinanceState, resetFinanceState, saveFinanceState } from './domain/storage';
import type {
  Expense,
  FinanceState,
  Group,
  GroupId,
  Member,
  MemberBalance,
  MemberId,
  SettlementSuggestion,
  SplitMode,
} from './domain/types';

type Screen = 'groups' | 'group' | 'add' | 'balances' | 'history';

interface AddExpenseDraft {
  title: string;
  amountInput: string;
  paidBy: MemberId;
  category: string;
  splitMode: SplitMode;
  participantIds: MemberId[];
  manualSplits: Record<MemberId, string>;
}

const todayIso = () => new Date().toISOString();

function applyTelegramTheme(): void {
  const webApp = window.Telegram?.WebApp;
  webApp?.ready?.();
  webApp?.expand?.();

  const theme = webApp?.themeParams;
  if (!theme) {
    return;
  }

  const root = document.documentElement;
  if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
  if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
  if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
  if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
  if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getMember(memberMap: Map<MemberId, Member>, memberId: MemberId): Member {
  const member = memberMap.get(memberId);
  if (!member) {
    throw new Error(`Unknown member: ${memberId}`);
  }
  return member;
}

function AppNav({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const items: Array<{ screen: Screen; label: string; icon: typeof Home }> = [
    { screen: 'groups', label: 'Groups', icon: Home },
    { screen: 'group', label: 'Group', icon: ReceiptText },
    { screen: 'balances', label: 'Balance', icon: Scale },
    { screen: 'history', label: 'History', icon: History },
  ];

  return (
    <nav className="app-nav" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={screen === item.screen ? 'nav-item nav-item-active' : 'nav-item'}
            type="button"
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function FeatureImage({ group }: { group: Group }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
  return (
    <div className="asset-fallback" style={{ '--accent': group.color } as CSSProperties}>
        <div className="fallback-receipt" />
        <div className="fallback-chart">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <img
      className="group-image"
      src={`/assets/${group.imageName}`}
      alt=""
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function AvatarRow({ members }: { members: Member[] }) {
  return (
    <div className="avatar-row" aria-label="Group members">
      {members.map((member) => (
        <span className="avatar" title={member.name} key={member.id}>
          {member.avatar}
        </span>
      ))}
    </div>
  );
}

function AmountBadge({ value }: { value: number }) {
  const className = value > 0 ? 'amount-positive' : value < 0 ? 'amount-negative' : 'amount-zero';
  const label = value > 0 ? 'owed to you' : value < 0 ? 'you owe' : 'settled';

  return (
    <span className={`amount-badge ${className}`}>
      {formatCents(value)}
      <small>{label}</small>
    </span>
  );
}

function GroupsScreen({
  state,
  memberMap,
  onOpenGroup,
  onReset,
}: {
  state: FinanceState;
  memberMap: Map<MemberId, Member>;
  onOpenGroup: (groupId: GroupId) => void;
  onReset: () => void;
}) {
  const currentUser = getMember(memberMap, state.currentUserId);
  const totalNet = calculateAllGroupsNetForMember(state, state.currentUserId);

  return (
    <main className="screen stack">
      <header className="topbar">
        <div>
          <p className="caption">Telegram Mini App demo</p>
          <h1>Finance Splitter</h1>
        </div>
        <button className="icon-button" type="button" onClick={onReset} aria-label="Reset demo data">
          <RotateCcw size={18} />
        </button>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <span className="mini-avatar">{currentUser.avatar}</span>
          <div>
            <p className="caption">Signed in as {currentUser.username}</p>
            <h2>{totalNet >= 0 ? 'You are owed' : 'You owe'}</h2>
          </div>
        </div>
        <strong>{formatCents(totalNet)}</strong>
      </section>

      <section className="section-head">
        <div>
          <p className="caption">My groups</p>
          <h2>Active splits</h2>
        </div>
        <span>{state.groups.length} groups</span>
      </section>

      <div className="group-list">
        {state.groups.map((group) => {
          const balances = calculateGroupBalances(state, group.id);
          const myBalance = balances.find((balance) => balance.memberId === state.currentUserId);
          const members = group.memberIds.map((memberId) => getMember(memberMap, memberId));

          return (
            <button className="group-card" type="button" onClick={() => onOpenGroup(group.id)} key={group.id}>
              <FeatureImage group={group} />
              <div className="group-card-body">
                <div>
                  <p className="caption">{group.subtitle}</p>
                  <h3>{group.title}</h3>
                </div>
                <AvatarRow members={members} />
                <div className="card-footer">
                  <span>Total {formatCents(groupExpenseTotal(state, group.id))}</span>
                  <AmountBadge value={myBalance?.netCents ?? 0} />
                </div>
              </div>
              <ArrowRight className="card-arrow" size={18} />
            </button>
          );
        })}
      </div>
    </main>
  );
}

function GroupScreen({
  state,
  group,
  memberMap,
  onNavigate,
}: {
  state: FinanceState;
  group: Group;
  memberMap: Map<MemberId, Member>;
  onNavigate: (screen: Screen) => void;
}) {
  const balances = calculateGroupBalances(state, group.id);
  const suggestions = suggestSettlements(balances);
  const expenses = state.expenses
    .filter((expense) => expense.groupId === group.id)
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));
  const myBalance = balances.find((balance) => balance.memberId === state.currentUserId);
  const members = group.memberIds.map((memberId) => getMember(memberMap, memberId));

  return (
    <main className="screen stack">
      <header className="detail-header">
        <FeatureImage group={group} />
        <div className="detail-overlay">
          <p className="caption">{group.subtitle}</p>
          <h1>{group.title}</h1>
          <AvatarRow members={members} />
        </div>
      </header>

      <section className="quick-grid">
        <div className="metric">
          <span>Total spent</span>
          <strong>{formatCents(groupExpenseTotal(state, group.id))}</strong>
        </div>
        <div className="metric">
          <span>Your net</span>
          <strong>{formatCents(myBalance?.netCents ?? 0)}</strong>
        </div>
      </section>

      <div className="action-grid">
        <button className="primary-action" type="button" onClick={() => onNavigate('add')}>
          <Plus size={18} />
          Add expense
        </button>
        <button className="secondary-action" type="button" onClick={() => onNavigate('balances')}>
          <Send size={18} />
          Settle up
        </button>
      </div>

      <section className="section-head">
        <div>
          <p className="caption">Last activity</p>
          <h2>Expenses</h2>
        </div>
        <button className="text-button" type="button" onClick={() => onNavigate('history')}>
          See all
        </button>
      </section>

      <ExpenseList expenses={expenses.slice(0, 5)} memberMap={memberMap} />

      <section className="settle-strip">
        <Scale size={20} />
        <div>
          <strong>{suggestions.length === 0 ? 'All settled' : `${suggestions.length} transfers suggested`}</strong>
          <p>Balances are calculated from paid - owed, with confirmed settlements applied.</p>
        </div>
      </section>
    </main>
  );
}

function ExpenseList({ expenses, memberMap }: { expenses: Expense[]; memberMap: Map<MemberId, Member> }) {
  if (expenses.length === 0) {
    return <p className="empty-state">No expenses match this filter.</p>;
  }

  return (
    <div className="expense-list">
      {expenses.map((expense) => {
        const payer = getMember(memberMap, expense.paidBy);
        return (
          <article className="expense-row" key={expense.id}>
            <span className="expense-icon">
              <ReceiptText size={18} />
            </span>
            <div>
              <strong>{expense.title}</strong>
              <p>
                {expense.category} · paid by {payer.name} · {new Date(expense.paidAt).toLocaleDateString('en-US')}
              </p>
            </div>
            <b>{formatCents(expense.amountCents)}</b>
          </article>
        );
      })}
    </div>
  );
}

function AddExpenseScreen({
  group,
  memberMap,
  onBack,
  onCreate,
}: {
  group: Group;
  memberMap: Map<MemberId, Member>;
  onBack: () => void;
  onCreate: (expense: Expense) => void;
}) {
  const [draft, setDraft] = useState<AddExpenseDraft>(() => {
    const firstMember = group.memberIds[0];
    return {
      title: 'New shared expense',
      amountInput: '4500',
      paidBy: firstMember,
      category: 'Food',
      splitMode: 'equal',
      participantIds: [...group.memberIds],
      manualSplits: Object.fromEntries(group.memberIds.map((memberId) => [memberId, '0'])),
    };
  });

  const amountCents = parseCentsInput(draft.amountInput);
  const participants = draft.participantIds;
  const manualTotal = participants.reduce((sum, memberId) => {
    const parsed = parseCentsInput(draft.manualSplits[memberId] ?? '0');
    return sum + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
  const isManualValid = draft.splitMode === 'equal' || manualTotal === amountCents;
  const canSubmit =
    draft.title.trim().length > 1 &&
    Number.isInteger(amountCents) &&
    amountCents > 0 &&
    participants.length > 0 &&
    isManualValid;

  function updateDraft(next: Partial<AddExpenseDraft>): void {
    setDraft((current) => ({ ...current, ...next }));
  }

  function toggleParticipant(memberId: MemberId): void {
    setDraft((current) => {
      const exists = current.participantIds.includes(memberId);
      const participantIds = exists
        ? current.participantIds.filter((item) => item !== memberId)
        : [...current.participantIds, memberId];
      return { ...current, participantIds };
    });
  }

  function updateManualSplit(memberId: MemberId, value: string): void {
    setDraft((current) => ({
      ...current,
      manualSplits: {
        ...current.manualSplits,
        [memberId]: value,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const expense: Expense = {
      id: createId('expense'),
      groupId: group.id,
      title: draft.title.trim(),
      category: draft.category,
      amountCents,
      paidBy: draft.paidBy,
      splitMode: draft.splitMode,
      splitParticipants: [...participants],
      manualSplits:
        draft.splitMode === 'manual'
          ? Object.fromEntries(participants.map((memberId) => [memberId, parseCentsInput(draft.manualSplits[memberId])]))
          : undefined,
      paidAt: todayIso(),
    };

    onCreate(expense);
  }

  const previewExpense: Expense | undefined =
    Number.isInteger(amountCents) && amountCents > 0 && participants.length > 0
      ? {
          id: 'preview',
          groupId: group.id,
          title: draft.title,
          category: draft.category,
          amountCents,
          paidBy: draft.paidBy,
          splitMode: draft.splitMode,
          splitParticipants: participants,
          manualSplits:
            draft.splitMode === 'manual'
              ? Object.fromEntries(participants.map((memberId) => [memberId, parseCentsInput(draft.manualSplits[memberId]) || 0]))
              : undefined,
          paidAt: todayIso(),
        }
      : undefined;

  return (
    <main className="screen stack">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to group
      </button>

      <header className="screen-title">
        <p className="caption">{group.title}</p>
        <h1>Add expense</h1>
      </header>

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
        </label>

        <label>
          Amount in cents
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.amountInput}
            onChange={(event) => updateDraft({ amountInput: event.target.value })}
          />
        </label>

        <label>
          Paid by
          <select value={draft.paidBy} onChange={(event) => updateDraft({ paidBy: event.target.value })}>
            {group.memberIds.map((memberId) => {
              const member = getMember(memberMap, memberId);
              return (
                <option value={member.id} key={member.id}>
                  {member.name}
                </option>
              );
            })}
          </select>
        </label>

        <div className="category-grid" role="group" aria-label="Category">
          {categories.map((category) => (
            <button
              className={draft.category === category ? 'chip chip-active' : 'chip'}
              type="button"
              onClick={() => updateDraft({ category })}
              key={category}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Split mode">
          <button
            className={draft.splitMode === 'equal' ? 'segment-active' : ''}
            type="button"
            onClick={() => updateDraft({ splitMode: 'equal' })}
          >
            Split equally
          </button>
          <button
            className={draft.splitMode === 'manual' ? 'segment-active' : ''}
            type="button"
            onClick={() => updateDraft({ splitMode: 'manual' })}
          >
            Manual split
          </button>
        </div>

        <section className="split-panel">
          <div className="section-head compact-head">
            <div>
              <p className="caption">For whom</p>
              <h2>Participants</h2>
            </div>
            {draft.splitMode === 'manual' && (
              <span className={manualTotal === amountCents ? 'ok-text' : 'warn-text'}>
                {formatCents(manualTotal)} / {Number.isInteger(amountCents) ? formatCents(amountCents) : '$0.00'}
              </span>
            )}
          </div>

          {group.memberIds.map((memberId) => {
            const member = getMember(memberMap, memberId);
            const selected = draft.participantIds.includes(memberId);
            const previewSplits = previewExpense ? calculateSplits(previewExpense) : {};
            return (
              <div className="participant-row" key={memberId}>
                <button
                  className={selected ? 'check-button checked' : 'check-button'}
                  type="button"
                  onClick={() => toggleParticipant(memberId)}
                  aria-label={`Toggle ${member.name}`}
                >
                  {selected && <Check size={14} />}
                </button>
                <span className="avatar">{member.avatar}</span>
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.username}</p>
                </div>
                {draft.splitMode === 'manual' ? (
                  <input
                    className="split-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={draft.manualSplits[memberId] ?? '0'}
                    disabled={!selected}
                    onChange={(event) => updateManualSplit(memberId, event.target.value)}
                    aria-label={`${member.name} manual split cents`}
                  />
                ) : (
                  <b>{selected ? formatCents(previewSplits[memberId] ?? 0) : '$0.00'}</b>
                )}
              </div>
            );
          })}
        </section>

        {!isManualValid && <p className="form-error">Manual split must equal the full amount in cents.</p>}

        <button className="submit-button" type="submit" disabled={!canSubmit}>
          <Plus size={18} />
          Save expense
        </button>
      </form>
    </main>
  );
}

function BalancesScreen({
  state,
  group,
  memberMap,
  onConfirmSettlements,
}: {
  state: FinanceState;
  group: Group;
  memberMap: Map<MemberId, Member>;
  onConfirmSettlements: (items: SettlementSuggestion[]) => void;
}) {
  const balances = calculateGroupBalances(state, group.id);
  const suggestions = suggestSettlements(balances);
  const netSum = balances.reduce((sum, balance) => sum + balance.netCents, 0);

  return (
    <main className="screen stack">
      <header className="screen-title">
        <p className="caption">{group.title}</p>
        <h1>Balances</h1>
      </header>

      <section className="balance-audit">
        <CircleDollarSign size={24} />
        <div>
          <strong>Net sum check: {formatCents(netSum)}</strong>
          <p>Every expense split is stored in cents, so total balances must return to zero.</p>
        </div>
      </section>

      <div className="balance-list">
        {balances.map((balance) => {
          const member = getMember(memberMap, balance.memberId);
          return <BalanceRow balance={balance} member={member} key={balance.memberId} />;
        })}
      </div>

      <section className="section-head">
        <div>
          <p className="caption">Settle up simulation</p>
          <h2>Suggested transfers</h2>
        </div>
        <span>{suggestions.length} moves</span>
      </section>

      <div className="suggestion-list">
        {suggestions.length === 0 ? (
          <p className="empty-state">No transfers needed. This group is settled.</p>
        ) : (
          suggestions.map((suggestion) => {
            const from = getMember(memberMap, suggestion.fromId);
            const to = getMember(memberMap, suggestion.toId);
            return (
              <article className="suggestion-row" key={`${suggestion.fromId}-${suggestion.toId}-${suggestion.amountCents}`}>
                <span className="avatar">{from.avatar}</span>
                <div>
                  <strong>
                    {from.name} pays {to.name}
                  </strong>
                  <p>Minimal transfer based on current net balances.</p>
                </div>
                <b>{formatCents(suggestion.amountCents)}</b>
              </article>
            );
          })
        )}
      </div>

      <button className="submit-button" type="button" disabled={suggestions.length === 0} onClick={() => onConfirmSettlements(suggestions)}>
        <Check size={18} />
        {suggestions.length === 0 ? 'Group is settled' : 'Confirm settlement simulation'}
      </button>
    </main>
  );
}

function BalanceRow({ member, balance }: { member: Member; balance: MemberBalance }) {
  return (
    <article className="balance-row">
      <span className="avatar">{member.avatar}</span>
      <div className="balance-main">
        <strong>{member.name}</strong>
        <p>
          Paid {formatCents(balance.paidCents)} · owed {formatCents(balance.owedCents)}
        </p>
      </div>
      <AmountBadge value={balance.netCents} />
    </article>
  );
}

function HistoryScreen({
  state,
  group,
  memberMap,
}: {
  state: FinanceState;
  group: Group;
  memberMap: Map<MemberId, Member>;
}) {
  const [category, setCategory] = useState('All');
  const [memberId, setMemberId] = useState('All');
  const [query, setQuery] = useState('');

  const expenses = state.expenses
    .filter((expense) => expense.groupId === group.id)
    .filter((expense) => category === 'All' || expense.category === category)
    .filter((expense) => memberId === 'All' || expense.paidBy === memberId || expense.splitParticipants.includes(memberId))
    .filter((expense) => expense.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));

  function handleCategory(event: ChangeEvent<HTMLSelectElement>): void {
    setCategory(event.target.value);
  }

  function handleMember(event: ChangeEvent<HTMLSelectElement>): void {
    setMemberId(event.target.value);
  }

  return (
    <main className="screen stack">
      <header className="screen-title">
        <p className="caption">{group.title}</p>
        <h1>History</h1>
      </header>

      <section className="filters">
        <label className="search-field">
          <Search size={16} />
          <input placeholder="Search expense" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="filter-grid">
          <select value={category} onChange={handleCategory} aria-label="Filter by category">
            <option value="All">All categories</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={memberId} onChange={handleMember} aria-label="Filter by member">
            <option value="All">All members</option>
            {group.memberIds.map((id) => {
              const member = getMember(memberMap, id);
              return (
                <option value={member.id} key={member.id}>
                  {member.name}
                </option>
              );
            })}
          </select>
        </div>
      </section>

      <ExpenseList expenses={expenses} memberMap={memberMap} />
    </main>
  );
}

export function App() {
  const [state, setState] = useState<FinanceState>(() => loadFinanceState());
  const [screen, setScreen] = useState<Screen>('groups');
  const [activeGroupId, setActiveGroupId] = useState<GroupId>(() => state.groups[0]?.id ?? '');

  useEffect(() => {
    applyTelegramTheme();
  }, []);

  useEffect(() => {
    saveFinanceState(state);
  }, [state]);

  const memberMap = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members]);
  const activeGroup = state.groups.find((group) => group.id === activeGroupId) ?? state.groups[0];

  function navigate(nextScreen: Screen): void {
    if (nextScreen !== 'groups' && !activeGroup) {
      setScreen('groups');
      return;
    }
    setScreen(nextScreen);
  }

  function openGroup(groupId: GroupId): void {
    setActiveGroupId(groupId);
    setScreen('group');
  }

  function createExpense(expense: Expense): void {
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    setScreen('group');
  }

  function confirmSettlements(items: SettlementSuggestion[]): void {
    setState((current) => ({
      ...current,
      settlements: [
        ...items.map((item) => ({
          id: createId('settlement'),
          groupId: activeGroup.id,
          fromId: item.fromId,
          toId: item.toId,
          amountCents: item.amountCents,
          status: 'confirmed' as const,
          createdAt: todayIso(),
        })),
        ...current.settlements,
      ],
    }));
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
  }

  function resetDemo(): void {
    const nextState = resetFinanceState();
    setState(nextState);
    setActiveGroupId(nextState.groups[0]?.id ?? '');
    setScreen('groups');
  }

  if (!activeGroup) {
    return <main className="screen empty-state">No demo data available.</main>;
  }

  return (
    <div className="tma-shell">
      <div className="app-frame">
        {screen === 'groups' && <GroupsScreen state={state} memberMap={memberMap} onOpenGroup={openGroup} onReset={resetDemo} />}
        {screen === 'group' && <GroupScreen state={state} group={activeGroup} memberMap={memberMap} onNavigate={navigate} />}
        {screen === 'add' && (
          <AddExpenseScreen group={activeGroup} memberMap={memberMap} onBack={() => navigate('group')} onCreate={createExpense} />
        )}
        {screen === 'balances' && (
          <BalancesScreen state={state} group={activeGroup} memberMap={memberMap} onConfirmSettlements={confirmSettlements} />
        )}
        {screen === 'history' && <HistoryScreen state={state} group={activeGroup} memberMap={memberMap} />}
        {screen !== 'add' && <AppNav screen={screen} onNavigate={navigate} />}
      </div>
    </div>
  );
}
