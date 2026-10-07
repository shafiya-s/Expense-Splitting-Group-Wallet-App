import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle cooldown countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Request OTP (Step 1 -> Step 2)
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await axiosClient.post('/auth/send-otp', { email: form.email });
      setSuccessMsg(res.data?.message || 'Verification code sent to your email.');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Signup with OTP (Step 2)
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.otp || form.otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/signup', form);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Create account' : 'Verify your email'}
      subtitle={
        step === 1
          ? 'Fill in your details to start splitting expenses effortlessly.'
          : `We sent a 6-digit code to ${form.email}. Enter it below to complete registration.`
      }
    >
      {error && (
        <div className="p-3.5 mb-6 text-xs sm:text-sm text-[#963C13] bg-[#FDF3EB] border border-[#F6D2BD] rounded-2xl flex items-center gap-2">
          <svg className="w-5 h-5 text-[#963C13] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-6 text-xs sm:text-sm text-[#254239] bg-[#EAF2ED] border border-[#C2DEC9] rounded-2xl flex items-center gap-2">
          <svg className="w-5 h-5 text-[#254239] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-3.5 sm:space-y-4">
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
            {loading ? 'Sending verification code...' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndSignup} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="signup-otp" className="block text-xs font-bold text-[#5E534B] uppercase tracking-wider">
                6-Digit Verification Code*
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-xs text-[#254239] font-medium hover:underline cursor-pointer"
              >
                Change Email
              </button>
            </div>
            <input
              id="signup-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              required
              autoFocus
              className="w-full h-12 px-5 text-center tracking-[0.35em] font-mono text-lg font-bold bg-white border border-[#E5DED2] rounded-xl text-[#1C1614] focus:outline-none focus:ring-2 focus:ring-[#1C1614] focus:border-transparent transition-all placeholder:text-[#8E8278]"
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            />
            <p className="mt-2 text-xs text-[#8E8278]">
              Code is valid for 5 minutes.
            </p>
          </div>

          <button
            id="otp-verify-submit"
            type="submit"
            disabled={loading || form.otp.length !== 6}
            className="w-full h-12 mt-2 bg-[#1C1614] hover:bg-[#2D2521] active:bg-[#140F0E] text-[#F6F3ED] font-semibold text-sm sm:text-base rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Verifying & creating account...' : 'Create Account'}
          </button>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#5E534B]">Didn't get the code?</span>
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={() => handleSendOtp()}
              className="text-xs font-semibold text-[#254239] hover:underline disabled:text-[#8E8278] disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

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