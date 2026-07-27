import { useState } from 'react';
import { useApp } from '@/store';
import { CopyrightFooter } from './ui';
import { MessageCircle } from 'lucide-react';

export function LoginScreen() {
  const { login } = useApp();
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => login(), 1400);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-wa-tealDark to-wa-dark text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-auto scrollbar-thin">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-10 h-10 text-wa-light fill-wa-light/20" />
          <h1 className="text-2xl font-bold">ZizoChat Web</h1>
        </div>

        <div className="w-full max-w-5xl bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-10 flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex flex-col items-center gap-4 order-2 md:order-1">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-1">امسح رمز QR للدخول</h2>
              <p className="text-sm text-white/70 max-w-xs">افتح ZizoChat على هاتفك، اذهب إلى الإعدادات › الأجهزة المرتبطة › اربط جهازاً</p>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="relative bg-white rounded-2xl p-3 w-56 h-56 flex items-center justify-center group cursor-pointer transition-transform hover:scale-105"
              aria-label="محاكاة مسح رمز QR"
            >
              <FakeQR scanning={scanning} />
              {scanning ? (
                <div className="absolute inset-x-3 h-1 bg-wa-light rounded-full shadow-[0_0_12px_#25D366] animate-[slideUp_1.4s_ease-in-out_infinite_alternate]" style={{ animationName: 'scanLine' }} />
              ) : (
                <div className="absolute inset-0 rounded-2xl bg-wa-light/0 group-hover:bg-wa-light/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-xs bg-wa-dark/80 text-white px-3 py-1.5 rounded-full transition-opacity">
                    انقر للمسح المحاكاة
                  </span>
                </div>
              )}
            </button>
            <p className="text-xs text-white/50">اضغط على الرمز لمحاكاة الدخول</p>
          </div>

          <div className="flex-1 order-1 md:order-2 w-full">
            <h2 className="text-xl font-semibold mb-4">كيفية الربط مع الهاتف</h2>
            <ol className="space-y-3">
              {[
                'افتح تطبيق ZizoChat على هاتفك',
                'اضغط على القائمة (النقاط الثلاث) أعلى اليمين',
                'اختر "الأجهزة المرتبطة"',
                'اضغط على "ربط جهاز"',
                'وجّه كاميرا الهاتف نحو رمز QR على هذه الشاشة',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-wa-light/20 border border-wa-light/40 flex items-center justify-center text-sm font-semibold text-wa-light">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/90 leading-relaxed pt-1">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg flex items-start gap-2">
              <span className="text-yellow-300 text-sm">🔒</span>
              <p className="text-xs text-yellow-100/80 leading-relaxed">
                ZizoChat تطبيق تفاعلي تجريبي. بياناتك تبقى محفوظة محلياً على جهازك فقط ولا يتم إرسالها لأي خادم.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mt-4">
          <CopyrightFooter variant="login" />
        </div>
      </div>
    </div>
  );
}

function FakeQR({ scanning }: { scanning: boolean }) {
  const size = 21;
  const cells: boolean[][] = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) cells[r][c] = rnd() > 0.5;
  }
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
  };
  const isFinderInner = (r: number, c: number) => {
    const ring = (br: number, bc: number) => {
      const rr = r - br, cc = c - bc;
      if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return false;
      return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
    };
    return ring(0, 0) || ring(0, size - 7) || ring(size - 7, 0);
  };

  return (
    <div className={`relative w-full h-full grid ${scanning ? 'qr-shimmer' : ''}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells.flatMap((row, r) =>
        row.map((on, c) => {
          let fill = false;
          if (isFinder(r, c)) fill = isFinderInner(r, c);
          else fill = on;
          return <div key={`${r}-${c}`} className={fill ? 'bg-wa-dark' : 'bg-white'} />;
        })
      )}
    </div>
  );
}
