import { useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { LoginScreen } from '@/components/LoginScreen';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { ProfileDrawer } from '@/components/ProfileDrawer';

function Shell() {
  const { authed, activeChatId } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!authed) return <LoginScreen />;

  return (
    <div className="h-full w-full flex bg-wa-panel dark:bg-wa-panelDark" dir="rtl">
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[30%] md:min-w-[340px] md:max-w-[450px] h-full`}>
        <Sidebar onOpenProfile={() => setProfileOpen(true)} />
      </div>
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
        <ChatArea />
      </div>
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
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
