import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', form);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back!"
      subtitle="Enter your credentials to access your group wallet."
    >
      {error && (
        <div className="p-3 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Email*
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="email@example.com"
            required
            className="w-full h-12 px-5 bg-white border border-slate-300 rounded-full text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all placeholder:text-slate-400"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Password*
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••••••"
            required
            className="w-full h-12 px-5 bg-white border border-slate-300 rounded-full text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all placeholder:text-slate-400"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-base rounded-full shadow-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-teal-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}