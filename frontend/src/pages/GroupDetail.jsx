import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [groupName, setGroupName] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    splitType: 'EQUAL',
    participantUserIds: [],
    customShares: {}
  });

  const [expenseError, setExpenseError] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [memberForm, setMemberForm] = useState({ email: '' });
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const [settlementForm, setSettlementForm] = useState({ paidToUserId: '', amount: '' });
  const [settlementError, setSettlementError] = useState('');
  const [recordingSettlement, setRecordingSettlement] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await axiosClient.get(`/groups/${id}/members`);
    setMembers(res.data);
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    const res = await axiosClient.get(`/groups/${id}/expenses`);
    setExpenses(res.data);
  }, [id]);

  const fetchBalances = useCallback(async () => {
    const res = await axiosClient.get(`/groups/${id}/expenses/balances`);
    setBalances(res.data);
  }, [id]);

  useEffect(() => {
    axiosClient.get('/groups').then((res) => {
      const g = res.data.find((gr) => String(gr.id) === String(id));
      if (g) setGroupName(g.name);
    });

    fetchMembers();
    fetchExpenses();
    fetchBalances();
  }, [id, fetchMembers, fetchExpenses, fetchBalances]);

  const openExpenseModal = () => {
    setExpenseError('');

    setExpenseForm({
      description: '',
      amount: '',
      splitType: 'EQUAL',
      participantUserIds: members.map((m) => m.userId),
      customShares: {}
    });

    setShowExpenseModal(true);
  };

  const handleParticipantChange = (userId) => {
    setExpenseForm((prev) => {
      const selected = prev.participantUserIds.includes(userId);

      const participantUserIds = selected
        ? prev.participantUserIds.filter((id) => id !== userId)
        : [...prev.participantUserIds, userId];

      const customShares = { ...prev.customShares };

      if (selected) {
        delete customShares[userId];
      }

      return {
        ...prev,
        participantUserIds,
        customShares
      };
    });
  };

  const handleSplitTypeChange = (splitType) => {
    setExpenseForm((prev) => ({
      ...prev,
      splitType,
      customShares: {}
    }));
  };

  const handleCustomShareChange = (userId, amount) => {
    setExpenseForm((prev) => ({
      ...prev,
      customShares: {
        ...prev.customShares,
        [userId]: amount
      }
    }));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');

    if (expenseForm.participantUserIds.length === 0) {
      setExpenseError('Select at least one participant');
      return;
    }

    const amount = parseFloat(expenseForm.amount);

    if (!amount || amount <= 0) {
      setExpenseError('Enter a valid amount');
      return;
    }

    let customShares = {};

    if (expenseForm.splitType === 'CUSTOM') {
      let total = 0;

      for (const participantId of expenseForm.participantUserIds) {
        const share = parseFloat(expenseForm.customShares[participantId]);

        if (!share || share <= 0) {
          setExpenseError('Enter an amount for every selected member');
          return;
        }

        customShares[participantId] = share;
        total += share;
      }

      if (Math.abs(total - amount) > 0.01) {
        setExpenseError(
          `Custom amounts must total ₹${amount.toFixed(2)}. Current total is ₹${total.toFixed(2)}.`
        );
        return;
      }
    }

    setAddingExpense(true);

    try {
      const request = {
        description: expenseForm.description,
        amount,
        splitType: expenseForm.splitType,
        participantUserIds: expenseForm.participantUserIds
      };

      if (expenseForm.splitType === 'CUSTOM') {
        request.customShares = customShares;
      }

      await axiosClient.post(`/groups/${id}/expenses`, request);

      setExpenseForm({
        description: '',
        amount: '',
        splitType: 'EQUAL',
        participantUserIds: [],
        customShares: {}
      });

      setShowExpenseModal(false);

      await fetchExpenses();
      await fetchBalances();
    } catch (err) {
      setExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setAddingMember(true);

    try {
      await axiosClient.post(`/groups/${id}/members`, memberForm);
      setMemberForm({ email: '' });
      setShowMemberModal(false);
      await fetchMembers();
      await fetchBalances();
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleSettlement = async (e) => {
    e.preventDefault();
    setSettlementError('');
    setRecordingSettlement(true);

    try {
      await axiosClient.post(`/groups/${id}/settlements`, {
        paidToUserId: parseInt(settlementForm.paidToUserId),
        amount: parseFloat(settlementForm.amount)
      });

      setSettlementForm({ paidToUserId: '', amount: '' });
      await fetchBalances();
    } catch (err) {
      setSettlementError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setRecordingSettlement(false);
    }
  };

  const totalSpent = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const myBalance = balances.reduce((total, balance) => {
    if (balance.fromUserId === user?.userId) {
      return total - Number(balance.amount || 0);
    }

    if (balance.toUserId === user?.userId) {
      return total + Number(balance.amount || 0);
    }

    return total;
  }, 0);

  const otherMembers = members.filter((m) => m.userId !== user?.userId);

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const selectedMembers = members.filter((m) =>
    expenseForm.participantUserIds.includes(m.userId)
  );

  const customTotal = selectedMembers.reduce(
    (total, m) => total + Number(expenseForm.customShares[m.userId] || 0),
    0
  );

  const equalShare =
    expenseForm.participantUserIds.length > 0 && expenseForm.amount
      ? Number(expenseForm.amount) / expenseForm.participantUserIds.length
      : 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-slate-500 hover:text-slate-900 transition"
            >
              ← Dashboard
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <h1 className="text-lg sm:text-xl font-bold">
              {groupName || `Group #${id}`}
            </h1>
          </div>

          <span className="text-xs sm:text-sm text-slate-500">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">

        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-1">Group overview</p>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {groupName || 'Your group'}
              </h2>

              <p className="text-slate-500 mt-2">
                Keep track of shared expenses and balances.
              </p>
            </div>

            <button
              onClick={openExpenseModal}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3 rounded-xl transition shadow-sm"
            >
              + Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total spent</p>

            <p className="text-3xl font-bold mt-2">
              ₹{totalSpent.toFixed(2)}
            </p>

            <p className="text-xs text-slate-400 mt-2">
              Across {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Your balance</p>

            <p
              className={`text-3xl font-bold mt-2 ${
                myBalance > 0
                  ? 'text-emerald-600'
                  : myBalance < 0
                  ? 'text-red-500'
                  : 'text-slate-800'
              }`}
            >
              {myBalance >= 0 ? '+' : '-'}₹{Math.abs(myBalance).toFixed(2)}
            </p>

            <p className="text-xs text-slate-400 mt-2">
              {myBalance > 0
                ? 'You are owed money'
                : myBalance < 0
                ? 'You owe money'
                : 'All settled up'}
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Recent expenses</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Latest activity in this group
                  </p>
                </div>

                <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full">
                  {expenses.length}
                </span>
              </div>

              {recentExpenses.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">💸</div>
                  <p className="font-semibold text-slate-700">
                    No expenses yet
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Add your first shared expense.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0">
                          💸
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {exp.description}
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Paid by {exp.paidByName} ·{' '}
                            {new Date(exp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-slate-800 shrink-0">
                        ₹{Number(exp.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {expenses.length > 5 && (
                <div className="px-6 py-3 border-t border-slate-100 text-center">
                  <span className="text-sm text-slate-500">
                    Showing your 5 most recent expenses
                  </span>
                </div>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="font-bold text-lg">Who owes whom</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Current group balances
                </p>
              </div>

              <div className="p-6">
                {balances.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="font-semibold text-slate-700">
                      Everyone is settled up
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balances.map((b, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-xl bg-slate-50"
                      >
                        <p className="text-sm text-slate-700">
                          <strong>{b.fromUserName}</strong> owes{' '}
                          <strong>{b.toUserName}</strong>
                        </p>

                        <p className="font-bold text-red-500">
                          ₹{Number(b.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>

          <div className="space-y-6">

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Members</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {members.length} in this group
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMemberError('');
                    setShowMemberModal(true);
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Add
                </button>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm">
                          {m.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {m.name}
                          </p>

                          {m.userId === user?.userId && (
                            <p className="text-xs text-slate-400">You</p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] uppercase text-slate-400 font-semibold">
                        {m.roleInGroup}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="px-6 py-5">
                <h3 className="font-bold">Settlement</h3>

                <p className="text-sm text-slate-400 mt-1 mb-5">
                  Record money you've paid back outside the app.
                </p>

                {otherMembers.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Add another member to record a settlement.
                  </p>
                ) : (
                  <form onSubmit={handleSettlement} className="space-y-3">

                    <select
                      required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={settlementForm.paidToUserId}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          paidToUserId: e.target.value
                        })
                      }
                    >
                      <option value="">I paid...</option>

                      {otherMembers.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      required
                      min="0.01"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={settlementForm.amount}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          amount: e.target.value
                        })
                      }
                    />

                    <button
                      type="submit"
                      disabled={recordingSettlement}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                    >
                      {recordingSettlement ? 'Recording...' : 'Record settlement'}
                    </button>

                    {settlementError && (
                      <p className="text-red-500 text-xs">
                        {settlementError}
                      </p>
                    )}

                  </form>
                )}
              </div>
            </section>

          </div>

        </div>
      </main>

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl my-6">

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Add expense</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Add a shared expense to this group.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-5">

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  What did you spend on?
                </label>

                <input
                  type="text"
                  placeholder="e.g. Dinner, Movie, Groceries"
                  required
                  autoFocus
                  className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Amount
                </label>

                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        amount: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Paid by
                </label>

                <div className="mt-2 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-sm">
                  {user?.name || user?.email || 'You'}
                  <span className="text-slate-400 ml-2">(You)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Split
                </label>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleSplitTypeChange('EQUAL')}
                    className={`py-3 rounded-xl border text-sm font-semibold transition ${
                      expenseForm.splitType === 'EQUAL'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Equal
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSplitTypeChange('CUSTOM')}
                    className={`py-3 rounded-xl border text-sm font-semibold transition ${
                      expenseForm.splitType === 'CUSTOM'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Members participating
                </label>

                <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {members.map((m) => {
                    const selected = expenseForm.participantUserIds.includes(m.userId);

                    return (
                      <label
                        key={m.userId}
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleParticipantChange(m.userId)}
                            className="w-4 h-4"
                          />

                          <div>
                            <p className="text-sm font-semibold">
                              {m.name}
                              {m.userId === user?.userId && (
                                <span className="text-xs text-slate-400 ml-2">
                                  You
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {expenseForm.splitType === 'EQUAL' && selected && (
                          <span className="text-xs text-slate-500">
                            ₹{equalShare.toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {expenseForm.splitType === 'CUSTOM' &&
                selectedMembers.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Custom amounts
                    </label>

                    <div className="mt-2 space-y-2">
                      {selectedMembers.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center gap-3"
                        >
                          <div className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50">
                            {m.name}
                          </div>

                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                              ₹
                            </span>

                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                              value={expenseForm.customShares[m.userId] || ''}
                              onChange={(e) =>
                                handleCustomShareChange(
                                  m.userId,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      className={`mt-3 flex justify-between text-sm px-3 py-2 rounded-lg ${
                        Math.abs(
                          customTotal - Number(expenseForm.amount || 0)
                        ) < 0.01
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>Split total</span>
                      <span className="font-semibold">
                        ₹{customTotal.toFixed(2)} / ₹
                        {Number(expenseForm.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

              {expenseError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
                  {expenseError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 font-semibold py-3 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingExpense}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {addingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Add member</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Add someone using their registered email.
                </p>
              </div>

              <button
                onClick={() => setShowMemberModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-5">

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email address
                </label>

                <input
                  type="email"
                  placeholder="member@example.com"
                  required
                  autoFocus
                  className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={memberForm.email}
                  onChange={(e) =>
                    setMemberForm({ email: e.target.value })
                  }
                />
              </div>

              {memberError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
                  {memberError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 font-semibold py-3 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingMember}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}