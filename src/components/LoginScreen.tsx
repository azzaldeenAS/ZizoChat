import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '@/services/api';
import { CopyrightFooter } from './ui';
import { ShieldCheck, RefreshCw, MoreVertical, Settings } from 'lucide-react';

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
    <div className="h-screen w-screen flex flex-col bg-[#e1e1de] relative" dir="rtl">
      {/* WhatsApp Web Green Top Band */}
      <div className="absolute top-0 left-0 w-full h-[222px] bg-[#00a884] z-0"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-10 py-8">
        <svg viewBox="0 0 39 39" className="w-9 h-9 text-white" fill="currentColor">
          <path d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16s-7.2-16-16-16-16 7.2-16 16c0 2.8.7 5.6 2.2 8.1l.3.6-2.4 8.7 8.6-2.9zm8.7-25.5c7 0 12.7 5.7 12.7 12.7S26.4 32.7 19.4 32.7c-2.3 0-4.5-.6-6.5-1.7l-.5-.3-4.8 1.6 1.3-4.7-.3-.5c-1.2-2-1.8-4.2-1.8-6.5 0-7 5.7-12.7 12.7-12.7z" />
          <path d="M26.4 22c-.3-.2-2-.9-2.3-1-.3-.1-.5-.2-.7.2-.2.3-.9 1-1.1 1.2-.2.2-.4.3-.7.1s-1.4-.5-2.7-1.6c-1-1-1.7-2.1-1.9-2.4-.2-.3 0-.5.1-.6s.3-.3.4-.5c.2-.1.3-.3.4-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.1 1-1.1 2.6c0 1.5 1.1 3 1.3 3.3.2.3 2.2 3.4 5.3 4.7 2.4 1 3.2 1.1 4.3 1 .9-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.2-.1-.5-.2-.8-.4z" />
        </svg>
        <h1 className="text-sm font-semibold text-white uppercase tracking-wider">ZizoChat Web</h1>
      </div>

      <div className="relative z-10 flex-1 flex justify-center pb-12">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[1000px] flex flex-col overflow-hidden min-h-[400px]">
          {step === 'qr' ? (
            <div className="flex flex-col md:flex-row p-12 gap-12 flex-1">
              {/* Instructions Side */}
              <div className="flex-1">
                <h2 className="text-[#41525d] text-3xl font-light mb-10">استخدم ZizoChat على الكمبيوتر</h2>
                <ol className="text-[#3b4a54] text-lg leading-8 list-decimal list-inside space-y-4">
                  <li>افتح ZizoChat على هاتفك</li>
                  <li>اضغط على <strong>القائمة</strong> <MoreVertical className="inline w-5 h-5" /> أو <strong>الإعدادات</strong> <Settings className="inline w-5 h-5" /> واختر <strong>الأجهزة المرتبطة</strong></li>
                  <li>اضغط على <strong>ربط جهاز</strong></li>
                  <li>وجّه هاتفك نحو هذه الشاشة لمسح الرمز المربع</li>
                </ol>
                <div className="mt-12 text-[#00a884] text-sm hover:underline cursor-pointer">
                  هل تحتاج إلى مساعدة للبدء؟
                </div>
              </div>

              {/* QR Side */}
              <div className="flex flex-col items-center justify-start pt-2 relative">
                <div className="relative">
                  {/* Fake QR Image */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png" alt="QR Code" className="w-64 h-64 opacity-20 pointer-events-none" />
                  
                  {/* Overlaying Google Login */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100">
                    <p className="text-sm text-gray-600 mb-4 text-center font-medium">تسجيل الدخول الحقيقي أدناه</p>
                    {loading ? (
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-[#00a884] rounded-full animate-spin" />
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
                </div>

                {error && (
                  <div className="mt-4 w-full bg-red-50 border border-red-200 text-red-600 text-sm text-center rounded px-4 py-2">
                    {error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 h-full flex-1">
              <div className="text-center mb-8">
                <h2 className="text-[#41525d] text-2xl font-light mb-2">أدخل رمز التحقق</h2>
                <p className="text-[#667781]">تم إرسال رمز مكوّن من 6 أرقام إلى</p>
                <p className="text-[#00a884] font-medium mt-1">{email}</p>
              </div>

              {/* OTP Inputs */}
              <div className="flex gap-3 justify-center mb-8" dir="ltr">
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
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-gray-200 text-[#111b21] focus:border-[#00a884] focus:outline-none transition-colors"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-6 w-full max-w-sm bg-red-50 border border-red-200 text-red-600 text-sm text-center rounded px-4 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.join('').length < 6}
                className="w-full max-w-sm bg-[#00a884] hover:bg-[#017561] text-white font-medium py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6 shadow-sm"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'متابعة'}
              </button>

              <div className="flex items-center gap-6 text-sm">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#00a884] hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  {resendCooldown > 0 ? `إعادة الإرسال (${resendCooldown}s)` : 'إعادة إرسال الرمز'}
                </button>
                <button
                  onClick={() => { setStep('qr'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-[#667781] hover:text-[#111b21] transition-colors"
                >
                  العودة
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
