import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '@/services/api';
import { CopyrightFooter } from './ui';
import { ShieldCheck, RefreshCw } from 'lucide-react';

type Step = 'qr' | 'otp';

interface Props {
  onLogin: (token: string, user: { id: string; name: string; email: string; avatar: string; about: string; phone: string }) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [step, setStep] = useState<Step>('qr');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError('');
    try {
      const { email: userEmail } = await api.googleLogin(credentialResponse.credential);
      setEmail(userEmail);
      setStep('otp');
      startResendCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('أدخل الرمز المكوّن من 6 أرقام'); return; }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.verifyOtp(email, code);
      localStorage.setItem('zizo_token', token);
      onLogin(token, user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'رمز غير صحيح');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await api.resendOtp(email);
      startResendCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل إعادة الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-wa-tealDark to-wa-dark p-6">
      <div className="w-full max-w-xl bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-wa-tealDark px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.87L2 22l5.13-1.27C8.57 21.54 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            <h1 className="text-2xl font-semibold text-white">ZizoChat Web</h1>
          </div>
          <p className="text-white/70 text-sm">تواصل مع أصدقائك بأمان تام</p>
        </div>

        <div className="p-8">
          {step === 'qr' ? (
            <div className="flex flex-col items-center gap-6">
              <div>
                <h2 className="text-white text-center text-lg font-medium mb-1">تسجيل الدخول بجوجل</h2>
                <p className="text-white/60 text-center text-sm">سيتم إرسال رمز تحقق إلى بريدك الإلكتروني</p>
              </div>

              <div className="flex justify-center">
                {loading ? (
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('فشل تسجيل الدخول بجوجل')}
                    theme="outline"
                    shape="pill"
                    size="large"
                    text="signin_with"
                  />
                )}
              </div>

              {error && (
                <div className="w-full bg-red-500/20 border border-red-500/30 text-red-300 text-sm text-center rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 text-white/50 text-xs text-center">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>تطبيق تفاعلي تجريبي. بياناتك تبقى محفوظة على جوازك فقط ولا يتم إرسالها لأي خادم ZizoChat.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6" dir="rtl">
              <div className="text-center">
                <h2 className="text-white text-lg font-medium mb-1">أدخل رمز التحقق</h2>
                <p className="text-white/60 text-sm">تم إرسال رمز مكوّن من 6 أرقام إلى</p>
                <p className="text-wa-green font-medium text-sm mt-0.5">{email}</p>
              </div>

              {/* OTP Inputs */}
              <div className="flex gap-3 justify-center" dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 border-white/20 bg-white/10 text-white focus:border-wa-green focus:outline-none transition-colors"
                    style={{ height: '52px' }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="w-full bg-red-500/20 border border-red-500/30 text-red-300 text-sm text-center rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.join('').length < 6}
                className="w-full bg-wa-green hover:bg-wa-tealDark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تحقق من الرمز'}
              </button>

              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-wa-green hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `إعادة الإرسال (${resendCooldown}s)` : 'إعادة إرسال الرمز'}
                </button>
                <button
                  onClick={() => { setStep('qr'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-white/50 hover:text-white transition-colors text-xs"
                >
                  ← رجوع
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CopyrightFooter variant="login" />
    </div>
  );
}
