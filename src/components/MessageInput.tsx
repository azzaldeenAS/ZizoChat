import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store';
import type { Message } from '@/types';
import { uid } from '@/utils';
import { Smile, Paperclip, Mic, Send, X, Image, BarChart2, Loader2, StopCircle } from 'lucide-react';
import { api } from '@/services/api';

const EMOJIS = [
  '😀','😂','😍','😎','🥰','😭','😡','🤔','👍','👎',
  '❤️','🔥','🎉','😢','🙏','💪','👏','🤣','😊','😒',
];

// Normalize waveform array to exactly `targetBars` bars in the range [minH, maxH]
function normalizeWaveform(samples: number[], targetBars: number, minH = 4, maxH = 28): number[] {
  if (samples.length === 0) {
    return Array.from({ length: targetBars }, () => Math.floor(Math.random() * (maxH - minH)) + minH);
  }
  const result: number[] = [];
  const ratio = samples.length / targetBars;
  const maxVal = Math.max(...samples, 1);
  for (let i = 0; i < targetBars; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    const slice = samples.slice(start, Math.max(end, start + 1));
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const normalized = Math.round((avg / maxVal) * (maxH - minH)) + minH;
    result.push(Math.max(minH, Math.min(maxH, normalized)));
  }
  return result;
}

export function MessageInput({
  chatId,
  replyTo,
  onCancelReply,
}: {
  chatId: string;
  replyTo?: Message;
  onCancelReply: () => void;
}) {
  const { sendMessage, sendVoiceMessage, sendImageMessage, sendPoll } = useApp();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(chatId, t, replyTo?.id);
    setText('');
    onCancelReply();
    setShowEmoji(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // ─── REAL voice recording via MediaRecorder ─────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Set up AudioContext for real waveform sampling
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      waveformSamplesRef.current = [];
      setLiveWaveform([]);

      // Sample audio levels every 100ms to build waveform
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      waveformIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        // Average the lower-frequency bins (voice range)
        const binCount = Math.floor(dataArray.length / 4);
        let sum = 0;
        for (let i = 0; i < binCount; i++) sum += dataArray[i];
        const avg = sum / binCount;
        const barHeight = Math.max(4, Math.min(28, Math.round((avg / 255) * 28)));
        waveformSamplesRef.current.push(barHeight);
        // Show a sliding window of the last 32 bars in the UI
        setLiveWaveform([...waveformSamplesRef.current].slice(-32));
      }, 100);

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const dur = recordTimeRef.current || 1;
        const waveform = normalizeWaveform(waveformSamplesRef.current, 40);

        setUploading(true);
        try {
          const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
          const audioFile = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
          const url = await api.uploadFile(audioFile);
          sendVoiceMessage(chatId, dur, waveform, url, replyTo?.id);
          onCancelReply();
        } catch (err: any) {
          alert('فشل رفع الرسالة الصوتية: ' + err.message);
        } finally {
          setUploading(false);
        }
      };

      recorder.start(100); // collect data every 100ms

      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err: any) {
      alert('تعذر الوصول إلى الميكروفون: ' + err.message);
    }
  };

  // We need a ref for recordTime so onstop can read the final value
  const recordTimeRef = useRef(0);
  useEffect(() => { recordTimeRef.current = recordTime; }, [recordTime]);

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    setLiveWaveform([]);
    setRecordTime(0);
    // Trigger onstop → uploads and sends
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (waveformIntervalRef.current) { clearInterval(waveformIntervalRef.current); waveformIntervalRef.current = null; }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    // Override onstop so it doesn't send anything
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        recorder.stream?.getTracks().forEach(t => t.stop());
      };
      recorder.stop();
    }

    setRecording(false);
    setLiveWaveform([]);
    setRecordTime(0);
  };

  // ─── File upload (images & other files) ─────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadFile(file);
      sendImageMessage(chatId, url, undefined, replyTo?.id);
      onCancelReply();
    } catch (err: any) {
      alert('فشل رفع الملف: ' + err.message);
    } finally {
      setUploading(false);
      setShowAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitPoll = () => {
    const opts = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || opts.length < 2) return;
    sendPoll(chatId, pollQuestion.trim(), opts);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPoll(false);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="shrink-0 bg-wa-sidebar dark:bg-wa-sidebarDark border-t border-wa-border dark:border-wa-borderDark">

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-wa-hover dark:bg-wa-hoverDark border-b border-wa-border dark:border-wa-borderDark">
          <div className="flex-1 border-r-2 border-wa-light pr-2">
            <div className="text-xs font-semibold text-wa-light">
              {replyTo.senderName ?? replyTo.senderId}
            </div>
            <div className="text-xs text-wa-secondary dark:text-wa-secondaryDark truncate max-w-xs">
              {replyTo.text ?? (replyTo.type === 'voice' ? '🎤 رسالة صوتية' : replyTo.type === 'image' ? '📷 صورة' : '')}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 flex flex-wrap gap-1 border-b border-wa-border dark:border-wa-borderDark">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => { setText(t => t + e); inputRef.current?.focus(); }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Attach menu */}
      {showAttach && (
        <div className="px-4 py-2 flex gap-3 border-b border-wa-border dark:border-wa-borderDark">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.zip"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-1 text-xs text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-light transition-colors disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-wa-hover dark:bg-wa-hoverDark flex items-center justify-center">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
            </div>
            صورة / ملف
          </button>
          <button
            onClick={() => { setShowPoll(true); setShowAttach(false); }}
            className="flex flex-col items-center gap-1 text-xs text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-light transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-wa-hover dark:bg-wa-hoverDark flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            استطلاع
          </button>
        </div>
      )}

      {/* Poll creator */}
      {showPoll && (
        <div className="px-4 py-3 space-y-2 border-b border-wa-border dark:border-wa-borderDark">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-wa-text dark:text-wa-textDark">استطلاع رأي جديد</span>
            <button onClick={() => setShowPoll(false)} className="text-wa-secondary dark:text-wa-secondaryDark">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            dir="rtl"
            placeholder="السؤال..."
            value={pollQuestion}
            onChange={e => setPollQuestion(e.target.value)}
            className="w-full bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark text-sm rounded px-3 py-1.5 outline-none"
          />
          {pollOptions.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                dir="rtl"
                placeholder={`الخيار ${i + 1}`}
                value={o}
                onChange={e => setPollOptions(ops => ops.map((v, j) => j === i ? e.target.value : v))}
                className="flex-1 bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark text-sm rounded px-3 py-1.5 outline-none"
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() => setPollOptions(ops => ops.filter((_, j) => j !== i))}
                  className="text-wa-secondary dark:text-wa-secondaryDark"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 5 && (
            <button
              onClick={() => setPollOptions(ops => [...ops, ''])}
              className="text-xs text-wa-light"
            >
              + إضافة خيار
            </button>
          )}
          <button
            onClick={submitPoll}
            className="w-full bg-wa-light text-white rounded py-1.5 text-sm font-medium"
          >
            إرسال الاستطلاع
          </button>
        </div>
      )}

      {/* Live waveform while recording */}
      {recording && liveWaveform.length > 0 && (
        <div className="px-4 py-1 flex items-end gap-[2px] h-8 border-b border-wa-border dark:border-wa-borderDark">
          {liveWaveform.map((h, i) => (
            <div
              key={i}
              className="bg-red-500 rounded-full w-[3px] transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => { setShowEmoji(s => !s); setShowAttach(false); }}
          className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark transition-colors shrink-0"
        >
          <Smile className="w-6 h-6" />
        </button>
        <button
          onClick={() => { setShowAttach(s => !s); setShowEmoji(false); }}
          className="text-wa-secondary dark:text-wa-secondaryDark hover:text-wa-text dark:hover:text-wa-textDark transition-colors shrink-0"
        >
          <Paperclip className="w-6 h-6" />
        </button>

        {recording ? (
          <div className="flex-1 flex items-center gap-2 bg-wa-hover dark:bg-wa-hoverDark rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm text-wa-text dark:text-wa-textDark flex-1 font-mono">{fmt(recordTime)}</span>
            <button
              onClick={cancelRecording}
              className="text-wa-secondary dark:text-wa-secondaryDark text-xs hover:text-red-500 transition-colors"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            dir="rtl"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-wa-hover dark:bg-wa-hoverDark text-wa-text dark:text-wa-textDark placeholder-wa-secondary dark:placeholder-wa-secondaryDark text-sm rounded-full px-4 py-2 outline-none"
          />
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div className="shrink-0 w-10 h-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-wa-light animate-spin" />
          </div>
        )}

        {/* Send / record / stop button */}
        {!uploading && text.trim() ? (
          <button
            onClick={submit}
            className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white hover:bg-wa-tealDark transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : !uploading && recording ? (
          <button
            onClick={stopRecording}
            className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white hover:bg-wa-tealDark transition-colors"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        ) : !uploading ? (
          <button
            onClick={startRecording}
            className="shrink-0 w-10 h-10 rounded-full bg-wa-light flex items-center justify-center text-white hover:bg-wa-tealDark transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
