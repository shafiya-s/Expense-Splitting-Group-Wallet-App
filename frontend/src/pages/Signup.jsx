import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/signup', form);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Fill in your details to start splitting expenses effortlessly."
    >
      {error && (
        <div className="p-3.5 mb-6 text-xs sm:text-sm text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-2xl flex items-center gap-2">
          <svg className="w-5 h-5 text-[#963C13] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-xs font-bold text-[#5E534B] uppercase tracking-wider mb-2">
            Full Name*
          </label>
          <input
            id="signup-name"
            type="text"
            placeholder="Alex Johnson"
            required
            className="w-full h-12 px-5 bg-white border border-[#E5DED2] rounded-xl text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1614] focus:border-transparent transition-all placeholder:text-[#8E8278]"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-xs font-bold text-[#5E534B] uppercase tracking-wider mb-2">
            Email*
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="email@example.com"
            required
            className="w-full h-12 px-5 bg-white border border-[#E5DED2] rounded-xl text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1614] focus:border-transparent transition-all placeholder:text-[#8E8278]"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-xs font-bold text-[#5E534B] uppercase tracking-wider mb-2">
            Password*
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder="••••••••••••"
            required
            minLength={6}
            className="w-full h-12 px-5 bg-white border border-[#E5DED2] rounded-xl text-[#1C1614] text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1614] focus:border-transparent transition-all placeholder:text-[#8E8278]"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          id="signup-submit"
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold text-sm sm:text-base rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-xs sm:text-sm text-[#5E534B]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#254239] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}