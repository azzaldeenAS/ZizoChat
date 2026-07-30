import { useState } from 'react';
import { api } from '@/services/api';
import { CopyrightFooter } from './ui';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

type View = 'signin' | 'signup' | 'forgot' | 'verify-signup' | 'verify-forgot-code' | 'reset-password';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [view, setView] = useState<View>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    try {
      const { token, user } = await api.googleLogin(credentialResponse.credential);
      localStorage.setItem('zizo_token', token);
      onLogin(token, user);
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الدخول بجوجل');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === 'signup') {
        await api.signup({ name, email, password });
        setCode(['', '', '', '', '', '']);
        setView('verify-signup');
      } else if (view === 'signin') {
        const { token, user } = await api.signin({ email, password });
        localStorage.setItem('zizo_token', token);
        onLogin(token, user);
      } else if (view === 'forgot') {
        await api.forgotPassword({ email });
        setCode(['', '', '', '', '', '']);
        setView('verify-forgot-code');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return alert('أدخل الرمز كاملاً');
    
    if (view === 'verify-forgot-code') {
      setView('reset-password');
      return;
    }

    setLoading(true);
    try {
      if (view === 'verify-signup') {
        const { token, user } = await api.signupVerify({ email, code: fullCode });
        localStorage.setItem('zizo_token', token);
        onLogin(token, user);
      }
    } catch (err: any) {
      alert(err.message || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert('كلمتا المرور غير متطابقتين');
    setLoading(true);
    try {
      const fullCode = code.join('');
      const res = await api.forgotPasswordVerify({ email, code: fullCode, newPassword: password });
      alert(res.message);
      setView('signin');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#e1e1de] relative" dir="rtl">
      <div className="absolute top-0 left-0 w-full h-[222px] bg-[#00a884] z-0"></div>
      
      <div className="relative z-10 flex items-center gap-3 px-10 py-8">
        <svg viewBox="0 0 39 39" className="w-9 h-9 text-white" fill="currentColor">
          <path d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16s-7.2-16-16-16-16 7.2-16 16c0 2.8.7 5.6 2.2 8.1l.3.6-2.4 8.7 8.6-2.9zm8.7-25.5c7 0 12.7 5.7 12.7 12.7S26.4 32.7 19.4 32.7c-2.3 0-4.5-.6-6.5-1.7l-.5-.3-4.8 1.6 1.3-4.7-.3-.5c-1.2-2-1.8-4.2-1.8-6.5 0-7 5.7-12.7 12.7-12.7z" />
          <path d="M26.4 22c-.3-.2-2-.9-2.3-1-.3-.1-.5-.2-.7.2-.2.3-.9 1-1.1 1.2-.2.2-.4.3-.7.1s-1.4-.5-2.7-1.6c-1-1-1.7-2.1-1.9-2.4-.2-.3 0-.5.1-.6s.3-.3.4-.5c.2-.1.3-.3.4-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.1 1-1.1 2.6c0 1.5 1.1 3 1.3 3.3.2.3 2.2 3.4 5.3 4.7 2.4 1 3.2 1.1 4.3 1 .9-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.2-.1-.5-.2-.8-.4z" />
        </svg>
        <h1 className="text-sm font-semibold text-white uppercase tracking-wider">ZizoChat Web</h1>
      </div>

      <div className="relative z-10 flex-1 flex justify-center pb-12 px-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden p-8 h-fit">
          
          {(view === 'signin' || view === 'signup') && (
            <>
              <div className="flex justify-center mb-6">
                {loading ? (
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-[#00a884] rounded-full animate-spin" />
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => alert('فشل تسجيل الدخول بجوجل')}
                    theme="outline"
                    shape="pill"
                    size="large"
                    text="signin_with"
                  />
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <div className="text-gray-400 text-sm">أو</div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <div className="flex w-full bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setView('signin')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'signin' ? 'bg-white shadow text-[#00a884]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => setView('signup')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${view === 'signup' ? 'bg-white shadow text-[#00a884]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  إنشاء حساب
                </button>
              </div>
            </>
          )}

          {view === 'forgot' && (
            <h2 className="text-[#41525d] text-2xl font-light mb-6 text-center">استعادة كلمة المرور</h2>
          )}
          
          {(view === 'verify-signup' || view === 'verify-forgot-code') && (
            <div className="text-center mb-8">
              <h2 className="text-[#41525d] text-2xl font-light mb-2">أدخل رمز التحقق</h2>
              <p className="text-[#667781]">تم إرسال رمز مكوّن من 6 أرقام إلى</p>
              <p className="text-[#00a884] font-medium mt-1">{email}</p>
            </div>
          )}

          {view === 'reset-password' && (
            <h2 className="text-[#41525d] text-2xl font-light mb-6 text-center">تعيين كلمة المرور الجديدة</h2>
          )}

          {(view === 'signin' || view === 'signup' || view === 'forgot') && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {view === 'signup' && (
                <input
                  type="text"
                  placeholder="الاسم"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#00a884] transition-all"
                />
              )}
              
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#00a884] transition-all"
              />
              
              {(view === 'signin' || view === 'signup') && (
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="كلمة المرور"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#00a884] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-[#00a884] hover:bg-[#017561] text-white font-medium py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  view === 'signin' ? 'دخول' : view === 'signup' ? 'متابعة' : 'إرسال الرمز'
                )}
              </button>
            </form>
          )}

          {(view === 'verify-signup' || view === 'verify-forgot-code') && (
            <div className="flex flex-col items-center">
              <div className="flex gap-2 justify-center mb-6" dir="ltr">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-gray-200 text-[#111b21] focus:border-[#00a884] focus:outline-none transition-colors"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={submitOtp}
                disabled={loading || code.join('').length < 6}
                className="w-full max-w-sm bg-[#00a884] hover:bg-[#017561] text-white font-medium py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6 shadow-sm"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تأكيد الرمز'}
              </button>
            </div>
          )}

          {view === 'reset-password' && (
            <form onSubmit={submitResetPassword} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#00a884] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="تأكيد كلمة المرور"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#f0f2f5] text-[#111b21] rounded-lg px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#00a884] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-3.5 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-[#00a884] hover:bg-[#017561] text-white font-medium py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'حفظ كلمة المرور'}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-col gap-2 text-sm text-center text-[#667781]">
            {view === 'signin' && (
              <button onClick={() => setView('forgot')} className="hover:text-[#00a884] transition-colors">هل نسيت كلمة المرور؟</button>
            )}
            {(view === 'forgot' || view === 'verify-signup' || view === 'verify-forgot-code' || view === 'reset-password') && (
              <button onClick={() => { setView('signin'); setCode(['', '', '', '', '', '']); setPassword(''); }} className="hover:text-[#00a884] transition-colors">
                العودة لتسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </div>
      
      <CopyrightFooter variant="login" />
    </div>
  );
}
