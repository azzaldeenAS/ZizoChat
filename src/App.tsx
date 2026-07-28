import { useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { LoginScreen } from '@/components/LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { CallModal } from '@/components/CallModal';
import { getContact } from '@/utils';
import { Phone, Video, X } from 'lucide-react';
import type { ApiUser } from './services/api';

function Shell() {
  const { authed, activeChatId, loginWithToken, incomingCall, dismissIncomingCall } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [answeringCall, setAnsweringCall] = useState(false);

  if (!authed) {
    return (
      <LoginScreen
        onLogin={(token: string, user: ApiUser) => loginWithToken(token, user)}
      />
    );
  }

  const callerContact = incomingCall ? (getContact(incomingCall.callerId) ?? {
    id: incomingCall.callerId,
    name: incomingCall.callerName,
    avatar: incomingCall.callerAvatar,
    about: '', phone: '', isGroup: false, isOnline: true, hasStatus: false,
  }) : null;

  return (
    <div className="h-full w-full flex bg-wa-panel dark:bg-wa-panelDark" dir="rtl">
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] md:min-w-[340px] md:max-w-[450px] h-full`}>
        <Sidebar onOpenProfile={() => setProfileOpen(true)} />
      </div>
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
        <ChatArea />
      </div>
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Incoming call banner */}
      {incomingCall && !answeringCall && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-wa-sidebarDark shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 min-w-72 animate-slide-up">
          <img src={incomingCall.callerAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{incomingCall.callerName}</div>
            <div className="text-white/60 text-sm">
              {incomingCall.callType === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...'}
            </div>
          </div>
          <button
            onClick={() => setAnsweringCall(true)}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
          >
            {incomingCall.callType === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
          </button>
          <button
            onClick={dismissIncomingCall}
            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Answer incoming call modal */}
      {answeringCall && incomingCall && callerContact && (
        <CallModal
          open
          type={incomingCall.callType}
          contact={callerContact}
          incoming
          incomingOffer={incomingCall.offer}
          callerSocketId={incomingCall.callerSocketId}
          onClose={() => { setAnsweringCall(false); dismissIncomingCall(); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
