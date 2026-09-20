import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/users/profile');
      setProfile(res.data);
      setEditName(res.data.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setSaveError('Name cannot be empty');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const res = await axiosClient.put('/users/profile', { name: editName.trim() });
      setProfile(res.data);
      updateUser({ name: res.data.name });
      setSaveSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb / Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account information and connections.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess('')} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your profile...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-700 text-sm text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main User Card */}
          <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 text-white font-extrabold text-3xl flex items-center justify-center shadow-md mb-4 ring-4 ring-teal-50">
              {getInitials(profile?.name || user?.name)}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {profile?.name || user?.name}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 break-all">
              {profile?.email || user?.email}
            </p>

            <div className="mt-6 w-full pt-6 border-t border-slate-100 flex justify-around text-center">
              <div
                onClick={() => navigate('/friends')}
                className="cursor-pointer group p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <span className="block text-2xl font-extrabold text-teal-600 group-hover:scale-105 transition-transform">
                  {profile?.friendsCount || 0}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Friends
                </span>
              </div>
            </div>

            <div className="mt-6 w-full space-y-2">
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setEditName(profile?.name || '');
                  setIsEditing(true);
                }}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-full shadow-sm transition-all"
              >
                Edit Profile
              </button>
              <button
                id="view-friends-btn"
                onClick={() => navigate('/friends')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition-all"
              >
                View Friends
              </button>
            </div>
          </div>

          {/* Account Details & Metadata */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Account Details</h3>
                <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-100">
                  Active Member
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </p>
                  <p className="text-base font-semibold text-slate-800 mt-1">
                    {profile?.name}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </p>
                  <p className="text-base font-semibold text-slate-800 mt-1 break-all">
                    {profile?.email}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Member Since
                  </p>
                  <p className="text-base font-semibold text-slate-800 mt-1">
                    {formatDate(profile?.createdAt)}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    User ID
                  </p>
                  <p className="text-base font-semibold text-slate-800 mt-1">
                    #{profile?.id}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/80 text-xs text-teal-800 flex items-start gap-2.5">
                <svg className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Your profile details and name are shared across your split groups and friend connections.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update your display information.</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs">
                  {saveError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-12 px-5 bg-white border border-slate-300 rounded-full text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email (Cannot be changed)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full h-12 px-5 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-sm cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-12 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  id="save-profile-btn"
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-12 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm rounded-full shadow-md transition-all disabled:opacity-60 flex items-center justify-center"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
