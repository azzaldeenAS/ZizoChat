import type { Contact, Message, Chat } from './types';

export const CURRENT_USER = {
  id: 'me',
  name: 'أنا',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
  about: 'متاح',
  phone: '+967777320031',
};

const AV = (id: string) => `https://i.pravatar.cc/200?u=${id}`;
const IMG = (id: string, w = 600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'عائلة الرهمي 👨‍👩‍👧‍👦',
    avatar: IMG('1024311', 200),
    about: 'عائلتنا الجميلة',
    phone: '',
    isGroup: true,
    isOnline: true,
    hasStatus: false,
    members: [
      { id: 'c1m1', name: 'أبي عزالدين', avatar: AV('c1m1'), isAdmin: true, color: '#06CF9C' },
      { id: 'c1m2', name: 'أمي فاطمة', avatar: AV('c1m2'), isAdmin: true, color: '#E542A3' },
      { id: 'c1m3', name: 'أختي سارة', avatar: AV('c1m3'), isAdmin: false, color: '#F9B342' },
      { id: 'c1m4', name: 'أخي يوسف', avatar: AV('c1m4'), isAdmin: false, color: '#FF7547' },
    ],
  },
  {
    id: 'c2',
    name: 'أحمد المقطري',
    avatar: AV('c2'),
    about: 'مشغول',
    phone: '+967 771 234 567',
    isGroup: false,
    isOnline: true,
    hasStatus: true,
    lastSeen: 'متصل الآن',
  },
  {
    id: 'c3',
    name: 'محمد العمري',
    avatar: AV('c3'),
    about: 'في العمل',
    phone: '+967 778 980 123',
    isGroup: false,
    isOnline: false,
    hasStatus: false,
    lastSeen: 'آخر ظهور اليوم 9:45 ص',
  },
  {
    id: 'c4',
    name: 'فريق العمل 💼',
    avatar: IMG('3184339', 200),
    about: 'مجموعة العمل',
    phone: '',
    isGroup: true,
    isOnline: true,
    hasStatus: false,
    members: [
      { id: 'c4m1', name: 'م. خالد', avatar: AV('c4m1'), isAdmin: true, color: '#06CF9C' },
      { id: 'c4m2', name: 'م. سلمى', avatar: AV('c4m2'), isAdmin: false, color: '#E542A3' },
      { id: 'c4m3', name: 'م. طارق', avatar: AV('c4m3'), isAdmin: false, color: '#F9B342' },
    ],
  },
  {
    id: 'c5',
    name: 'سارة الأهدل',
    avatar: AV('c5'),
    about: ' مرحباً أنا أستخدم واتساب',
    phone: '+967 733 111 222',
    isGroup: false,
    isOnline: true,
    hasStatus: true,
    lastSeen: 'متصل الآن',
  },
  {
    id: 'c6',
    name: 'خالد الحداد',
    avatar: AV('c6'),
    about: 'اتصل بي لاحقاً',
    phone: '+967 770 555 444',
    isGroup: false,
    isOnline: false,
    hasStatus: false,
    lastSeen: 'آخر ظهور أمس 11:30 م',
  },
  {
    id: 'c7',
    name: 'ليلى المخلافي',
    avatar: AV('c7'),
    about: '💛',
    phone: '+967 777 888 999',
    isGroup: false,
    isOnline: false,
    hasStatus: true,
    lastSeen: 'آخر ظهور اليوم 2:10 م',
  },
  {
    id: 'c8',
    name: 'الأصدقاء 🎉',
    avatar: IMG('1739841', 200),
    about: 'مجموعة الأصدقاء',
    phone: '',
    isGroup: true,
    isOnline: true,
    hasStatus: false,
    members: [
      { id: 'c8m1', name: 'نورا', avatar: AV('c8m1'), isAdmin: true, color: '#06CF9C' },
      { id: 'c8m2', name: 'ريم', avatar: AV('c8m2'), isAdmin: false, color: '#E542A3' },
      { id: 'c8m3', name: 'زياد', avatar: AV('c8m3'), isAdmin: false, color: '#FF7547' },
    ],
  },
  {
    id: 'c9',
    name: 'الدكتور سميع',
    avatar: AV('c9'),
    about: 'متاح للطوارئ',
    phone: '+967 711 222 333',
    isGroup: false,
    isOnline: false,
    hasStatus: false,
    lastSeen: 'آخر ظهور قبل ساعة',
  },
  {
    id: 'c10',
    name: 'هدى الشامي',
    avatar: AV('c10'),
    about: ' الحمد لله',
    phone: '+967 700 900 800',
    isGroup: false,
    isOnline: true,
    hasStatus: true,
    lastSeen: 'متصل الآن',
  },
];

const now = Date.now();
const min = 60 * 1000;
const hour = 60 * min;
const day = 24 * hour;

export const initialMessages: Message[] = [
  { id: 'm1', chatId: 'c1', senderId: 'c1m1', type: 'text', text: 'السلام عليكم جميعاً، كيف حالكم؟', time: '9:30 ص', timestamp: now - day - 2 * hour, status: 'read', reactions: [{ emoji: '👍', by: 'c1m2' }] },
  { id: 'm2', chatId: 'c1', senderId: 'c1m2', type: 'text', text: 'وعليكم السلام ورحمة الله، بخير الحمد لله', time: '9:31 ص', timestamp: now - day - 2 * hour + min, status: 'read', reactions: [] },
  { id: 'm3', chatId: 'c1', senderId: 'c1m3', type: 'text', text: 'صباح الخير للكل 🌞', time: '9:33 ص', timestamp: now - day - 2 * hour + 3 * min, status: 'read', reactions: [{ emoji: '❤️', by: 'c1m1' }] },
  { id: 'm4', chatId: 'c1', senderId: 'me', type: 'text', text: 'صباح النور جميعاً 🌸', time: '9:35 ص', timestamp: now - day - 2 * hour + 5 * min, status: 'read', reactions: [] },
  { id: 'm5', chatId: 'c1', senderId: 'c1m4', type: 'voice', time: '9:40 ص', timestamp: now - day - hour, status: 'read', reactions: [], voice: { duration: 24, speed: 1, waveform: [8, 14, 22, 16, 28, 20, 12, 30, 24, 18, 26, 14, 10, 20, 32, 22, 16, 24, 12, 28, 18, 14, 26, 20, 10, 22, 16, 30, 24, 12] } },
  { id: 'm6', chatId: 'c1', senderId: 'c1m1', type: 'text', text: 'الغداء اليوم عندي، لا تتأخروا 🍽️', time: '11:00 ص', timestamp: now - day, status: 'read', reactions: [{ emoji: '👏', by: 'c1m3' }] },

  { id: 'm7', chatId: 'c2', senderId: 'c2', type: 'text', text: 'أهلاً يا صديقي! كيف حالك؟', time: '10:15 ص', timestamp: now - 3 * hour, status: 'read', reactions: [] },
  { id: 'm8', chatId: 'c2', senderId: 'me', type: 'text', text: 'بخير الحمد لله، وأنت؟', time: '10:16 ص', timestamp: now - 3 * hour + min, status: 'read', reactions: [] },
  { id: 'm9', chatId: 'c2', senderId: 'c2', type: 'voice', time: '10:18 ص', timestamp: now - 3 * hour + 3 * min, status: 'read', reactions: [], voice: { duration: 18, speed: 1, waveform: [10, 18, 14, 26, 20, 12, 28, 22, 16, 24, 30, 18, 14, 26, 20, 12, 22, 16, 28, 24, 10, 18, 14, 22, 26, 16, 12, 20, 24, 14] } },
  { id: 'm10', chatId: 'c2', senderId: 'me', type: 'text', text: 'تمام، سأراك غداً إن شاء الله', time: '10:20 ص', timestamp: now - 3 * hour + 5 * min, status: 'read', reactions: [{ emoji: '👍', by: 'c2' }] },
  { id: 'm11', chatId: 'c2', senderId: 'c2', type: 'image', time: '10:25 ص', timestamp: now - 3 * hour + 10 * min, status: 'read', reactions: [], image: { url: IMG('1000495', 500), caption: 'صورة من رحلة الأمس 🏔️' } },

  { id: 'm12', chatId: 'c3', senderId: 'c3', type: 'text', text: 'هل أنهيت التقرير؟', time: 'أمس', timestamp: now - day - hour, status: 'read', reactions: [] },
  { id: 'm13', chatId: 'c3', senderId: 'me', type: 'text', text: 'نعم، أرسلته بالبريد', time: 'أمس', timestamp: now - day - hour + 2 * min, status: 'read', reactions: [] },
  { id: 'm14', chatId: 'c3', senderId: 'c3', type: 'text', text: 'شكراً جزيلاً 👍', time: 'أمس', timestamp: now - day - hour + 5 * min, status: 'read', reactions: [] },

  { id: 'm15', chatId: 'c4', senderId: 'c4m1', type: 'text', text: 'اجتماع الغد الساعة 9 صباحاً', time: '8:00 ص', timestamp: now - 5 * hour, status: 'read', reactions: [{ emoji: '👍', by: 'c4m2' }, { emoji: '👌', by: 'me' }] },
  { id: 'm16', chatId: 'c4', senderId: 'c4m2', type: 'text', text: 'تمام، سأكون حاضرة', time: '8:02 ص', timestamp: now - 5 * hour + 2 * min, status: 'read', reactions: [] },
  { id: 'm17', chatId: 'c4', senderId: 'c4m3', type: 'poll', time: '8:10 ص', timestamp: now - 5 * hour + 10 * min, status: 'read', reactions: [], poll: { question: 'أين نعقد الاجتماع؟', options: [
    { id: 'o1', text: 'قاعة الاجتماعات', votes: ['c4m1', 'c4m2', 'me'] },
    { id: 'o2', text: 'أونلاين (Zoom)', votes: ['c4m3'] },
  ] } },
  { id: 'm18', chatId: 'c4', senderId: 'me', type: 'text', text: 'قاعة الاجتماعات أفضل', time: '8:15 ص', timestamp: now - 5 * hour + 15 * min, status: 'read', reactions: [] },

  { id: 'm19', chatId: 'c5', senderId: 'c5', type: 'text', text: 'مرحباً! وصلت سالمة؟', time: '7:30 م', timestamp: now - 6 * hour, status: 'read', reactions: [] },
  { id: 'm20', chatId: 'c5', senderId: 'me', type: 'text', text: 'نعم، شكراً لسؤالك 🌹', time: '7:32 م', timestamp: now - 6 * hour + 2 * min, status: 'read', reactions: [{ emoji: '❤️', by: 'c5' }] },

  { id: 'm21', chatId: 'c6', senderId: 'c6', type: 'text', text: 'متى موعدنا القادم؟', time: 'أمس', timestamp: now - day - 3 * hour, status: 'delivered', reactions: [] },

  { id: 'm22', chatId: 'c7', senderId: 'c7', type: 'text', text: 'كل عام وأنتم بخير 🎉', time: '2:00 م', timestamp: now - 2 * hour, status: 'read', reactions: [{ emoji: '🎉', by: 'me' }] },
  { id: 'm23', chatId: 'c7', senderId: 'me', type: 'text', text: 'وأنت بخير وصحة وسلامة', time: '2:05 م', timestamp: now - 2 * hour + 5 * min, status: 'read', reactions: [] },

  { id: 'm24', chatId: 'c8', senderId: 'c8m1', type: 'text', text: 'يلا نخرج نهاية الأسبوع؟', time: '5:00 م', timestamp: now - 4 * hour, status: 'read', reactions: [{ emoji: '🔥', by: 'c8m2' }] },
  { id: 'm25', chatId: 'c8', senderId: 'c8m2', type: 'text', text: 'فكرة حلوة! أنا معاكم', time: '5:02 م', timestamp: now - 4 * hour + 2 * min, status: 'read', reactions: [] },
  { id: 'm26', chatId: 'c8', senderId: 'c8m3', type: 'text', text: 'أنا مشغول يوم الجمعة، السبت أفضل', time: '5:05 م', timestamp: now - 4 * hour + 5 * min, status: 'read', reactions: [] },

  { id: 'm27', chatId: 'c9', senderId: 'c9', type: 'text', text: 'تذكير: موعدك يوم الأحد 10 ص', time: 'أمس', timestamp: now - day - 5 * hour, status: 'read', reactions: [] },

  { id: 'm28', chatId: 'c10', senderId: 'c10', type: 'text', text: 'بارك الله فيك على المساعدة', time: '1:00 م', timestamp: now - 8 * hour, status: 'read', reactions: [] },
];

export const initialChats: Chat[] = contacts.map((c) => ({
  id: c.id,
  contactId: c.id,
  pinned: c.id === 'c1' || c.id === 'c2',
  muted: false,
  archived: false,
  unreadCount: c.id === 'c2' ? 2 : c.id === 'c5' ? 1 : 0,
}));

export const EMOJI_LIST = ['😀', '😂', '😍', '👍', '❤️', '🎉', '🙏', '👏', '🔥', '😮', '😢', '🙏‍♂️'];
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
