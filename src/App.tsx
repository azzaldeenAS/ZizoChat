import { useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { LoginScreen } from '@/components/LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { CallModal } from '@/components/CallModal';
import { getContact } from '@/utils';
import { Phone, Video, X, Users } from 'lucide-react';
import type { ApiUser } from './services/api';

function Shell() {
  const {
    authed,
    activeChatId,
    loginWithToken,
    incomingCall,
    dismissIncomingCall,
    incomingGroupCall,
    dismissIncomingGroupCall,
    contacts,
  } = useApp();

  const [profileOpen, setProfileOpen] = useState(false);
  const [answeringCall, setAnsweringCall] = useState(false);
  const [answeringGroupCall, setAnsweringGroupCall] = useState(false);

  if (!authed) {
    return (
      <LoginScreen
        onLogin={(token: string, user: ApiUser) => loginWithToken(token, user)}
      />
    );
  }

  // Build caller contact for 1-to-1 incoming call
  const callerContact = incomingCall
    ? (getContact(incomingCall.callerId) ?? {
        id: incomingCall.callerId,
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
        about: '',
        phone: '',
        isGroup: false,
        isOnline: true,
        hasStatus: false,
      })
    : null;

  // Build group contact for group incoming call
  const groupCallContact = incomingGroupCall
    ? (contacts.find(c => c.id === incomingGroupCall.chatId) ?? {
        id: incomingGroupCall.chatId,
        name: incomingGroupCall.callerName + ' (مكالمة جماعية)',
        avatar: incomingGroupCall.callerAvatar,
        about: '',
        phone: '',
        isGroup: true,
        isOnline: true,
        hasStatus: false,
        members: [],
      })
    : null;

  return (
    <div
      data-app-shell
      dir="rtl"
      className="flex h-full w-full overflow-hidden bg-wa-panel px-safe dark:bg-wa-panelDark xl:mx-auto xl:max-w-[1600px] xl:shadow-2xl"
    >
      {/* Sidebar — full width on phones, fixed rail from md up */}
      <aside
        className={`${activeChatId ? 'hidden md:flex' : 'flex'} h-full w-full shrink-0 md:w-[34%] md:min-w-[300px] md:max-w-[380px] lg:max-w-[420px]`}
      >
        <Sidebar onOpenProfile={() => setProfileOpen(true)} />
      </aside>

      {/* Chat area */}
      <main className={`${activeChatId ? 'flex' : 'hidden md:flex'} h-full min-w-0 flex-1`}>
        <ChatArea />
      </main>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ─── Incoming 1-to-1 call banner ─── */}
      {incomingCall && !answeringCall && (
        <IncomingCallBanner
          name={incomingCall.callerName}
          subtitle={incomingCall.callType === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...'}
          isVideo={incomingCall.callType === 'video'}
          avatar={incomingCall.callerAvatar}
          onAccept={() => setAnsweringCall(true)}
          onReject={dismissIncomingCall}
        />
      )}

      {/* ─── Answer incoming 1-to-1 call ─── */}
      {answeringCall && incomingCall && callerContact && (
        <CallModal
          open
          type={incomingCall.callType}
          contact={callerContact}
          incoming
          incomingOffer={incomingCall.offer}
          callerSocketId={incomingCall.callerSocketId}
          onClose={() => {
            setAnsweringCall(false);
            dismissIncomingCall();
          }}
        />
      )}

      {/* ─── Incoming group call banner ─── */}
      {incomingGroupCall && !answeringGroupCall && (
        <IncomingCallBanner
          name={incomingGroupCall.callerName}
          subtitle={
            incomingGroupCall.callType === 'video'
              ? 'مكالمة فيديو جماعية واردة...'
              : 'مكالمة صوتية جماعية واردة...'
          }
          isVideo={incomingGroupCall.callType === 'video'}
          isGroup
          onAccept={() => setAnsweringGroupCall(true)}
          onReject={dismissIncomingGroupCall}
        />
      )}

      {/* ─── Answer incoming group call ─── */}
      {answeringGroupCall && incomingGroupCall && groupCallContact && (
        <CallModal
          open
          type={incomingGroupCall.callType}
          contact={groupCallContact}
          incoming
          isGroupCall
          groupChatId={incomingGroupCall.chatId}
          callerSocketId={incomingGroupCall.callerSocketId}
          onClose={() => {
            setAnsweringGroupCall(false);
            dismissIncomingGroupCall();
          }}
        />
      )}
    </div>
  );
}

// ─── Incoming call banner (shared by 1-to-1 and group calls) ─────────────────
function IncomingCallBanner({
  name,
  subtitle,
  avatar,
  isVideo,
  isGroup,
  onAccept,
  onReject,
}: {
  name: string;
  subtitle: string;
  avatar?: string;
  isVideo: boolean;
  isGroup?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl bg-wa-sidebarDark/95 px-3 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur animate-slide-up pb-safe sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[22rem] sm:-translate-x-1/2 sm:gap-4 sm:px-5 sm:py-4"
    >
      {isGroup || !avatar ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wa-light sm:h-12 sm:w-12">
          <Users className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
      ) : (
        <img src={avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-12 sm:w-12" />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white sm:text-base">{name}</div>
        <div className="truncate text-xs text-white/60 sm:text-sm">{subtitle}</div>
      </div>

      <button
        onClick={onAccept}
        aria-label="قبول المكالمة"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600 active:scale-95"
      >
        {isVideo ? <Video className="h-5 w-5 text-white" /> : <Phone className="h-5 w-5 text-white" />}
      </button>
      <button
        onClick={onReject}
        aria-label="رفض المكالمة"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600 active:scale-95"
      >
        <X className="h-5 w-5 text-white" />
      </button>
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
