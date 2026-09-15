import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch user's groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await axiosClient.get('/groups');
      setGroups(res.data);
    } catch {
      // silent
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await axiosClient.post('/groups', createForm);
      setCreateForm({ name: '', description: '' });
      await fetchGroups(); // refresh list
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ExpenseSplitter</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.name} ({user?.email})
          </span>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Create Group Form */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 mb-8 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Create a new group</h2>
          {createError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2 mb-3">
              {createError}
            </p>
          )}
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-3">
            <input
              id="group-name-input"
              type="text"
              placeholder="Group name (e.g. Goa Trip)"
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <input
              id="group-desc-input"
              type="text"
              placeholder="Description (optional)"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
            <button
              id="create-group-btn"
              type="submit"
              disabled={creating}
              className="self-start bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Group'}
            </button>
          </form>
        </section>

        {/* Groups List */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Your Groups</h2>

          {loadingGroups ? (
            <p className="text-sm text-gray-400">Loading groups…</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400">
              No groups yet. Create one above to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {groups.map((group) => (
                <li
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition shadow-sm"
                >
                  <div>
                    <p className="font-medium text-gray-800">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created by {group.createdByName}
                    </p>
                  </div>
                  <span className="text-gray-400 text-lg">›</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}