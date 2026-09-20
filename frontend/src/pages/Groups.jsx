import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function Groups() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/groups');
      setGroups(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Group name is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const res = await axiosClient.post('/groups', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
      await fetchGroups();
      // Navigate directly to the newly created group
      if (res.data?.id) {
        navigate(`/groups/${res.data.id}`);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const formatBalance = (balance) => {
    if (balance === null || balance === undefined) {
      return null;
    }
    const num = Number(balance);
    if (isNaN(num)) return null;

    if (num > 0) {
      return {
        text: `You get ₹${num.toFixed(2)}`,
        style: 'bg-[#EDF4F0] text-[#1B5441] border-[#C6DDD2]',
        dot: 'bg-[#3A7D65]',
      };
    } else if (num < 0) {
      return {
        text: `You owe ₹${Math.abs(num).toFixed(2)}`,
        style: 'bg-[#FDF3EB] text-[#963C13] border-[#F6D2BD]',
        dot: 'bg-[#CB5F2A]',
      };
    } else {
      return {
        text: 'Settled',
        style: 'bg-[#EFECE6] text-[#59534E] border-[#DDD7CD]',
        dot: 'bg-[#8C847B]',
      };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1614] tracking-tight">
            Groups
          </h1>
          <p className="text-sm text-[#5E534B] mt-1">
            View and manage all your expense-splitting groups.
          </p>
        </div>

        <button
          id="open-create-group-btn"
          onClick={() => {
            setCreateError('');
            setCreateForm({ name: '', description: '' });
            setShowCreateModal(true);
          }}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 bg-[#254239] hover:bg-[#1B322B] active:bg-[#142520] text-white font-semibold text-sm rounded-full shadow-xs transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Group</span>
        </button>
      </div>

      {/* Search Bar */}
      {groups.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-10 bg-white border border-[#D6CCC0] rounded-full text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#254239] shadow-2xs transition-all placeholder:text-[#8E8278]"
          />
          <svg
            className="w-5 h-5 text-[#8E8278] absolute left-4 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-full text-[#8E8278] hover:text-[#1C1614] absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-[#FDF3EB] border border-[#F6D2BD] rounded-2xl text-[#963C13] text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5DED2] shadow-2xs">
          <div className="w-8 h-8 border-3 border-[#254239] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5E534B] text-sm">Loading your groups...</p>
        </div>
      ) : groups.length === 0 ? (
        /* Empty state: No groups */
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5DED2] shadow-2xs space-y-4">
          <div className="w-16 h-16 bg-[#EBF1EE] rounded-full flex items-center justify-center text-[#204439] mx-auto">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1C1614]">No groups yet</h3>
            <p className="text-[#5E534B] text-sm max-w-sm mx-auto mt-1">
              Create your first group to start splitting expenses with friends and roommates.
            </p>
          </div>
          <button
            onClick={() => {
              setCreateError('');
              setCreateForm({ name: '', description: '' });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#254239] hover:bg-[#1B322B] text-white font-semibold text-sm rounded-full shadow-xs transition-all"
          >
            Create Group
          </button>
        </div>
      ) : filteredGroups.length === 0 ? (
        /* Empty state: Search no match */
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5DED2] shadow-2xs space-y-2">
          <p className="text-base font-bold text-[#1C1614]">No groups found</p>
          <p className="text-[#5E534B] text-sm">
            No group matching &quot;{searchQuery}&quot; was found.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[#254239] hover:underline text-xs font-semibold mt-2 inline-block"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Groups Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const balanceInfo = formatBalance(group.userNetBalance);

            return (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="bg-white rounded-3xl p-6 border border-[#E5DED2] shadow-2xs hover:shadow-md hover:border-[#D6CCC0] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top row: Name & Arrow */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#1C1614] group-hover:text-[#254239] transition-colors line-clamp-1">
                      {group.name}
                    </h3>
                    <span className="text-[#8E8278] group-hover:text-[#254239] group-hover:translate-x-0.5 transition-all text-lg font-bold shrink-0">
                      ›
                    </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-[#5E534B] mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  {/* Meta: Member count */}
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium text-[#8E8278]">
                    <svg className="w-4 h-4 text-[#8E8278]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>
                      {group.memberCount !== undefined ? `${group.memberCount} members` : 'Members'}
                    </span>
                  </div>
                </div>

                {/* Bottom row: Balance status */}
                <div className="mt-5 pt-4 border-t border-[#E5DED2]/60 flex items-center justify-between">
                  {balanceInfo ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${balanceInfo.style}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${balanceInfo.dot}`} />
                      {balanceInfo.text}
                    </span>
                  ) : (
                    <span className="text-xs text-[#8E8278]">Created by {group.createdByName}</span>
                  )}

                  <span className="text-xs font-semibold text-[#254239] opacity-0 group-hover:opacity-100 transition-opacity">
                    View &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1614]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#E5DED2]">
            <div className="px-6 py-5 border-b border-[#E5DED2]/70 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#1C1614]">Create New Group</h3>
                <p className="text-xs text-[#5E534B] mt-0.5">Start splitting expenses with a new group.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#ECE5DA]/60 text-[#8E8278] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-[#FDF3EB] border border-[#F6D2BD] rounded-2xl text-[#963C13] text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1C1614] uppercase tracking-wider mb-2">
                  Group Name*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Trip, Flatmates, Dinner"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-12 px-5 bg-white border border-[#D6CCC0] rounded-full text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#254239] transition-all placeholder:text-[#8E8278]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1614] uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer vacation expenses"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full h-12 px-5 bg-white border border-[#D6CCC0] rounded-full text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#254239] transition-all placeholder:text-[#8E8278]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 border border-[#D6CCC0] hover:bg-[#FAF8F4] text-[#5E534B] font-semibold text-sm rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-12 bg-[#254239] hover:bg-[#1B322B] active:bg-[#142520] text-white font-semibold text-sm rounded-full shadow-xs transition-all disabled:opacity-60 flex items-center justify-center"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
