import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from './ui';
import type { Contact } from '@/types';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { getSocket } from '@/services/socket';

interface Props {
  open: boolean;
  type: 'voice' | 'video';
  contact: Contact;
  onClose: () => void;
  // For incoming calls
  incoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  callerSocketId?: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallModal({ open, type, contact, onClose, incoming = false, incomingOffer, callerSocketId }: Props) {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, []);

  const setupPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        const targetSid = callerSocketId ?? contact.id; // fallback for demo
        socket?.emit('call:ice-candidate', { targetSocketId: targetSid, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
      setStatus('connected');
      startTimer();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('ended');
      }
    };

    return pc;
  }, [callerSocketId, contact.id, startTimer]);

  // Set up socket listeners
  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    if (!socket) return;

    const onAnswered = async ({ answer, answererSocketId }: { answer: RTCSessionDescriptionInit; answererSocketId: string }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      // Store answerer socket id for ICE
      (pcRef.current as any)._answererSid = answererSocketId;
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) { console.warn('ICE add failed', e); }
    };

    const onEnded = () => { setStatus('ended'); cleanup(); setTimeout(onClose, 1500); };
    const onRejected = () => { setStatus('ended'); cleanup(); setTimeout(onClose, 1000); };

    socket.on('call:answered', onAnswered);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);

    return () => {
      socket.off('call:answered', onAnswered);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
    };
  }, [open, cleanup, onClose]);

  // Initiate or answer call
  useEffect(() => {
    if (!open) { cleanup(); setStatus('connecting'); setSeconds(0); return; }

    (async () => {
      try {
        const constraints = { audio: true, video: type === 'video' };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = setupPC();
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        const socket = getSocket();

        if (!incoming) {
          // Outgoing call
          setStatus('ringing');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('call:initiate', {
            targetUserId: contact.id,
            callType: type,
            offer,
          });
        } else if (incomingOffer && callerSocketId) {
          // Answering incoming call
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit('call:answer', { callerSocketId, answer });
          setStatus('connected');
          startTimer();
        }
      } catch (err: any) {
        console.error('Call setup error:', err);
        alert('تعذر الوصول إلى الكاميرا أو الميكروفون: ' + err.message);
        setStatus('ended');
        cleanup();
        onClose();
      }
    })();

    return cleanup;
  }, [open, type, incoming, incomingOffer, callerSocketId, contact.id, setupPC, cleanup, startTimer]);

  const hangUp = () => {
    const socket = getSocket();
    const targetSid = (pcRef.current as any)?._answererSid ?? callerSocketId;
    if (targetSid) socket?.emit('call:end', { targetSocketId: targetSid });
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(m => !m); }
    else setMuted(m => !m);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(c => !c); }
    else setCamOff(c => !c);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel = status === 'ringing' ? 'جاري الاتصال...'
    : status === 'connecting' ? 'جاري الاتصال...'
    : status === 'connected' ? fmt(seconds)
    : 'انتهت المكالمة';

  return (
    <Modal open={open} onClose={() => {}}>
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-80 overflow-hidden">
        {type === 'video' && status === 'connected' ? (
          /* Video grid */
          <div className="relative bg-black" style={{ minHeight: 280 }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-64 object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-2 left-2 w-20 h-28 object-cover rounded-lg border-2 border-white/30 ${camOff ? 'hidden' : ''}`} />
            {camOff && (
              <div className="absolute bottom-2 left-2 w-20 h-28 rounded-lg bg-gray-800 border-2 border-white/30 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-white/50" />
              </div>
            )}
          </div>
        ) : (
          /* Voice / ringing */
          <div className="flex flex-col items-center py-10 px-6">
            <img src={contact.avatar} alt={contact.name} className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white/20 mb-4" />
            <div className="text-white font-semibold text-lg">{contact.name}</div>
            <div className={`text-sm mt-1 ${status === 'connected' ? 'text-green-400' : 'text-white/60'}`}>
              {statusLabel}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-6 pt-4 bg-black/30">
          <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}>
            {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>

          {type === 'video' && (
            <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}>
              {camOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
            </button>
          )}

          <button onClick={hangUp} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg">
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {type === 'voice' && status === 'connected' && (
            <button className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-400" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
