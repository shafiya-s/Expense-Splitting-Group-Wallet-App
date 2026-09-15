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

  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '' });
  const [expenseError, setExpenseError] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  const [memberForm, setMemberForm] = useState({ email: '' });
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [settlementForm, setSettlementForm] = useState({ paidToUserId: '', amount: '' });
  const [settlementError, setSettlementError] = useState('');
  const [recordingSettlement, setRecordingSettlement] = useState(false);

  // ─── Fetch All Data ────────────────────────────────────────────────────────

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
    // Get group name from dashboard (already fetched) or fall back to fetching groups list
    axiosClient.get('/groups').then((res) => {
      const g = res.data.find((gr) => String(gr.id) === String(id));
      if (g) setGroupName(g.name);
    });

    fetchMembers();
    fetchExpenses();
    fetchBalances();
  }, [id, fetchMembers, fetchExpenses, fetchBalances]);

  // ─── Add Expense ───────────────────────────────────────────────────────────

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');
    setAddingExpense(true);
    try {
      await axiosClient.post(`/groups/${id}/expenses`, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
      });
      setExpenseForm({ description: '', amount: '' });
      await fetchExpenses();
      await fetchBalances();
    } catch (err) {
      setExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  // ─── Add Member ────────────────────────────────────────────────────────────

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setAddingMember(true);
    try {
      await axiosClient.post(`/groups/${id}/members`, memberForm);
      setMemberForm({ email: '' });
      await fetchMembers();
      await fetchBalances(); // balances change when new member joins
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // ─── Record Settlement ─────────────────────────────────────────────────────

  const handleSettlement = async (e) => {
    e.preventDefault();
    setSettlementError('');
    setRecordingSettlement(true);
    try {
      await axiosClient.post(`/groups/${id}/settlements`, {
        paidToUserId: parseInt(settlementForm.paidToUserId),
        amount: parseFloat(settlementForm.amount),
      });
      setSettlementForm({ paidToUserId: '', amount: '' });
      await fetchBalances();
    } catch (err) {
      setSettlementError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setRecordingSettlement(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // Other members (exclude self) for settlement dropdown
  const otherMembers = members.filter((m) => m.userId !== user?.userId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Dashboard
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {groupName || `Group #${id}`}
        </h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Members ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Members ({members.length})</h2>
          <ul className="divide-y divide-gray-100 mb-4">
            {members.map((m) => (
              <li key={m.userId} className="py-2 flex items-center justify-between text-sm">
                <span className="text-gray-800">
                  {m.name}
                  {m.userId === user?.userId && (
                    <span className="ml-1 text-xs text-gray-400">(you)</span>
                  )}
                </span>
                <span className="text-xs text-gray-400 uppercase">{m.roleInGroup}</span>
              </li>
            ))}
          </ul>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="flex gap-2 mt-2">
            <input
              id="add-member-email"
              type="email"
              placeholder="Add member by email"
              required
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ email: e.target.value })}
            />
            <button
              id="add-member-btn"
              type="submit"
              disabled={addingMember}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50"
            >
              {addingMember ? '…' : 'Add'}
            </button>
          </form>
          {memberError && (
            <p className="text-red-500 text-xs mt-2">{memberError}</p>
          )}
        </section>

        {/* ── Expenses ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Expenses</h2>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="flex gap-2 mb-4">
            <input
              id="expense-desc"
              type="text"
              placeholder="Description"
              required
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            />
            <input
              id="expense-amount"
              type="number"
              placeholder="Amount (₹)"
              required
              min="0.01"
              step="0.01"
              className="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            />
            <button
              id="add-expense-btn"
              type="submit"
              disabled={addingExpense}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50"
            >
              {addingExpense ? '…' : 'Add'}
            </button>
          </form>
          {expenseError && (
            <p className="text-red-500 text-xs mb-3">{expenseError}</p>
          )}

          {/* Expense List */}
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <li key={exp.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-800 font-medium">{exp.description}</p>
                    <p className="text-xs text-gray-400">
                      Paid by {exp.paidByName} · {new Date(exp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-700">₹{exp.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Balances ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Balances</h2>

          {balances.length === 0 ? (
            <p className="text-sm text-gray-400">All settled up! 🎉</p>
          ) : (
            <ul className="space-y-2">
              {balances.map((b, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between text-sm rounded p-2 ${
                    b.fromUserId === user?.userId
                      ? 'bg-red-50 text-red-700'
                      : b.toUserId === user?.userId
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>
                    <strong>{b.fromUserName}</strong> owes{' '}
                    <strong>{b.toUserName}</strong>
                  </span>
                  <span className="font-semibold">₹{b.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Settlements ──────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Record a Settlement</h2>
          <p className="text-xs text-gray-500 mb-3">
            Use this when you have paid someone back outside the app.
          </p>

          {otherMembers.length === 0 ? (
            <p className="text-sm text-gray-400">No other members to settle with.</p>
          ) : (
            <form onSubmit={handleSettlement} className="flex gap-2">
              <select
                id="settlement-to"
                required
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settlementForm.paidToUserId}
                onChange={(e) =>
                  setSettlementForm({ ...settlementForm, paidToUserId: e.target.value })
                }
              >
                <option value="">I paid…</option>
                {otherMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                id="settlement-amount"
                type="number"
                placeholder="Amount (₹)"
                required
                min="0.01"
                step="0.01"
                className="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settlementForm.amount}
                onChange={(e) =>
                  setSettlementForm({ ...settlementForm, amount: e.target.value })
                }
              />
              <button
                id="settle-btn"
                type="submit"
                disabled={recordingSettlement}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50"
              >
                {recordingSettlement ? '…' : 'Record'}
              </button>
            </form>
          )}
          {settlementError && (
            <p className="text-red-500 text-xs mt-2">{settlementError}</p>
          )}
        </section>

      </main>
    </div>
  );
}
