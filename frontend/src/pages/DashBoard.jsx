import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [groups, setGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupForm, setCreateGroupForm] = useState({ name: '', description: '' });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState('');

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [addExpenseForm, setAddExpenseForm] = useState({
    groupId: '',
    description: '',
    amount: '',
  });
  const [addingExpense, setAddingExpense] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format currency in Indian numbering system
  const formatAmount = (val) => {
    const num = Number(val || 0);
    if (isNaN(num)) return '0';
    if (Number.isInteger(num)) {
      return num.toLocaleString('en-IN');
    }
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format Date for Recent Activity
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return `Today, ${d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}`;
      }

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  // Fetch groups and aggregate expenses
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch user's groups
      const groupsRes = await axiosClient.get('/groups');
      const userGroups = groupsRes.data || [];
      setGroups(userGroups);

      // Set default groupId for Add Expense modal if available
      if (userGroups.length > 0 && !addExpenseForm.groupId) {
        setAddExpenseForm((prev) => ({ ...prev, groupId: String(userGroups[0].id) }));
      }

      // 2. Fetch expenses across all groups in parallel
      if (userGroups.length > 0) {
        const expensePromises = userGroups.map(async (grp) => {
          try {
            const expRes = await axiosClient.get(`/groups/${grp.id}/expenses`);
            const groupExpenses = expRes.data || [];
            return groupExpenses.map((exp) => ({
              ...exp,
              groupId: grp.id,
              groupName: grp.name,
            }));
          } catch {
            return [];
          }
        });

        const nestedExpenses = await Promise.all(expensePromises);
        const allExpenses = nestedExpenses.flat();

        // Sort descending by creation date
        allExpenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentExpenses(allExpenses);
      } else {
        setRecentExpenses([]);
      }
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, [addExpenseForm.groupId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived Totals
  const currentUserId = user?.userId || user?.id;

  // 1. Total user should receive across ALL groups
  const totalShouldReceive = useMemo(() => {
    return groups.reduce((sum, g) => {
      const net = Number(g.userNetBalance || 0);
      return net > 0 ? sum + net : sum;
    }, 0);
  }, [groups]);

  // 2. Total user needs to pay across ALL groups
  const totalNeedToPay = useMemo(() => {
    return groups.reduce((sum, g) => {
      const net = Number(g.userNetBalance || 0);
      return net < 0 ? sum + Math.abs(net) : sum;
    }, 0);
  }, [groups]);

  // 3. Total user paid across their own expenses
  const totalYouPaid = useMemo(() => {
    return recentExpenses.reduce((sum, exp) => {
      if (exp.paidById === currentUserId) {
        return sum + Number(exp.amount || 0);
      }
      return sum;
    }, 0);
  }, [recentExpenses, currentUserId]);

  // Create Group Handler
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createGroupForm.name.trim()) {
      setCreateGroupError('Group name is required');
      return;
    }
    setCreateGroupError('');
    setCreatingGroup(true);
    try {
      await axiosClient.post('/groups', createGroupForm);
      setCreateGroupForm({ name: '', description: '' });
      setShowCreateGroupModal(false);
      showToast('Group created successfully!');
      await fetchDashboardData();
    } catch (err) {
      setCreateGroupError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Add Expense Quick Action Handler
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!addExpenseForm.groupId) {
      setAddExpenseError('Please select a group');
      return;
    }
    const amount = parseFloat(addExpenseForm.amount);
    if (!amount || amount <= 0) {
      setAddExpenseError('Enter a valid positive amount');
      return;
    }
    if (!addExpenseForm.description.trim()) {
      setAddExpenseError('Expense description is required');
      return;
    }

    setAddExpenseError('');
    setAddingExpense(true);
    try {
      const membersRes = await axiosClient.get(`/groups/${addExpenseForm.groupId}/members`);
      const participantUserIds = (membersRes.data || []).map((m) => m.userId);

      if (participantUserIds.length === 0) {
        setAddExpenseError('Selected group has no members');
        setAddingExpense(false);
        return;
      }

      await axiosClient.post(`/groups/${addExpenseForm.groupId}/expenses`, {
        description: addExpenseForm.description.trim(),
        amount,
        splitType: 'EQUAL',
        participantUserIds,
      });

      setShowAddExpenseModal(false);
      setAddExpenseForm({
        groupId: groups[0]?.id ? String(groups[0].id) : '',
        description: '',
        amount: '',
      });
      showToast('Expense added successfully!');
      await fetchDashboardData();
    } catch (err) {
      setAddExpenseError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1614] text-[#FAF8F4] px-5 py-3 rounded-2xl shadow-xl text-sm font-medium border border-[#382F2A] flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4 text-[#C6DDD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* 1. WELCOME HEADER */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1614] tracking-tight">
          {getGreeting()}, {user?.name || 'Shafiya'} 👋
        </h1>
        <p className="text-sm sm:text-base text-[#5E534B]">
          Here's your group wallet overview.
        </p>
      </div>

      {/* 2. PERSONAL MONEY SUMMARY (3 Cards - Display Only) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: YOU SHOULD RECEIVE */}
        <div className="text-left rounded-2xl p-5 border bg-[#FAF8F4] border-[#E5DED2] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B5441]">
              YOU SHOULD RECEIVE
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                totalShouldReceive > 0 ? 'bg-[#1B5441]' : 'bg-[#B0A79E]'
              }`}
            />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1B5441] tracking-tight">
              ₹{formatAmount(totalShouldReceive)}
            </p>
            <p className="text-xs text-[#5E534B] mt-1">
              Across all your groups
            </p>
          </div>
        </div>

        {/* Card 2: YOU NEED TO PAY */}
        <div className="text-left rounded-2xl p-5 border bg-[#FAF8F4] border-[#E5DED2] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#963C13]">
              YOU NEED TO PAY
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                totalNeedToPay > 0 ? 'bg-[#963C13]' : 'bg-[#B0A79E]'
              }`}
            />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#963C13] tracking-tight">
              ₹{formatAmount(totalNeedToPay)}
            </p>
            <p className="text-xs text-[#5E534B] mt-1">
              Across all your groups
            </p>
          </div>
        </div>

        {/* Card 3: YOU PAID */}
        <div className="text-left rounded-2xl p-5 border bg-[#FAF8F4] border-[#E5DED2] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5E534B]">
              YOU PAID
            </span>
            <span className="w-2 h-2 rounded-full bg-[#8C847B]" />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1614] tracking-tight">
              ₹{formatAmount(totalYouPaid)}
            </p>
            <p className="text-xs text-[#5E534B] mt-1">
              Across your expenses
            </p>
          </div>
        </div>
      </section>

      {/* 3. QUICK ACTIONS */}
      <section className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-4 sm:p-5 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5E534B] mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            id="quick-add-expense-btn"
            onClick={() => {
              if (groups.length === 0) {
                setShowCreateGroupModal(true);
              } else {
                setAddExpenseError('');
                setShowAddExpenseModal(true);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#254239] hover:bg-[#1B322B] active:bg-[#142520] text-white text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            id="quick-create-group-btn"
            onClick={() => {
              setCreateGroupError('');
              setShowCreateGroupModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FAF8F4] hover:bg-[#ECE5DA] active:bg-[#E2D9CB] text-[#1C1614] border border-[#D6CCC0] text-sm font-semibold rounded-xl transition shadow-2xs cursor-pointer"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Create Group</span>
          </button>

          <button
            type="button"
            id="quick-add-friend-btn"
            onClick={() => navigate('/friends')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FAF8F4] hover:bg-[#ECE5DA] active:bg-[#E2D9CB] text-[#1C1614] border border-[#D6CCC0] text-sm font-semibold rounded-xl transition shadow-2xs cursor-pointer"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Add Friend</span>
          </button>
        </div>
      </section>

      {/* 4. TWO-COLUMN PREVIEW SECTION (Compact: Max 2 items each) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: YOUR GROUPS (Max 2 items) */}
        <section id="your-groups-section" className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1C1614] tracking-tight">Your Groups</h2>
            {groups.length > 2 && (
              <Link
                to="/groups"
                className="text-xs sm:text-sm font-semibold text-[#254239] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-4 animate-pulse h-20"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
              <p className="text-sm text-[#5E534B]">
                No groups yet. Create one to start splitting expenses.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="inline-block text-xs font-semibold bg-[#254239] text-white px-4 py-2 rounded-xl hover:bg-[#1B322B] transition"
              >
                + Create your first group
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {groups.slice(0, 2).map((group) => {
                const net = Number(group.userNetBalance || 0);

                let statusText = 'All settled';
                let statusBadgeClasses = 'bg-[#EFECE6] text-[#59534E] border-[#DDD7CD]';

                if (net > 0) {
                  statusText = `You should receive ₹${formatAmount(net)}`;
                  statusBadgeClasses = 'bg-[#EDF4F0] text-[#1B5441] border-[#C6DDD2]';
                } else if (net < 0) {
                  statusText = `You need to pay ₹${formatAmount(Math.abs(net))}`;
                  statusBadgeClasses = 'bg-[#FDF3EB] text-[#963C13] border-[#F6D2BD]';
                }

                return (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="bg-[#FAF8F4] hover:bg-[#F2ECE3] border border-[#E5DED2] hover:border-[#D6CCC0] rounded-2xl p-4 sm:p-4.5 flex items-center justify-between gap-3 cursor-pointer transition shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#1C1614] text-sm sm:text-base truncate group-hover:text-[#254239] transition-colors">
                        {group.name}
                      </h3>
                      <p className="text-xs text-[#5E534B] mt-0.5">
                        {group.memberCount || 1}{' '}
                        {Number(group.memberCount) === 1 ? 'member' : 'members'}
                      </p>
                      <div className="mt-2 inline-block">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusBadgeClasses}`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>
                    <div className="text-[#8E8278] group-hover:text-[#1C1614] transition-colors pr-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: RECENT ACTIVITY (Max 2 items) */}
        <section id="recent-activity-section" className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1C1614] tracking-tight">Recent Activity</h2>
            {recentExpenses.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  if (groups.length === 1) {
                    navigate(`/groups/${groups[0].id}`);
                  } else {
                    navigate('/groups');
                  }
                }}
                className="text-xs sm:text-sm font-semibold text-[#254239] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <span>→</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-4 animate-pulse h-20"
                />
              ))}
            </div>
          ) : recentExpenses.length === 0 ? (
            <div className="bg-[#FAF8F4] border border-[#E5DED2] rounded-2xl p-8 text-center space-y-2 shadow-2xs">
              <p className="text-sm text-[#5E534B]">
                No recent activity yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.slice(0, 2).map((exp) => {
                const isPaidByMe = exp.paidById === currentUserId;

                // Find user split if not paid by user
                let userSplitShare = null;
                if (!isPaidByMe && Array.isArray(exp.splits)) {
                  const mySplit = exp.splits.find((s) => s.userId === currentUserId);
                  if (mySplit && Number(mySplit.shareAmount) > 0) {
                    userSplitShare = Number(mySplit.shareAmount);
                  }
                }

                let activityStatus = `Paid by ${exp.paidByName || 'Member'}`;
                let statusClasses = 'text-[#5E534B]';

                if (isPaidByMe) {
                  activityStatus = `You paid ₹${formatAmount(exp.amount)}`;
                  statusClasses = 'text-[#1B5441] font-semibold';
                } else if (userSplitShare !== null) {
                  activityStatus = `You need to pay ₹${formatAmount(userSplitShare)}`;
                  statusClasses = 'text-[#963C13] font-semibold';
                }

                return (
                  <div
                    key={exp.id}
                    onClick={() => navigate(`/groups/${exp.groupId}`)}
                    className="bg-[#FAF8F4] hover:bg-[#F2ECE3] border border-[#E5DED2] hover:border-[#D6CCC0] rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold text-[#1C1614] text-sm sm:text-base truncate group-hover:text-[#254239] transition-colors">
                          {exp.description}
                        </h3>
                        <span className="text-[11px] text-[#8E8278] shrink-0 font-medium">
                          {formatDate(exp.createdAt)}
                        </span>
                      </div>

                      <p className={`text-xs sm:text-sm ${statusClasses}`}>
                        {activityStatus}
                      </p>

                      <p className="text-xs text-[#5E534B] truncate">
                        {exp.groupName}
                      </p>
                    </div>

                    <div className="text-[#8E8278] group-hover:text-[#1C1614] transition-colors self-center pr-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =========================================================
          CREATE GROUP MODAL
         ========================================================= */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1C1614]">Create a new group</h3>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="text-[#8E8278] hover:text-[#1C1614] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createGroupError && (
              <div className="bg-[#FDF3EB] border border-[#F6D2BD] text-[#963C13] text-xs sm:text-sm rounded-xl p-3">
                {createGroupError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5E534B] mb-1">
                  Group name *
                </label>
                <input
                  id="modal-group-name"
                  type="text"
                  placeholder="e.g. Goa Trip, Flatmates"
                  required
                  value={createGroupForm.name}
                  onChange={(e) =>
                    setCreateGroupForm({ ...createGroupForm, name: e.target.value })
                  }
                  className="w-full bg-[#FFFFFF] border border-[#D6CCC0] focus:border-[#254239] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] placeholder-[#8E8278] focus:outline-none focus:ring-1 focus:ring-[#254239]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E534B] mb-1">
                  Description (optional)
                </label>
                <input
                  id="modal-group-desc"
                  type="text"
                  placeholder="e.g. Shared expenses for summer vacation"
                  value={createGroupForm.description}
                  onChange={(e) =>
                    setCreateGroupForm({ ...createGroupForm, description: e.target.value })
                  }
                  className="w-full bg-[#FFFFFF] border border-[#D6CCC0] focus:border-[#254239] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] placeholder-[#8E8278] focus:outline-none focus:ring-1 focus:ring-[#254239]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5E534B] hover:bg-[#ECE5DA] rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="px-5 py-2.5 bg-[#254239] hover:bg-[#1B322B] text-white text-sm font-semibold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {creatingGroup ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          ADD EXPENSE MODAL
         ========================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF8F4] border border-[#E5DED2] rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1C1614]">Add an Expense</h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="text-[#8E8278] hover:text-[#1C1614] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addExpenseError && (
              <div className="bg-[#FDF3EB] border border-[#F6D2BD] text-[#963C13] text-xs sm:text-sm rounded-xl p-3">
                {addExpenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5E534B] mb-1">
                  Select Group *
                </label>
                <select
                  id="modal-expense-group"
                  required
                  value={addExpenseForm.groupId}
                  onChange={(e) =>
                    setAddExpenseForm({ ...addExpenseForm, groupId: e.target.value })
                  }
                  className="w-full bg-[#FFFFFF] border border-[#D6CCC0] focus:border-[#254239] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] focus:outline-none focus:ring-1 focus:ring-[#254239]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E534B] mb-1">
                  Description *
                </label>
                <input
                  id="modal-expense-desc"
                  type="text"
                  placeholder="e.g. Dinner, Groceries, Movie tickets"
                  required
                  value={addExpenseForm.description}
                  onChange={(e) =>
                    setAddExpenseForm({ ...addExpenseForm, description: e.target.value })
                  }
                  className="w-full bg-[#FFFFFF] border border-[#D6CCC0] focus:border-[#254239] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] placeholder-[#8E8278] focus:outline-none focus:ring-1 focus:ring-[#254239]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E534B] mb-1">
                  Amount (₹) *
                </label>
                <input
                  id="modal-expense-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                  value={addExpenseForm.amount}
                  onChange={(e) =>
                    setAddExpenseForm({ ...addExpenseForm, amount: e.target.value })
                  }
                  className="w-full bg-[#FFFFFF] border border-[#D6CCC0] focus:border-[#254239] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1614] placeholder-[#8E8278] focus:outline-none focus:ring-1 focus:ring-[#254239]"
                />
              </div>

              <div className="bg-[#EDF4F0] border border-[#C6DDD2] rounded-xl p-3 text-xs text-[#1B5441]">
                💡 This will be split equally among all members of the selected group.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-[#5E534B] hover:bg-[#ECE5DA] rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="px-5 py-2.5 bg-[#254239] hover:bg-[#1B322B] text-white text-sm font-semibold rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {addingExpense ? 'Adding…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}