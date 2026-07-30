import { useState } from 'react';
import { api } from '@/services/api';
import { CopyrightFooter } from './ui';
import { Eye, EyeOff } from 'lucide-react';

type View = 'signin' | 'signup' | 'forgot';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [view, setView] = useState<View>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === 'signup') {
        const { token, user } = await api.signup({ name, email, password });
        localStorage.setItem('zizo_token', token);
        onLogin(token, user);
      } else if (view === 'signin') {
        const { token, user } = await api.signin({ email, password });
        localStorage.setItem('zizo_token', token);
        onLogin(token, user);
      } else if (view === 'forgot') {
        const res = await api.forgotPassword({ email, newPassword: password });
        alert(res.message);
        setView('signin');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ غير معروف');
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

      <div className="relative z-10 flex-1 flex justify-center pb-12 px-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden min-h-[400px] p-8">
          <h2 className="text-[#41525d] text-2xl font-light mb-6 text-center">
            {view === 'signin' && 'تسجيل الدخول'}
            {view === 'signup' && 'إنشاء حساب جديد'}
            {view === 'forgot' && 'استعادة كلمة المرور'}
          </h2>

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
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={view === 'forgot' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
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

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-[#00a884] hover:bg-[#017561] text-white font-medium py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                view === 'signin' ? 'دخول' : view === 'signup' ? 'إنشاء حساب' : 'تحديث كلمة المرور'
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm text-center text-[#667781]">
            {view === 'signin' && (
              <>
                <button onClick={() => setView('forgot')} className="hover:text-[#00a884] transition-colors">هل نسيت كلمة المرور؟</button>
                <button onClick={() => setView('signup')} className="hover:text-[#00a884] transition-colors">ليس لديك حساب؟ أنشئ حساباً الآن</button>
              </>
            )}
            {view === 'signup' && (
              <button onClick={() => setView('signin')} className="hover:text-[#00a884] transition-colors">لديك حساب بالفعل؟ سجل دخولك</button>
            )}
            {view === 'forgot' && (
              <button onClick={() => setView('signin')} className="hover:text-[#00a884] transition-colors">العودة لتسجيل الدخول</button>
            )}
          </div>
        </div>
      </div>
      
      <CopyrightFooter variant="login" />
    </div>
  );
}
