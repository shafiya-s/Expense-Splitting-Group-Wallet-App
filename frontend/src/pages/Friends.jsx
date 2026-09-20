import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

export default function Friends() {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'

  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await axiosClient.get('/friends');
      setFriends(res.data);
    } catch {
      // silent
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await axiosClient.get('/friends/requests');
      setRequests(res.data);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  // Handle Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axiosClient.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (receiverId) => {
    setActionLoadingId(receiverId);
    setActionMessage({ type: '', text: '' });
    try {
      await axiosClient.post('/friends/requests', { receiverId });
      setActionMessage({ type: 'success', text: 'Friend request sent successfully!' });
      // Update local search results
      setSearchResults((prev) =>
        prev.map((u) => (u.id === receiverId ? { ...u, relationshipStatus: 'PENDING_SENT' } : u))
      );
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send friend request',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActionLoadingId(requestId);
    setActionMessage({ type: '', text: '' });
    try {
      await axiosClient.post(`/friends/requests/${requestId}/accept`);
      setActionMessage({ type: 'success', text: 'Friend request accepted!' });
      await fetchRequests();
      await fetchFriends();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to accept friend request',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    setActionLoadingId(requestId);
    setActionMessage({ type: '', text: '' });
    try {
      await axiosClient.post(`/friends/requests/${requestId}/decline`);
      setActionMessage({ type: 'info', text: 'Friend request declined' });
      await fetchRequests();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to decline friend request',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    if (!window.confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      return;
    }

    setActionLoadingId(friendId);
    setActionMessage({ type: '', text: '' });
    try {
      await axiosClient.delete(`/friends/${friendId}`);
      setActionMessage({ type: 'info', text: `Removed ${friendName} from friends` });
      await fetchFriends();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to remove friend',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Friends
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect with friends to easily split expenses and track balances.
          </p>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage.text && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center justify-between transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : actionMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-slate-100 border border-slate-200 text-slate-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage({ type: '', text: '' })}
            className="text-xs font-semibold hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => {
            setActiveTab('friends');
            setActionMessage({ type: '', text: '' });
          }}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>My Friends</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'friends' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {friends.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('requests');
            setActionMessage({ type: '', text: '' });
          }}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Requests</span>
          {requests.length > 0 && (
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === 'requests' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
              }`}
            >
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('search');
            setActionMessage({ type: '', text: '' });
          }}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'search'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Find People</span>
        </button>
      </div>

      {/* Tab 1: My Friends */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loadingFriends ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Loading your friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No friends yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                  Search and connect with friends to easily split expenses together.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('search')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-full shadow-sm transition-all"
              >
                Find & Add Friends
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-bold text-base flex items-center justify-center shrink-0 border border-teal-100">
                      {getInitials(friend.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">
                        {friend.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {friend.email}
                      </p>
                      {friend.since && (
                        <p className="text-[11px] text-teal-600/80 font-medium mt-0.5">
                          Friends since {formatDate(friend.since)}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveFriend(friend.id, friend.name)}
                    disabled={actionLoadingId === friend.id}
                    title="Remove friend"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Incoming Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {loadingRequests ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Loading incoming requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-2">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">No pending friend requests</h3>
              <p className="text-slate-500 text-sm">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-bold text-base flex items-center justify-center shrink-0 border border-teal-100">
                      {getInitials(req.senderName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">
                        {req.senderName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {req.senderEmail}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sent {formatDate(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-full shadow-sm transition-all disabled:opacity-50"
                    >
                      {actionLoadingId === req.id ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      disabled={actionLoadingId === req.id}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition-all disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Find People */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email (e.g. John, alex@example.com)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-10 bg-white border border-slate-300 rounded-full text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-xs transition-all placeholder:text-slate-400"
              autoFocus
            />
            <svg
              className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
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
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {searching ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Searching users...</p>
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-2">
              <p className="text-base font-bold text-slate-900">No users found</p>
              <p className="text-slate-500 text-sm">
                No user matching &quot;{searchQuery}&quot; was found. Check the spelling or email address.
              </p>
            </div>
          ) : !searchQuery.trim() ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-2">
              <p className="text-base font-semibold text-slate-700">Search for people</p>
              <p className="text-slate-400 text-sm">
                Enter a person&apos;s name or registered email address to find them and send a friend request.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-bold text-base flex items-center justify-center shrink-0 border border-teal-100">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Relationship status CTA */}
                  <div>
                    {user.relationshipStatus === 'FRIENDS' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Friends
                      </span>
                    ) : user.relationshipStatus === 'PENDING_SENT' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Request Sent
                      </span>
                    ) : user.relationshipStatus === 'PENDING_RECEIVED' ? (
                      <button
                        onClick={() => {
                          setActiveTab('requests');
                          fetchRequests();
                        }}
                        className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-full border border-teal-200 transition-colors"
                      >
                        Respond in Requests
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        disabled={actionLoadingId === user.id}
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold rounded-full shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>{actionLoadingId === user.id ? 'Sending...' : 'Add Friend'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
