import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from './ui';
import type { Contact, GroupCallPeer } from '@/types';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone, Users } from 'lucide-react';
import { getSocket } from '@/services/socket';

interface Props {
  open: boolean;
  type: 'voice' | 'video';
  contact: Contact;
  onClose: () => void;
  incoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  callerSocketId?: string;
  // Group call mode
  isGroupCall?: boolean;
  groupChatId?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ─── 1-to-1 Call Modal ────────────────────────────────────────────────────────
export function CallModal({
  open,
  type,
  contact,
  onClose,
  incoming = false,
  incomingOffer,
  callerSocketId,
  isGroupCall = false,
  groupChatId,
}: Props) {
  if (isGroupCall && groupChatId) {
    return (
      <GroupCallModal
        open={open}
        type={type}
        contact={contact}
        chatId={groupChatId}
        onClose={onClose}
        incoming={incoming}
        incomingCallerId={callerSocketId}
      />
    );
  }

  return (
    <DirectCallModal
      open={open}
      type={type}
      contact={contact}
      onClose={onClose}
      incoming={incoming}
      incomingOffer={incomingOffer}
      callerSocketId={callerSocketId}
    />
  );
}

// ─── Direct 1-to-1 Call ───────────────────────────────────────────────────────
function DirectCallModal({
  open,
  type,
  contact,
  onClose,
  incoming,
  incomingOffer,
  callerSocketId,
}: {
  open: boolean;
  type: 'voice' | 'video';
  contact: Contact;
  onClose: () => void;
  incoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  callerSocketId?: string;
}) {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answererSidRef = useRef<string | null>(null);

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
      if (!e.candidate) return;
      const socket = getSocket();
      const targetSid = answererSidRef.current ?? callerSocketId ?? null;
      if (targetSid) {
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
  }, [callerSocketId, startTimer]);

  // Socket event listeners
  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    if (!socket) return;

    const onAnswered = async ({
      answer,
      answererSocketId,
    }: {
      answer: RTCSessionDescriptionInit;
      answererSocketId: string;
    }) => {
      answererSidRef.current = answererSocketId;
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE add failed', e);
      }
    };

    const onEnded = () => {
      setStatus('ended');
      cleanup();
      setTimeout(onClose, 1500);
    };

    const onRejected = () => {
      setStatus('ended');
      cleanup();
      setTimeout(onClose, 1000);
    };

    socket.on('call:answered', onAnswered);
    socket.on('call:ice-candidate', onIce);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);

    return () => {
      socket.off('call:answered', onAnswered);
      socket.off('call:ice-candidate', onIce);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
    };
  }, [open, cleanup, onClose]);

  // Initiate or answer the call
  useEffect(() => {
    if (!open) {
      cleanup();
      setStatus('connecting');
      setSeconds(0);
      return;
    }

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
          setStatus('ringing');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('call:initiate', {
            targetUserId: contact.id,
            callType: type,
            offer,
          });
        } else if (incomingOffer && callerSocketId) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hangUp = () => {
    const socket = getSocket();
    const targetSid = answererSidRef.current ?? callerSocketId;
    if (targetSid) socket?.emit('call:end', { targetSocketId: targetSid });
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    setMuted(m => !m);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    setCamOff(c => !c);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel =
    status === 'ringing' ? 'جاري الاتصال...'
    : status === 'connecting' ? 'جاري الاتصال...'
    : status === 'connected' ? fmt(seconds)
    : 'انتهت المكالمة';

  return (
    <Modal open={open} onClose={() => {}}>
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-80 overflow-hidden">
        {type === 'video' && status === 'connected' ? (
          <div className="relative bg-black" style={{ minHeight: 280 }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover"
            />
            {!camOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-2 left-2 w-20 h-28 object-cover rounded-lg border-2 border-white/30"
              />
            ) : (
              <>
                {/* Hidden local video needed for stream processing even when cam is off */}
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                <div className="absolute bottom-2 left-2 w-20 h-28 rounded-lg bg-gray-800 border-2 border-white/30 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-white/50" />
                </div>
              </>
            )}
            {/* Contact name overlay */}
            <div className="absolute top-2 right-2 bg-black/50 rounded px-2 py-0.5 text-white text-xs">
              {contact.name}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 px-6">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white/20 mb-4"
            />
            <div className="text-white font-semibold text-lg">{contact.name}</div>
            <div className={`text-sm mt-1 ${status === 'connected' ? 'text-green-400' : 'text-white/60'}`}>
              {statusLabel}
            </div>
            {/* Hidden local video for voice calls (to process audio tracks) */}
            {type === 'video' && <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />}
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-6 pt-4 bg-black/30">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            title={muted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
          >
            {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>

          {type === 'video' && (
            <button
              onClick={toggleCam}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
              title={camOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
            >
              {camOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
            </button>
          )}

          <button
            onClick={hangUp}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {type === 'voice' && status === 'connected' && (
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-400" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Group Call Modal (mesh WebRTC) ───────────────────────────────────────────
function GroupCallModal({
  open,
  type,
  contact,
  chatId,
  onClose,
  incoming,
  incomingCallerId,
}: {
  open: boolean;
  type: 'voice' | 'video';
  contact: Contact;
  chatId: string;
  onClose: () => void;
  incoming?: boolean;
  incomingCallerId?: string;
}) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [peers, setPeers] = useState<Map<string, GroupCallPeer>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // peerId → RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const startTimer = useCallback(() => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    localStreamRef.current = null;
    setPeers(new Map());
  }, []);

  // Create a new RTCPeerConnection for a specific peer
  const createPeerConnection = useCallback((
    peerId: string,
    peerSocketId: string,
    peerName: string,
    peerAvatar: string
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current.set(peerId, pc);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t => {
      pc.addTrack(t, localStreamRef.current!);
    });

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      getSocket()?.emit('group-call:peer-ice', {
        targetSocketId: peerSocketId,
        candidate: e.candidate,
      });
    };

    // Remote track
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      setPeers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(peerId);
        if (existing) {
          updated.set(peerId, { ...existing, stream });
        } else {
          updated.set(peerId, {
            peerId,
            socketId: peerSocketId,
            name: peerName,
            avatar: peerAvatar,
            stream,
            pc,
          });
        }
        return updated;
      });
      setStatus('connected');
      if (!timerRef.current) startTimer();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setPeers(prev => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
        pcsRef.current.delete(peerId);
        pc.close();
      }
    };

    // Register peer in state (stream comes later via ontrack)
    setPeers(prev => {
      const updated = new Map(prev);
      if (!updated.has(peerId)) {
        updated.set(peerId, { peerId, socketId: peerSocketId, name: peerName, avatar: peerAvatar, stream: null, pc });
      }
      return updated;
    });

    return pc;
  }, [startTimer]);

  // Socket event listeners
  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    if (!socket) return;

    // A new peer joined — we send them an offer
    const onPeerJoined = async ({
      peerId,
      peerSocketId,
      peerName,
      peerAvatar,
    }: {
      chatId: string;
      peerId: string;
      peerSocketId: string;
      peerName: string;
      peerAvatar: string;
    }) => {
      const pc = createPeerConnection(peerId, peerSocketId, peerName, peerAvatar);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('group-call:peer-offer', { targetSocketId: peerSocketId, offer, chatId });
    };

    // We received an offer from an existing peer — create answer
    const onPeerOffer = async ({
      fromSocketId,
      fromId,
      fromName,
      fromAvatar,
      offer,
    }: {
      fromSocketId: string;
      fromId: string;
      fromName: string;
      fromAvatar: string;
      offer: RTCSessionDescriptionInit;
      chatId: string;
    }) => {
      const pc = createPeerConnection(fromId, fromSocketId, fromName, fromAvatar);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('group-call:peer-answer', { targetSocketId: fromSocketId, answer, chatId });
    };

    // We received an answer to our offer
    const onPeerAnswer = async ({
      fromSocketId,
      fromId,
      answer,
    }: {
      fromSocketId: string;
      fromId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = pcsRef.current.get(fromId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // ICE candidate for a specific peer
    const onPeerIce = async ({
      fromSocketId,
      candidate,
    }: {
      fromSocketId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      // Find the PC whose peer has this socket ID
      for (const [, peer] of peers.entries()) {
        if (peer.socketId === fromSocketId) {
          const pc = pcsRef.current.get(peer.peerId);
          if (pc) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      // Also check by iterating pcsRef if peers state is stale
      for (const [peerId, pc] of pcsRef.current.entries()) {
        const peer = peers.get(peerId);
        if (peer?.socketId === fromSocketId) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* ignore */ }
          return;
        }
      }
    };

    // A peer left
    const onPeerLeft = ({ peerId }: { chatId: string; peerId: string }) => {
      pcsRef.current.get(peerId)?.close();
      pcsRef.current.delete(peerId);
      setPeers(prev => {
        const updated = new Map(prev);
        updated.delete(peerId);
        return updated;
      });
    };

    // Server told us who is already in the call (received right after we accept)
    const onExistingPeers = ({
      peers: existingPeers,
    }: {
      chatId: string;
      peers: { peerId: string; socketId: string; name: string; avatar: string }[];
    }) => {
      // Existing peers will send us offers, so we just register them so ICE routing works
      existingPeers.forEach(p => {
        setPeers(prev => {
          const updated = new Map(prev);
          if (!updated.has(p.peerId)) {
            updated.set(p.peerId, {
              peerId: p.peerId,
              socketId: p.socketId,
              name: p.name,
              avatar: p.avatar,
              stream: null,
              pc: null,
            });
          }
          return updated;
        });
      });
    };

    socket.on('group-call:peer-joined', onPeerJoined);
    socket.on('group-call:peer-offer', onPeerOffer);
    socket.on('group-call:peer-answer', onPeerAnswer);
    socket.on('group-call:peer-ice', onPeerIce);
    socket.on('group-call:peer-left', onPeerLeft);
    socket.on('group-call:existing-peers', onExistingPeers);

    return () => {
      socket.off('group-call:peer-joined', onPeerJoined);
      socket.off('group-call:peer-offer', onPeerOffer);
      socket.off('group-call:peer-answer', onPeerAnswer);
      socket.off('group-call:peer-ice', onPeerIce);
      socket.off('group-call:peer-left', onPeerLeft);
      socket.off('group-call:existing-peers', onExistingPeers);
    };
  }, [open, peers, chatId, createPeerConnection]);

  // Start the group call
  useEffect(() => {
    if (!open) {
      cleanup();
      setStatus('connecting');
      setSeconds(0);
      return;
    }

    (async () => {
      try {
        const constraints = { audio: true, video: type === 'video' };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const socket = getSocket();
        if (!socket) return;

        if (!incoming) {
          // Initiator: tell server to notify all group members
          const memberIds = contact.members?.map(m => m.id) ?? [];
          socket.emit('group-call:initiate', { chatId, callType: type, memberIds });
          setStatus('connected');
          startTimer();
        } else {
          // Non-initiator accepting the call: join the room
          socket.emit('group-call:accept', { chatId, callType: type });
          setStatus('connected');
          startTimer();
        }
      } catch (err: any) {
        console.error('Group call setup error:', err);
        alert('تعذر الوصول إلى الكاميرا أو الميكروفون: ' + err.message);
        setStatus('ended');
        cleanup();
        onClose();
      }
    })();

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hangUp = () => {
    getSocket()?.emit('group-call:leave', { chatId });
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    setMuted(m => !m);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    setCamOff(c => !c);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const peerList = [...peers.values()];

  return (
    <Modal open={open} onClose={() => {}}>
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: peerList.length > 1 ? 480 : 320, maxWidth: '95vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-white text-sm font-medium">{contact.name}</span>
          </div>
          <span className={`text-sm ${status === 'connected' ? 'text-green-400' : 'text-white/60'}`}>
            {status === 'connected' ? fmt(seconds) : 'جاري الاتصال...'}
          </span>
        </div>

        {/* Video grid */}
        {type === 'video' ? (
          <div className={`grid gap-1 p-2 bg-black ${
            peerList.length === 0 ? 'grid-cols-1' :
            peerList.length === 1 ? 'grid-cols-2' :
            peerList.length <= 3 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {/* Local video tile */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {!camOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <>
                  <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-white/30" />
                  </div>
                </>
              )}
              <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 text-white text-[10px]">
                أنت
              </div>
              {muted && (
                <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Remote peer tiles */}
            {peerList.map(peer => (
              <PeerVideoTile key={peer.peerId} peer={peer} />
            ))}

            {/* Empty slots hint */}
            {peerList.length === 0 && (
              <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center">
                <div className="text-white/40 text-sm text-center px-4">
                  في انتظار انضمام المشاركين...
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Voice call: avatar grid */
          <div className="p-4">
            <div className="flex flex-wrap justify-center gap-4 mb-2">
              {/* Self */}
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt="أنت"
                    className="w-14 h-14 rounded-full object-cover border-2 border-green-400"
                  />
                  {muted && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                      <MicOff className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-white/70 text-[10px]">أنت</span>
              </div>
              {/* Remote peers */}
              {peerList.map(peer => (
                <div key={peer.peerId} className="flex flex-col items-center gap-1">
                  <img
                    src={peer.avatar || `https://i.pravatar.cc/60?u=${peer.peerId}`}
                    alt={peer.name}
                    className={`w-14 h-14 rounded-full object-cover border-2 ${peer.stream ? 'border-green-400 animate-pulse' : 'border-white/20'}`}
                  />
                  <span className="text-white/70 text-[10px] truncate max-w-[60px]">{peer.name}</span>
                </div>
              ))}
              {/* Hidden video element for audio tracks */}
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
            </div>
            {peerList.length === 0 && (
              <p className="text-white/40 text-xs text-center mt-2">في انتظار انضمام المشاركين...</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-5 pt-3 bg-black/30">
          <button
            onClick={toggleMute}
            title={muted ? 'إلغاء الكتم' : 'كتم الصوت'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>

          {type === 'video' && (
            <button
              onClick={toggleCam}
              title={camOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {camOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
            </button>
          )}

          <button
            onClick={hangUp}
            title="مغادرة المكالمة"
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Remote peer video tile
function PeerVideoTile({ peer }: { peer: GroupCallPeer }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={peer.avatar || `https://i.pravatar.cc/80?u=${peer.peerId}`}
            alt={peer.name}
            className="w-12 h-12 rounded-full object-cover opacity-60"
          />
        </div>
      )}
      <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 text-white text-[10px]">
        {peer.name}
      </div>
    </div>
  );
}
