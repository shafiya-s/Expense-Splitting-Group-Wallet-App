import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Data
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);

  // UI / Filter States
  const [balancesFilter, setBalancesFilter] = useState('ALL'); // 'ALL' | 'PAY' | 'RECEIVE' | 'YOU_PAID'
  const [activeMenuExpenseId, setActiveMenuExpenseId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Add Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    splitType: 'EQUAL',
    participantUserIds: [],
    customShares: {}
  });
  const [expenseError, setExpenseError] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  // Edit Expense Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    splitType: 'EQUAL',
    participantUserIds: [],
    customShares: {}
  });
  const [editError, setEditError] = useState('');
  const [updatingExpense, setUpdatingExpense] = useState(false);

  // Delete Expense Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Members Modals
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmailForm, setMemberEmailForm] = useState('');
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState(null);

  // Settlement / Settle Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState({
    fromUserId: null,
    fromUserName: '',
    toUserId: null,
    toUserName: '',
    amount: 0
  });
  const [recordingSettlement, setRecordingSettlement] = useState(false);
  const [settleError, setSettleError] = useState('');

  // Close menus when clicking outside
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuExpenseId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMembers = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/groups/${id}/members`);
      setMembers(res.data);
    } catch {
      // silent
    }
  }, [id]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/groups/${id}/expenses`);
      setExpenses(res.data);
    } catch {
      // silent
    }
  }, [id]);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/groups/${id}/expenses/balances`);
      setBalances(res.data);
    } catch {
      // silent
    }
  }, [id]);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await axiosClient.get('/friends');
      setFriends(res.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    axiosClient.get('/groups').then((res) => {
      const g = res.data.find((gr) => String(gr.id) === String(id));
      if (g) setGroupName(g.name);
    });

    fetchMembers();
    fetchExpenses();
    fetchBalances();
    fetchFriends();
  }, [id, fetchMembers, fetchExpenses, fetchBalances, fetchFriends]);

  // Smooth Scroll Helper
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Calculations
  const totalSpent = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const youPaid = expenses
    .filter((e) => e.paidById === user?.userId)
    .reduce((total, expense) => total + Number(expense.amount || 0), 0);

  const youShouldReceive = balances
    .filter((b) => b.toUserId === user?.userId)
    .reduce((total, b) => total + Number(b.amount || 0), 0);

  const youNeedToPay = balances
    .filter((b) => b.fromUserId === user?.userId)
    .reduce((total, b) => total + Number(b.amount || 0), 0);

  // -------------------------------------------------------------
  // Add Expense Handlers
  // -------------------------------------------------------------
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
        ? prev.participantUserIds.filter((uid) => uid !== userId)
        : [...prev.participantUserIds, userId];
      const customShares = { ...prev.customShares };
      if (selected) delete customShares[userId];

      return { ...prev, participantUserIds, customShares };
    });
  };

  const handleCustomShareChange = (userId, amount) => {
    setExpenseForm((prev) => ({
      ...prev,
      customShares: { ...prev.customShares, [userId]: amount }
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
      setExpenseError('Enter a valid positive amount');
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
        description: expenseForm.description.trim(),
        amount,
        splitType: expenseForm.splitType,
        participantUserIds: expenseForm.participantUserIds
      };
      if (expenseForm.splitType === 'CUSTOM') {
        request.customShares = customShares;
      }

      await axiosClient.post(`/groups/${id}/expenses`, request);
      setShowExpenseModal(false);
      await fetchExpenses();
      await fetchBalances();
      showToast('Expense added successfully!');
    } catch (err) {
      setExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Expense Handlers
  // -------------------------------------------------------------
  const openEditExpenseModal = (exp) => {
    setActiveMenuExpenseId(null);
    setEditError('');
    setEditingExpense(exp);

    const participantIds = exp.splits && exp.splits.length > 0
      ? exp.splits.map((s) => s.userId)
      : members.map((m) => m.userId);

    const customShares = {};
    if (exp.splits && exp.splits.length > 0) {
      exp.splits.forEach((s) => {
        customShares[s.userId] = s.shareAmount;
      });
    }

    setEditForm({
      description: exp.description,
      amount: String(exp.amount),
      splitType: exp.splitType || 'EQUAL',
      participantUserIds: participantIds,
      customShares
    });
    setShowEditModal(true);
  };

  const handleEditParticipantChange = (userId) => {
    setEditForm((prev) => {
      const selected = prev.participantUserIds.includes(userId);
      const participantUserIds = selected
        ? prev.participantUserIds.filter((uid) => uid !== userId)
        : [...prev.participantUserIds, userId];
      const customShares = { ...prev.customShares };
      if (selected) delete customShares[userId];

      return { ...prev, participantUserIds, customShares };
    });
  };

  const handleEditCustomShareChange = (userId, amount) => {
    setEditForm((prev) => ({
      ...prev,
      customShares: { ...prev.customShares, [userId]: amount }
    }));
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    setEditError('');

    if (editForm.participantUserIds.length === 0) {
      setEditError('Select at least one participant');
      return;
    }

    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) {
      setEditError('Enter a valid positive amount');
      return;
    }

    let customShares = {};
    if (editForm.splitType === 'CUSTOM') {
      let total = 0;
      for (const participantId of editForm.participantUserIds) {
        const share = parseFloat(editForm.customShares[participantId]);
        if (!share || share <= 0) {
          setEditError('Enter an amount for every selected member');
          return;
        }
        customShares[participantId] = share;
        total += share;
      }
      if (Math.abs(total - amount) > 0.01) {
        setEditError(
          `Custom amounts must total ₹${amount.toFixed(2)}. Current total is ₹${total.toFixed(2)}.`
        );
        return;
      }
    }

    setUpdatingExpense(true);
    try {
      const request = {
        description: editForm.description.trim(),
        amount,
        splitType: editForm.splitType,
        participantUserIds: editForm.participantUserIds
      };
      if (editForm.splitType === 'CUSTOM') {
        request.customShares = customShares;
      }

      await axiosClient.put(`/groups/${id}/expenses/${editingExpense.id}`, request);
      setShowEditModal(false);
      setEditingExpense(null);
      await fetchExpenses();
      await fetchBalances();
      showToast('Expense updated successfully!');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setUpdatingExpense(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Expense Handlers
  // -------------------------------------------------------------
  const openDeleteExpenseModal = (exp) => {
    setActiveMenuExpenseId(null);
    setDeletingExpense(exp);
    setShowDeleteModal(true);
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/groups/${id}/expenses/${deletingExpense.id}`);
      setShowDeleteModal(false);
      setDeletingExpense(null);
      await fetchExpenses();
      await fetchBalances();
      showToast('Expense deleted successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Member Handlers
  // -------------------------------------------------------------
  const handleAddMemberByEmail = async (e) => {
    e.preventDefault();
    if (!memberEmailForm.trim()) return;
    setMemberError('');
    setAddingMember(true);
    try {
      await axiosClient.post(`/groups/${id}/members`, { email: memberEmailForm.trim() });
      setMemberEmailForm('');
      setShowAddMemberModal(false);
      await fetchMembers();
      await fetchBalances();
      showToast('Member added successfully!');
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddFriendToGroup = async (friend) => {
    setMemberError('');
    setAddingFriendId(friend.id);
    try {
      await axiosClient.post(`/groups/${id}/members`, { email: friend.email });
      await fetchMembers();
      await fetchBalances();
      showToast(`${friend.name} added to the group!`);
    } catch (err) {
      setMemberError(err.response?.data?.message || `Failed to add ${friend.name}`);
    } finally {
      setAddingFriendId(null);
    }
  };

  // -------------------------------------------------------------
  // Settlement / Settle Flow Handlers
  // -------------------------------------------------------------
  const openSettleModal = (balance) => {
    setSettleError('');
    setSettleData({
      fromUserId: balance.fromUserId,
      fromUserName: balance.fromUserName,
      toUserId: balance.toUserId,
      toUserName: balance.toUserName,
      amount: Number(balance.amount)
    });
    setShowSettleModal(true);
  };

  const handleConfirmSettlement = async () => {
    setSettleError('');
    setRecordingSettlement(true);
    try {
      // In our settlement model: paidBy = fromUserId, paidTo = toUserId
      await axiosClient.post(`/groups/${id}/settlements`, {
        paidToUserId: settleData.toUserId,
        amount: settleData.amount
      });
      setShowSettleModal(false);
      await fetchBalances();
      await fetchExpenses();
      showToast(`Payment of ₹${settleData.amount.toFixed(2)} recorded!`);
    } catch (err) {
      setSettleError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingSettlement(false);
    }
  };

  // Helpers for selected members in form
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

  const selectedEditMembers = members.filter((m) =>
    editForm.participantUserIds.includes(m.userId)
  );
  const editCustomTotal = selectedEditMembers.reduce(
    (total, m) => total + Number(editForm.customShares[m.userId] || 0),
    0
  );
  const editEqualShare =
    editForm.participantUserIds.length > 0 && editForm.amount
      ? Number(editForm.amount) / editForm.participantUserIds.length
      : 0;

  // Filtered Balances
  const myPayBalances = balances.filter((b) => b.fromUserId === user?.userId);
  const myReceiveBalances = balances.filter((b) => b.toUserId === user?.userId);
  const myPaidExpenses = expenses.filter((e) => e.paidById === user?.userId);

  // Unadded friends for Add Member Modal
  const groupUserIds = members.map((m) => m.userId);
  const availableFriends = friends.filter((f) => !groupUserIds.includes(f.id));

  return (
    <div className="min-h-screen bg-[#F6F3ED] text-[#1C1614] pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1614] text-[#F6F3ED] px-4 py-3 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2 text-sm font-medium animate-bounce-short">
          <svg className="w-5 h-5 text-[#3A7D65]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Sub-Header */}
      <header className="bg-[#FAF8F4] border-b border-[#E5DED2] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-medium text-[#5E534B] hover:text-[#1C1614] transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </button>

            <div className="h-4 w-px bg-[#E5DED2] hidden sm:block"></div>

            <h1 className="text-base sm:text-lg font-bold text-[#1C1614] truncate max-w-[180px] sm:max-w-xs">
              {groupName || `Group #${id}`}
            </h1>
          </div>

          <button
            onClick={() => setShowAllMembersModal(true)}
            className="text-xs sm:text-sm font-medium text-[#5E534B] bg-[#ECE5DA]/60 hover:bg-[#ECE5DA] px-3 py-1 rounded-full border border-[#D6CCC0]/50 transition flex items-center gap-1.5"
          >
            <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
            <span className="text-xs text-[#8E8278]">→</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Add Expense Action */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8278]">Group Overview</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1C1614] tracking-tight mt-1">
              {groupName || 'Your Group'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5E534B] mt-1 font-medium">
              Track shared expenses, manage members, and record settled balances.
            </p>
          </div>

          <button
            onClick={openExpenseModal}
            className="w-full sm:w-auto bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold px-5 py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Expense</span>
          </button>
        </div>

        {/* 1. TOP SUMMARY CARDS (3-Card Row) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Spent */}
          <div
            onClick={() => scrollToSection('recent-expenses-section')}
            className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-5 shadow-2xs cursor-pointer hover:border-[#D6CCC0] hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5E534B]">Total Spent</p>
              <span className="text-xs text-[#8E8278] group-hover:text-[#1C1614] transition">↓</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1614] mt-2 tracking-tight">
              ₹{totalSpent.toFixed(2)}
            </p>
            <p className="text-xs text-[#8E8278] mt-1 font-medium">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>

          {/* Card 2: You Should Receive */}
          <div
            onClick={() => {
              setBalancesFilter('RECEIVE');
              scrollToSection('current-balances-section');
            }}
            className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-5 shadow-2xs cursor-pointer hover:border-[#C6DDD2] hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5E534B]">You Should Receive</p>
              <span className="text-xs text-[#8E8278] group-hover:text-[#1B5441] transition">↓</span>
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight ${
                youShouldReceive > 0 ? 'text-[#1B5441]' : 'text-[#1C1614]'
              }`}
            >
              ₹{youShouldReceive.toFixed(2)}
            </p>
            <p className="text-xs text-[#8E8278] mt-1 font-medium flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  youShouldReceive > 0 ? 'bg-[#3A7D65]' : 'bg-[#8C847B]'
                }`}
              />
              {youShouldReceive > 0 ? 'From other members' : 'All settled'}
            </p>
          </div>

          {/* Card 3: You Paid */}
          <div
            onClick={() => {
              setBalancesFilter('YOU_PAID');
              scrollToSection('current-balances-section');
            }}
            className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-5 shadow-2xs cursor-pointer hover:border-[#D6CCC0] hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5E534B]">You Paid</p>
              <span className="text-xs text-[#8E8278] group-hover:text-[#1C1614] transition">↓</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1614] mt-2 tracking-tight">
              ₹{youPaid.toFixed(2)}
            </p>
            <p className="text-xs text-[#8E8278] mt-1 font-medium">
              Across {myPaidExpenses.length} paid {myPaidExpenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
        </div>

        {/* 2-Column Section: Recent Expenses & Members */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Recent Expenses (Left 2 Columns) */}
          <section
            id="recent-expenses-section"
            className="lg:col-span-2 bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl shadow-2xs overflow-visible"
          >
            <div className="px-6 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#1C1614]">Recent Expenses</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">Latest activity in this group</p>
              </div>

              <span className="text-xs font-bold bg-[#ECE5DA] text-[#5E534B] px-2.5 py-1 rounded-full border border-[#D6CCC0]/60">
                {expenses.length}
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#ECE5DA]/70 text-[#5E534B] mx-auto mb-3 flex items-center justify-center border border-[#D6CCC0]/50">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <p className="font-bold text-sm text-[#1C1614]">No expenses yet</p>
                <p className="text-xs text-[#5E534B] mt-1">Add your first shared expense to start tracking.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5DED2]">
                {expenses.slice(0, 6).map((exp) => (
                  <div
                    key={exp.id}
                    className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#ECE5DA]/25 transition relative"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#ECE5DA] text-[#1C1614] flex items-center justify-center shrink-0 border border-[#D6CCC0]/60">
                        <svg className="w-5 h-5 text-[#5E534B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-[#1C1614] truncate">{exp.description}</p>
                        <p className="text-xs text-[#5E534B] mt-0.5">
                          Paid by {exp.paidById === user?.userId ? 'You' : exp.paidByName} ·{' '}
                          {new Date(exp.createdAt).toLocaleDateString()}
                          {exp.splitType === 'CUSTOM' && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-[#ECE5DA] text-[#5E534B] px-1.5 py-0.5 rounded">
                              Custom Split
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-bold text-sm sm:text-base text-[#1C1614]">
                        ₹{Number(exp.amount).toFixed(2)}
                      </p>

                      {/* Action Menu (⋯) */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuExpenseId(activeMenuExpenseId === exp.id ? null : exp.id)
                          }
                          className="w-8 h-8 rounded-lg text-[#5E534B] hover:bg-[#ECE5DA] hover:text-[#1C1614] flex items-center justify-center transition"
                          title="More options"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>

                        {/* Dropdown Popover */}
                        {activeMenuExpenseId === exp.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-9 w-40 bg-white border border-[#E5DED2] rounded-xl shadow-lg z-50 p-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="w-full text-left px-3 py-2 rounded-lg text-[#1C1614] hover:bg-[#F6F3ED] flex items-center gap-2 transition"
                            >
                              <svg className="w-3.5 h-3.5 text-[#5E534B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span>Edit expense</span>
                            </button>
                            <button
                              onClick={() => openDeleteExpenseModal(exp)}
                              className="w-full text-left px-3 py-2 rounded-lg text-[#963C13] hover:bg-[#FDF3EB] flex items-center gap-2 transition"
                            >
                              <svg className="w-3.5 h-3.5 text-[#963C13]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete expense</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 6 && (
              <div className="px-6 py-3 border-t border-[#E5DED2] bg-[#F6F3ED]/40 text-center">
                <span className="text-xs font-medium text-[#5E534B]">
                  Showing 6 most recent expenses ({expenses.length} total)
                </span>
              </div>
            )}
          </section>

          {/* Members (Right 1 Column - Compact Overview) */}
          <section className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#1C1614]">Members</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">{members.length} in this group</p>
              </div>

              <button
                onClick={() => {
                  setMemberError('');
                  setShowAddMemberModal(true);
                }}
                className="text-xs font-bold text-[#1C1614] hover:text-[#2D2521] hover:underline transition flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add member</span>
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {members.slice(0, 5).map((m) => (
                <div key={m.userId} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#ECE5DA] text-[#1C1614] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D6CCC0]">
                      {m.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C1614] truncate">
                        {m.name}
                        {m.userId === user?.userId && (
                          <span className="text-[10px] text-[#8E8278] ml-1 font-normal">(You)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#ECE5DA]/60 text-[#5E534B] border border-[#D6CCC0]/40">
                    {m.roleInGroup}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-[#E5DED2] bg-[#F6F3ED]/40 text-center">
              <button
                onClick={() => setShowAllMembersModal(true)}
                className="text-xs font-semibold text-[#5E534B] hover:text-[#1C1614] transition inline-flex items-center gap-1"
              >
                <span>View all members ({members.length})</span>
                <span>→</span>
              </button>
            </div>
          </section>
        </div>

        {/* 3. COMBINED "CURRENT GROUP BALANCES" + SETTLEMENT */}
        <section
          id="current-balances-section"
          className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl shadow-2xs overflow-hidden"
        >
          {/* Section Header */}
          <div className="px-6 py-5 border-b border-[#E5DED2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#1C1614]">Current Group Balances</h3>
              <p className="text-xs text-[#5E534B] mt-0.5">See who needs to pay whom</p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-[#ECE5DA]/50 rounded-xl border border-[#D6CCC0]/50 self-start sm:self-auto">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PAY', label: 'I Need to Pay' },
                { id: 'RECEIVE', label: 'I Should Receive' },
                { id: 'YOU_PAID', label: 'You Paid' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBalancesFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    balancesFilter === tab.id
                      ? 'bg-[#1C1614] text-[#F6F3ED] shadow-2xs'
                      : 'text-[#5E534B] hover:text-[#1C1614] hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Views */}
          <div className="p-6">
            {/* VIEW 1: ALL BALANCES */}
            {balancesFilter === 'ALL' && (
              <>
                {balances.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-[#EDF4F0] text-[#1B5441] mx-auto mb-2 flex items-center justify-center border border-[#C6DDD2]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-sm text-[#1C1614]">All settled</p>
                    <p className="text-xs text-[#5E534B] mt-0.5">No outstanding debts in this group.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balances.map((b, idx) => {
                      const isYouPayer = b.fromUserId === user?.userId;
                      const isYouReceiver = b.toUserId === user?.userId;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white border border-[#E5DED2] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#ECE5DA] text-[#1C1614] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D6CCC0]/60">
                              ₹
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1C1614]">
                                {isYouPayer ? (
                                  <>
                                    You need to pay <span className="font-bold text-[#963C13]">{b.toUserName}</span>
                                  </>
                                ) : isYouReceiver ? (
                                  <>
                                    <span className="font-bold text-[#1B5441]">{b.fromUserName}</span> owes you
                                  </>
                                ) : (
                                  <>
                                    <span className="font-semibold">{b.fromUserName}</span> owes{' '}
                                    <span className="font-semibold">{b.toUserName}</span>
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-[#8E8278] mt-0.5 flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#CB5F2A]" />
                                Payment pending
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span className="font-bold text-base text-[#1C1614]">
                              ₹{Number(b.amount).toFixed(2)}
                            </span>
                            {(isYouPayer || isYouReceiver) && (
                              <button
                                onClick={() => openSettleModal(b)}
                                className="bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: I NEED TO PAY */}
            {balancesFilter === 'PAY' && (
              <>
                {myPayBalances.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-[#EDF4F0] text-[#1B5441] mx-auto mb-2 flex items-center justify-center border border-[#C6DDD2]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-sm text-[#1C1614]">All settled</p>
                    <p className="text-xs text-[#5E534B] mt-0.5">You do not need to pay anyone in this group.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPayBalances.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white border border-[#E5DED2] shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#FDF3EB] text-[#963C13] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F6D2BD]">
                            ₹
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1C1614]">
                              You need to pay <strong className="font-bold text-[#963C13]">{b.toUserName}</strong>
                            </p>
                            <p className="text-xs text-[#8E8278] mt-0.5 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#CB5F2A]" />
                              Payment pending
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-bold text-base text-[#963C13]">
                            ₹{Number(b.amount).toFixed(2)}
                          </span>
                          <button
                            onClick={() => openSettleModal(b)}
                            className="bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* VIEW 3: I SHOULD RECEIVE */}
            {balancesFilter === 'RECEIVE' && (
              <>
                {myReceiveBalances.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-[#EDF4F0] text-[#1B5441] mx-auto mb-2 flex items-center justify-center border border-[#C6DDD2]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-sm text-[#1C1614]">All settled</p>
                    <p className="text-xs text-[#5E534B] mt-0.5">No members owe you money in this group.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myReceiveBalances.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white border border-[#E5DED2] shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#EDF4F0] text-[#1B5441] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C6DDD2]">
                            ₹
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1C1614]">
                              <strong className="font-bold text-[#1B5441]">{b.fromUserName}</strong> owes you
                            </p>
                            <p className="text-xs text-[#8E8278] mt-0.5 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#CB5F2A]" />
                              Payment pending
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-bold text-base text-[#1B5441]">
                            ₹{Number(b.amount).toFixed(2)}
                          </span>
                          <button
                            onClick={() => openSettleModal(b)}
                            className="bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* VIEW 4: YOU PAID (Detailed Expense & Split Breakdown) */}
            {balancesFilter === 'YOU_PAID' && (
              <>
                {myPaidExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-bold text-sm text-[#1C1614]">No expenses paid by you yet</p>
                    <p className="text-xs text-[#5E534B] mt-1">When you pay for a group expense, it will appear here with each member's split status.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myPaidExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-5 rounded-2xl bg-white border border-[#E5DED2] shadow-2xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5DED2]">
                          <div>
                            <h4 className="font-bold text-base text-[#1C1614]">{exp.description}</h4>
                            <p className="text-xs text-[#5E534B] mt-0.5">
                              You paid ₹{Number(exp.amount).toFixed(2)} on {new Date(exp.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#1B5441] bg-[#EDF4F0] px-3 py-1 rounded-full border border-[#C6DDD2] self-start sm:self-auto">
                            Total: ₹{Number(exp.amount).toFixed(2)}
                          </span>
                        </div>

                        {/* Split List */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8E8278]">Split Breakdown</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {exp.splits && exp.splits.length > 0 ? (
                              exp.splits.map((split) => {
                                const isYou = split.userId === user?.userId;
                                return (
                                  <div
                                    key={split.id || split.userId}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F4] border border-[#E5DED2]/80 text-xs"
                                  >
                                    <span className="font-semibold text-[#1C1614]">
                                      {isYou ? 'You (Payer)' : split.userName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#1C1614]">
                                        ₹{Number(split.shareAmount).toFixed(2)}
                                      </span>
                                      {isYou ? (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EDF4F0] text-[#1B5441] rounded-md border border-[#C6DDD2]">
                                          ✓ Paid
                                        </span>
                                      ) : split.settled ? (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EDF4F0] text-[#1B5441] rounded-md border border-[#C6DDD2]">
                                          ✓ Paid
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FDF3EB] text-[#963C13] rounded-md border border-[#F6D2BD]">
                                          ● Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-[#5E534B]">Equal split among all members.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: Add Expense Modal */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-md rounded-2xl shadow-2xl my-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1C1614]">Add Expense</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">Add a shared expense to this group.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#ECE5DA] text-[#5E534B] flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#5E534B]">What did you spend on?</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner, Movie, Groceries"
                  required
                  autoFocus
                  className="w-full mt-1.5 bg-white border border-[#E5DED2] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614] focus:border-[#1C1614]"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Amount</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8278] font-medium text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full bg-white border border-[#E5DED2] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614] focus:border-[#1C1614]"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Paid by</label>
                <div className="mt-1.5 border border-[#E5DED2] rounded-xl px-3.5 py-2.5 bg-[#F6F3ED] text-sm text-[#1C1614] font-medium">
                  {user?.name || user?.email || 'You'}
                  <span className="text-[#8E8278] ml-2 text-xs">(You)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Split Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setExpenseForm({ ...expenseForm, splitType: 'EQUAL', customShares: {} })}
                    className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                      expenseForm.splitType === 'EQUAL'
                        ? 'bg-[#1C1614] text-[#F6F3ED] border-[#1C1614] shadow-2xs'
                        : 'border-[#E5DED2] bg-white text-[#5E534B] hover:bg-[#ECE5DA]/50'
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseForm({ ...expenseForm, splitType: 'CUSTOM' })}
                    className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                      expenseForm.splitType === 'CUSTOM'
                        ? 'bg-[#1C1614] text-[#F6F3ED] border-[#1C1614] shadow-2xs'
                        : 'border-[#E5DED2] bg-white text-[#5E534B] hover:bg-[#ECE5DA]/50'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Members Participating</label>
                <div className="mt-1.5 border border-[#E5DED2] rounded-xl divide-y divide-[#E5DED2] bg-white overflow-hidden max-h-44 overflow-y-auto">
                  {members.map((m) => {
                    const selected = expenseForm.participantUserIds.includes(m.userId);
                    return (
                      <label
                        key={m.userId}
                        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[#F6F3ED]/60 transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleParticipantChange(m.userId)}
                            className="w-4 h-4 accent-[#1C1614] rounded cursor-pointer"
                          />
                          <p className="text-xs sm:text-sm font-semibold text-[#1C1614]">
                            {m.name}
                            {m.userId === user?.userId && (
                              <span className="text-xs text-[#8E8278] ml-1.5 font-normal">(You)</span>
                            )}
                          </p>
                        </div>
                        {expenseForm.splitType === 'EQUAL' && selected && (
                          <span className="text-xs font-semibold text-[#5E534B]">
                            ₹{equalShare.toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {expenseForm.splitType === 'CUSTOM' && selectedMembers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#5E534B]">Custom Amounts</label>
                  <div className="mt-1.5 space-y-2 max-h-40 overflow-y-auto">
                    {selectedMembers.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2.5">
                        <div className="flex-1 border border-[#E5DED2] rounded-xl px-3 py-2 text-xs sm:text-sm bg-[#F6F3ED] text-[#1C1614] font-medium truncate">
                          {m.name}
                        </div>
                        <div className="relative w-28 sm:w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8278] text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-white border border-[#E5DED2] rounded-xl pl-7 pr-2.5 py-2 text-xs sm:text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614]"
                            value={expenseForm.customShares[m.userId] || ''}
                            onChange={(e) => handleCustomShareChange(m.userId, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`mt-2.5 flex justify-between text-xs px-3 py-2 rounded-xl border ${
                      Math.abs(customTotal - Number(expenseForm.amount || 0)) < 0.01
                        ? 'bg-[#EDF4F0] text-[#1B5441] border-[#C6DDD2] font-semibold'
                        : 'bg-[#FDF3EB] text-[#963C13] border-[#F6D2BD]'
                    }`}
                  >
                    <span>Split Total</span>
                    <span className="font-bold">
                      ₹{customTotal.toFixed(2)} / ₹{Number(expenseForm.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {expenseError && (
                <p className="text-xs text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-xl px-3.5 py-2.5">
                  {expenseError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 border border-[#E5DED2] hover:bg-[#ECE5DA]/60 text-[#5E534B] font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="flex-1 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-xs"
                >
                  {addingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Edit Expense Modal */}
      {/* ========================================================================= */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-md rounded-2xl shadow-2xl my-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1C1614]">Edit Expense</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">Modify expense details and split calculation.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#ECE5DA] text-[#5E534B] flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Expense Name</label>
                <input
                  type="text"
                  required
                  className="w-full mt-1.5 bg-white border border-[#E5DED2] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614] focus:border-[#1C1614]"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Amount</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8278] font-medium text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full bg-white border border-[#E5DED2] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614] focus:border-[#1C1614]"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Split Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, splitType: 'EQUAL', customShares: {} })}
                    className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                      editForm.splitType === 'EQUAL'
                        ? 'bg-[#1C1614] text-[#F6F3ED] border-[#1C1614] shadow-2xs'
                        : 'border-[#E5DED2] bg-white text-[#5E534B] hover:bg-[#ECE5DA]/50'
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, splitType: 'CUSTOM' })}
                    className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                      editForm.splitType === 'CUSTOM'
                        ? 'bg-[#1C1614] text-[#F6F3ED] border-[#1C1614] shadow-2xs'
                        : 'border-[#E5DED2] bg-white text-[#5E534B] hover:bg-[#ECE5DA]/50'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5E534B]">Members Participating</label>
                <div className="mt-1.5 border border-[#E5DED2] rounded-xl divide-y divide-[#E5DED2] bg-white overflow-hidden max-h-44 overflow-y-auto">
                  {members.map((m) => {
                    const selected = editForm.participantUserIds.includes(m.userId);
                    return (
                      <label
                        key={m.userId}
                        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[#F6F3ED]/60 transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleEditParticipantChange(m.userId)}
                            className="w-4 h-4 accent-[#1C1614] rounded cursor-pointer"
                          />
                          <p className="text-xs sm:text-sm font-semibold text-[#1C1614]">
                            {m.name}
                            {m.userId === user?.userId && (
                              <span className="text-xs text-[#8E8278] ml-1.5 font-normal">(You)</span>
                            )}
                          </p>
                        </div>
                        {editForm.splitType === 'EQUAL' && selected && (
                          <span className="text-xs font-semibold text-[#5E534B]">
                            ₹{editEqualShare.toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {editForm.splitType === 'CUSTOM' && selectedEditMembers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[#5E534B]">Custom Amounts</label>
                  <div className="mt-1.5 space-y-2 max-h-40 overflow-y-auto">
                    {selectedEditMembers.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2.5">
                        <div className="flex-1 border border-[#E5DED2] rounded-xl px-3 py-2 text-xs sm:text-sm bg-[#F6F3ED] text-[#1C1614] font-medium truncate">
                          {m.name}
                        </div>
                        <div className="relative w-28 sm:w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8278] text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-white border border-[#E5DED2] rounded-xl pl-7 pr-2.5 py-2 text-xs sm:text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614]"
                            value={editForm.customShares[m.userId] || ''}
                            onChange={(e) => handleEditCustomShareChange(m.userId, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`mt-2.5 flex justify-between text-xs px-3 py-2 rounded-xl border ${
                      Math.abs(editCustomTotal - Number(editForm.amount || 0)) < 0.01
                        ? 'bg-[#EDF4F0] text-[#1B5441] border-[#C6DDD2] font-semibold'
                        : 'bg-[#FDF3EB] text-[#963C13] border-[#F6D2BD]'
                    }`}
                  >
                    <span>Split Total</span>
                    <span className="font-bold">
                      ₹{editCustomTotal.toFixed(2)} / ₹{Number(editForm.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {editError && (
                <p className="text-xs text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-xl px-3.5 py-2.5">
                  {editError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-[#E5DED2] hover:bg-[#ECE5DA]/60 text-[#5E534B] font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingExpense}
                  className="flex-1 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-xs"
                >
                  {updatingExpense ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Delete Confirmation Dialog */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingExpense && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF3EB] text-[#963C13] flex items-center justify-center border border-[#F6D2BD]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1614]">Delete this expense?</h3>
              <p className="text-xs text-[#5E534B] mt-1.5 leading-relaxed">
                Deleting <strong className="text-[#1C1614]">{deletingExpense.description}</strong> (₹{Number(deletingExpense.amount).toFixed(2)}) will also remove its effect on group balances.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-[#E5DED2] hover:bg-[#ECE5DA]/60 text-[#5E534B] font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={deleting}
                className="flex-1 bg-[#963C13] hover:bg-[#7D320F] text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Settle / Record Payment Confirmation Modal */}
      {/* ========================================================================= */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#1C1614]">Record Payment</h3>
              <p className="text-xs text-[#5E534B] mt-1">
                Record that a payment has been completed outside the app.
              </p>
            </div>

            {/* Payment Summary Box */}
            <div className="p-4 rounded-xl bg-white border border-[#E5DED2] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5E534B] font-medium">From</span>
                <span className="font-bold text-[#1C1614]">
                  {settleData.fromUserId === user?.userId ? 'You' : settleData.fromUserName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5E534B] font-medium">To</span>
                <span className="font-bold text-[#1C1614]">
                  {settleData.toUserId === user?.userId ? 'You' : settleData.toUserName}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5DED2] flex items-center justify-between">
                <span className="text-xs text-[#5E534B] font-medium">Amount</span>
                <span className="text-lg font-extrabold text-[#1C1614]">
                  ₹{Number(settleData.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8E8278] leading-tight">
              Note: ExpenseSplitter does not process actual bank transfers. This records that the settlement occurred.
            </p>

            {settleError && (
              <p className="text-xs text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-xl p-2.5">
                {settleError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="flex-1 border border-[#E5DED2] hover:bg-[#ECE5DA]/60 text-[#5E534B] font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={recordingSettlement}
                className="flex-1 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-xs"
              >
                {recordingSettlement ? 'Recording...' : 'Mark as paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: View All Members Modal */}
      {/* ========================================================================= */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1C1614]">Group Members</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">{members.length} members in this group</p>
              </div>
              <button
                onClick={() => setShowAllMembersModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#ECE5DA] text-[#5E534B] flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-80 overflow-y-auto divide-y divide-[#E5DED2]/60">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#ECE5DA] text-[#1C1614] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D6CCC0]">
                      {m.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1C1614] truncate">
                        {m.name}
                        {m.userId === user?.userId && (
                          <span className="text-xs text-[#8E8278] ml-1.5 font-normal">(You)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-[#ECE5DA]/60 text-[#5E534B] border border-[#D6CCC0]/40">
                    {m.roleInGroup}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#E5DED2] bg-[#F6F3ED]/40 flex gap-3">
              <button
                onClick={() => {
                  setShowAllMembersModal(false);
                  setShowAddMemberModal(true);
                }}
                className="w-full bg-[#1C1614] hover:bg-[#2D2521] text-[#F6F3ED] font-semibold py-2.5 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add new member</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Add Member Modal (From Friends or Email) */}
      {/* ========================================================================= */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DED2] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1C1614]">Add Member</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">Select from your friends list or invite by email.</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#ECE5DA] text-[#5E534B] flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Option A: Select From Friends */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8E8278] mb-2.5">
                  Select from Friends
                </p>
                {availableFriends.length === 0 ? (
                  <p className="text-xs text-[#5E534B] bg-white p-3 rounded-xl border border-[#E5DED2]">
                    All of your friends are already in this group, or you have not added friends yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableFriends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5DED2] shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#ECE5DA] text-[#1C1614] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D6CCC0]">
                            {f.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold text-[#1C1614] truncate">{f.name}</p>
                        </div>
                        <button
                          onClick={() => handleAddFriendToGroup(f)}
                          disabled={addingFriendId === f.id}
                          className="bg-[#1C1614] hover:bg-[#2D2521] text-[#F6F3ED] text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {addingFriendId === f.id ? 'Adding...' : '+ Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5DED2]"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold text-[#8E8278] uppercase tracking-wider">
                  Or by email
                </span>
                <div className="flex-grow border-t border-[#E5DED2]"></div>
              </div>

              {/* Option B: By Email */}
              <form onSubmit={handleAddMemberByEmail} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#5E534B]">Email Address</label>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    required
                    className="w-full mt-1.5 bg-white border border-[#E5DED2] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#1C1614] focus:border-[#1C1614]"
                    value={memberEmailForm}
                    onChange={(e) => setMemberEmailForm(e.target.value)}
                  />
                </div>

                {memberError && (
                  <p className="text-xs text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-xl px-3.5 py-2.5">
                    {memberError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 border border-[#E5DED2] hover:bg-[#ECE5DA]/60 text-[#5E534B] font-semibold py-2.5 rounded-xl text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="flex-1 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-xs"
                  >
                    {addingMember ? 'Adding...' : 'Add by Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}