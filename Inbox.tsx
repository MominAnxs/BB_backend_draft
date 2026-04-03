'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Search, Hash, Send, Paperclip, AtSign, Smile, Sparkles,
  Plus, ChevronDown, ChevronRight, ChevronUp, Lock, X, Users, Loader2,
  CheckCircle2, CircleDot, ArrowRight,
  Target, ListChecks, Clock, MessageSquareText,
  Star, FileText, FileImage, Link2, PenLine,
  Phone, Video, PhoneOff,
} from 'lucide-react';

/* ─────────────────────── Types ─────────────────────── */
interface Channel {
  id: string;
  name: string;
  category: 'Brego Channels' | 'Client Channels' | 'Direct Messages';
  unread: number;
  isPrivate?: boolean;
  avatar?: string;
  online?: boolean;
}

interface Message {
  id: number;
  sender: string;
  avatar: string;
  content: string;
  timestamp: string;
  date?: string;
  isUser?: boolean;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

interface ActionItem {
  text: string;
  owner: string;
  ownerAvatar: string;
  status: 'pending' | 'done';
  due?: string;
}

interface TopicMention {
  topic: string;
  messageCount: number;
}

interface Participant {
  name: string;
  avatar: string;
  messageCount: number;
}

interface AISummaryData {
  overview: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  topics: TopicMention[];
  participants: Participant[];
  sentiment: 'positive' | 'neutral' | 'mixed';
  messageRange: string;
  generatedAt: string;
}

/* ─────────────────────── Mock Data ─────────────────────── */
const channels: Channel[] = [
  { id: 'brego-hq', name: 'Brego HQ', category: 'Brego Channels', unread: 0 },
  { id: 'sem', name: 'SEM', category: 'Brego Channels', unread: 3 },
  { id: 'smm', name: 'SMM', category: 'Brego Channels', unread: 0 },
  { id: 'accounts', name: 'Accounts', category: 'Brego Channels', unread: 1, isPrivate: true },
  { id: 'announcements', name: 'Announcements', category: 'Brego Channels', unread: 0, isPrivate: true },
  { id: '99-pancakes', name: '99 Pancakes', category: 'Client Channels', unread: 5 },
  { id: 'anaya-collections', name: 'Anaya Collections', category: 'Client Channels', unread: 0 },
  { id: 'bilawala-co', name: 'Bilawala & Co', category: 'Client Channels', unread: 2 },
  { id: 'ceo-rules', name: 'CEO Rules', category: 'Client Channels', unread: 0 },
  { id: 'knickgasm', name: 'Knickgasm', category: 'Client Channels', unread: 0 },
  { id: 'dm-tejas', name: 'Tejas Atha', category: 'Direct Messages', unread: 1, avatar: 'TA', online: true },
  { id: 'dm-chinmay', name: 'Chinmay Pawar', category: 'Direct Messages', unread: 0, avatar: 'CP', online: true },
  { id: 'dm-zubear', name: 'Zubear Shaikh', category: 'Direct Messages', unread: 0, avatar: 'ZS', online: false },
  { id: 'dm-mihir', name: 'Mihir L.', category: 'Direct Messages', unread: 4, avatar: 'ML', online: false },
];

const messagesMap: Record<string, Message[]> = {
  'brego-hq': [
    {
      id: 1, sender: 'Tejas Atha', avatar: 'TA',
      content: 'Team, great work on closing Q4! Let\'s maintain this momentum into the new quarter.',
      timestamp: '2:15 PM', date: 'Today',
      reactions: [{ emoji: '👍', count: 4, reacted: false }, { emoji: '🎉', count: 2, reacted: true }],
    },
    {
      id: 2, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'Thanks! Looking forward to the new targets. Should we schedule a kickoff meeting?',
      timestamp: '2:18 PM',
    },
    {
      id: 3, sender: 'You', avatar: 'JD',
      content: 'Agreed! I can set up a meeting for tomorrow morning. Will send out the calendar invite shortly.',
      timestamp: '2:22 PM', isUser: true,
    },
    {
      id: 4, sender: 'Zubear Shaikh', avatar: 'ZS',
      content: 'Perfect. Let me know the time — I need to sync with the A&T team before the call.',
      timestamp: '2:25 PM',
    },
    {
      id: 5, sender: 'Tejas Atha', avatar: 'TA',
      content: 'Let\'s aim for 10:30 AM so everyone has time to settle in. Also, please review the Q1 OKR draft I shared in the doc.',
      timestamp: '2:31 PM',
      reactions: [{ emoji: '✅', count: 3, reacted: false }],
    },
    {
      id: 6, sender: 'Mihir L.', avatar: 'ML',
      content: 'Just shared the updated client onboarding tracker. 3 new clients this week — we need to assign account managers ASAP.',
      timestamp: '3:05 PM',
    },
    {
      id: 7, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'I\'ll handle Anaya Collections. @Zubear can you take Bilawala & Co?',
      timestamp: '3:12 PM',
      reactions: [{ emoji: '👍', count: 1, reacted: false }],
    },
    {
      id: 8, sender: 'You', avatar: 'JD',
      content: 'Calendar invite sent for tomorrow at 10:30 AM. Agenda: Q1 targets, client assignments, and team resourcing.',
      timestamp: '3:45 PM', isUser: true,
      reactions: [{ emoji: '🙌', count: 5, reacted: false }],
    },
  ],
  'sem': [
    {
      id: 1, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'New campaign analysis is ready for 99 Pancakes. ROAS improved by 34% this month.',
      timestamp: '1:22 PM', date: 'Today',
      reactions: [{ emoji: '🔥', count: 3, reacted: false }],
    },
    {
      id: 2, sender: 'Harshal R.', avatar: 'HR',
      content: 'Great numbers! Should we scale the budget on the top-performing ad sets?',
      timestamp: '1:28 PM',
    },
    {
      id: 3, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'Yes, let\'s increase by 20% on the top 3 ad sets. I\'ll prepare the budget reallocation proposal by EOD.',
      timestamp: '1:35 PM',
    },
  ],
  '99-pancakes': [
    {
      id: 1, sender: 'Harshal R.', avatar: 'HR',
      content: 'Campaign performance review is due this Friday. Everyone please update your metrics in the shared sheet.',
      timestamp: '11:03 AM', date: 'Today',
    },
    {
      id: 2, sender: 'You', avatar: 'JD',
      content: 'On it. I\'ll have the PM metrics updated by Thursday EOD.',
      timestamp: '11:15 AM', isUser: true,
    },
  ],
  'knickgasm': [
    {
      id: 1, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'Hi Knickgasm team — we\'ve started onboarding your account into our PM workspace. You should receive the kickoff proposal shortly.',
      timestamp: '10:00 AM', date: 'Yesterday',
    },
    {
      id: 2, sender: 'Harshal R.', avatar: 'HR',
      content: 'Welcome aboard! We\'re excited to partner with you. I\'ll be your primary point of contact for operations.',
      timestamp: '10:12 AM',
    },
    {
      id: 3, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'Kickoff proposal has been sent with proposed metrics — ad spend, ROAS, revenue, and order targets for the quarter. Please review and share your feedback.',
      timestamp: '11:30 AM',
    },
    {
      id: 4, sender: 'Chinmay Pawar', avatar: 'CP',
      content: 'We\'ve received your counter-proposal on the metrics. The team is reviewing the numbers now and will get back to you with our final targets.',
      timestamp: '3:45 PM', date: 'Today',
      reactions: [{ emoji: '👍', count: 1, reacted: false }],
    },
  ],
};

/* ─── AI Summary mock data per channel ─── */
const aiSummaryMap: Record<string, AISummaryData> = {
  'brego-hq': {
    overview: 'The team wrapped up Q4 on a high note and immediately shifted focus to Q1 planning. A kickoff meeting was proposed, scheduled, and confirmed for tomorrow at 10:30 AM. Separately, Mihir flagged 3 new client onboardings that need account managers assigned urgently.',
    keyDecisions: [
      'Q1 kickoff meeting scheduled for tomorrow at 10:30 AM',
      'Chinmay will manage Anaya Collections account',
      'Zubear proposed to take over Bilawala & Co',
      'Q1 OKR draft shared by Tejas for team review',
    ],
    actionItems: [
      { text: 'Review Q1 OKR draft document', owner: 'Everyone', ownerAvatar: 'AL', status: 'pending' },
      { text: 'Manage Anaya Collections onboarding', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending' },
      { text: 'Confirm Bilawala & Co assignment', owner: 'Zubear Shaikh', ownerAvatar: 'ZS', status: 'pending' },
      { text: 'Send Q1 kickoff calendar invite', owner: 'You', ownerAvatar: 'JD', status: 'done', due: 'Done' },
      { text: 'Assign AM for 3rd new client', owner: 'Unassigned', ownerAvatar: 'UA', status: 'pending', due: 'ASAP' },
    ],
    topics: [
      { topic: 'Q1 Planning & OKRs', messageCount: 3 },
      { topic: 'Client Onboarding', messageCount: 3 },
      { topic: 'Meeting Scheduling', messageCount: 4 },
    ],
    participants: [
      { name: 'Tejas Atha', avatar: 'TA', messageCount: 2 },
      { name: 'Chinmay Pawar', avatar: 'CP', messageCount: 2 },
      { name: 'You', avatar: 'JD', messageCount: 2 },
      { name: 'Zubear Shaikh', avatar: 'ZS', messageCount: 1 },
      { name: 'Mihir L.', avatar: 'ML', messageCount: 1 },
    ],
    sentiment: 'positive',
    messageRange: '8 messages · 2:15 PM – 3:45 PM',
    generatedAt: 'Just now',
  },
  'sem': {
    overview: 'Chinmay presented the 99 Pancakes campaign results showing strong ROAS improvement. The team agreed to scale spending on top-performing ad sets with a structured budget proposal.',
    keyDecisions: [
      'Scale budget by 20% on top 3 ad sets for 99 Pancakes',
      'Budget reallocation proposal to be prepared by EOD',
    ],
    actionItems: [
      { text: 'Prepare budget reallocation proposal', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending', due: 'Today EOD' },
      { text: 'Approve scaled budget for 99 Pancakes', owner: 'Harshal R.', ownerAvatar: 'HR', status: 'pending' },
    ],
    topics: [
      { topic: 'Campaign Performance (99 Pancakes)', messageCount: 2 },
      { topic: 'Budget Reallocation', messageCount: 2 },
    ],
    participants: [
      { name: 'Chinmay Pawar', avatar: 'CP', messageCount: 2 },
      { name: 'Harshal R.', avatar: 'HR', messageCount: 1 },
    ],
    sentiment: 'positive',
    messageRange: '3 messages · 1:22 PM – 1:35 PM',
    generatedAt: 'Just now',
  },
  '99-pancakes': {
    overview: 'Harshal reminded the team about the Friday performance review deadline. You confirmed that PM metrics will be ready by Thursday EOD.',
    keyDecisions: [
      'Campaign performance review due this Friday',
    ],
    actionItems: [
      { text: 'Update PM metrics in shared sheet', owner: 'You', ownerAvatar: 'JD', status: 'pending', due: 'Thursday EOD' },
      { text: 'Complete campaign performance review', owner: 'Everyone', ownerAvatar: 'AL', status: 'pending', due: 'Friday' },
    ],
    topics: [
      { topic: 'Campaign Review Prep', messageCount: 2 },
    ],
    participants: [
      { name: 'Harshal R.', avatar: 'HR', messageCount: 1 },
      { name: 'You', avatar: 'JD', messageCount: 1 },
    ],
    sentiment: 'neutral',
    messageRange: '2 messages · 11:03 AM – 11:15 AM',
    generatedAt: 'Just now',
  },
};

type SidebarView = 'channels' | 'threads' | 'media' | 'starred' | 'drafts';

/* ─── Threads ─── */
const threadsData = [
  { id: 't1', channel: 'Brego HQ', channelId: 'brego-hq', starter: 'Tejas Atha', starterAvatar: 'TA', lastReply: 'Chinmay Pawar', lastReplyAvatar: 'CP', preview: 'Should we schedule a kickoff meeting?', replyCount: 4, time: '2:18 PM', unread: true },
  { id: 't2', channel: 'SEM', channelId: 'sem', starter: 'Chinmay Pawar', starterAvatar: 'CP', lastReply: 'Harshal R.', lastReplyAvatar: 'HR', preview: 'Great numbers! Should we scale the budget on the top-performing ad sets?', replyCount: 2, time: '1:28 PM', unread: true },
  { id: 't3', channel: '99 Pancakes', channelId: '99-pancakes', starter: 'Harshal R.', starterAvatar: 'HR', lastReply: 'You', lastReplyAvatar: 'JD', preview: 'On it. I\'ll have the PM metrics updated by Thursday EOD.', replyCount: 1, time: '11:15 AM', unread: false },
  { id: 't4', channel: 'Brego HQ', channelId: 'brego-hq', starter: 'Mihir L.', starterAvatar: 'ML', lastReply: 'Chinmay Pawar', lastReplyAvatar: 'CP', preview: 'I\'ll handle Anaya Collections. @Zubear can you take Bilawala?', replyCount: 3, time: 'Yesterday', unread: false },
];

/* ─── Media, Links & Docs ─── */
const mediaData = [
  { id: 'm1', type: 'doc' as const, name: 'Q1 OKR Draft.pdf', sharedBy: 'Tejas Atha', channel: 'Brego HQ', time: '2:30 PM' },
  { id: 'm2', type: 'image' as const, name: 'Alpine_Campaign_Creative_v3.png', sharedBy: 'Chinmay Pawar', channel: 'SEM', time: '1:45 PM' },
  { id: 'm3', type: 'link' as const, name: 'Google Analytics Dashboard', sharedBy: 'Harshal R.', channel: '99 Pancakes', time: '11:20 AM' },
  { id: 'm4', type: 'doc' as const, name: 'Client Onboarding Checklist.xlsx', sharedBy: 'Mihir L.', channel: 'Brego HQ', time: 'Yesterday' },
  { id: 'm5', type: 'image' as const, name: 'Flavor_Nation_Banner.jpg', sharedBy: 'Chinmay Pawar', channel: 'Social Media', time: 'Yesterday' },
];

/* ─── Starred Messages ─── */
const starredData = [
  { id: 's1', sender: 'Tejas Atha', avatar: 'TA', content: 'Q1 kickoff is confirmed for April 7. All HODs please prepare department OKRs by Friday.', channel: 'Brego HQ', time: '3:15 PM' },
  { id: 's2', sender: 'Chinmay Pawar', avatar: 'CP', content: 'Alpine Group campaign hit 3.2x ROAS this week — best performance yet. Scaling budget by 20%.', channel: 'SEM', time: '1:28 PM' },
  { id: 's3', sender: 'Zubear Shaikh', avatar: 'ZS', content: 'GST filing deadline extended to April 20. All clients notified.', channel: 'Accounts', time: 'Yesterday' },
];

/* ─── Drafts ─── */
const draftsData = [
  { id: 'd1', channel: 'Brego HQ', channelId: 'brego-hq', preview: 'Hey team, just wanted to follow up on the resource allocation for...', time: '4:12 PM', isDM: false },
  { id: 'd2', channel: 'Chinmay Pawar', channelId: 'dm-chinmay', preview: 'Can you share the updated creatives for the Alpine Group campaign?', time: 'Yesterday', isDM: true },
  { id: 'd3', channel: 'Accounts', channelId: 'accounts', preview: 'Q4 invoice reconciliation is done. Attaching the summary here...', time: 'Mar 28', isDM: false },
];

/* ─────────────────── Helpers ─────────────────── */
const avatarColors: Record<string, string> = {
  TA: 'bg-blue-600',
  CP: 'bg-violet-600',
  ZS: 'bg-cyan-600',
  ML: 'bg-amber-600',
  HR: 'bg-emerald-600',
  JD: 'bg-indigo-600',
  AL: 'bg-slate-500',
  UA: 'bg-rose-400',
};

function getAvatarColor(initials: string): string {
  return avatarColors[initials] || 'bg-slate-600';
}


type CategoryKey = 'Brego Channels' | 'Client Channels' | 'Direct Messages';

/* ─────────────────── Component ─────────────────── */
export function Inbox() {
  /* ── Read ?channel= query param on mount for cross-module redirect ── */
  const [selectedChannel, setSelectedChannel] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get('channel');
      if (ch && channels.some(c => c.id === ch)) return ch;
    }
    return 'brego-hq';
  });
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarView, setSidebarView] = useState<SidebarView>('channels');
  const [showSearch, setShowSearch] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [injectedMessages, setInjectedMessages] = useState<Record<string, Message[]>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<CategoryKey, boolean>>({
    'Brego Channels': false,
    'Client Channels': false,
    'Direct Messages': false,
  });

  /* AI Drawer state */
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [aiData, setAiData] = useState<AISummaryData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTypingIdx, setAiTypingIdx] = useState(0); // progressive reveal index

  /* Huddle / Call state */
  const [activeCall, setActiveCall] = useState<{ channelId: string; type: 'audio' | 'video'; startedAt: number } | null>(null);
  const [callElapsed, setCallElapsed] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const convSearchRef = useRef<HTMLInputElement>(null);
  const matchRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const currentChannel = channels.find(c => c.id === selectedChannel);
  const baseMessages = messagesMap[selectedChannel] || [];
  const extraMessages = injectedMessages[selectedChannel] || [];
  const currentMessages = [...baseMessages, ...extraMessages];

  /* Conversation search: find matching message IDs */
  const convMatches = convSearchQuery.trim()
    ? currentMessages.filter(m => m.content.toLowerCase().includes(convSearchQuery.toLowerCase())).map(m => m.id)
    : [];

  const filteredChannels = searchQuery
    ? channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const groupedChannels = channels.reduce((acc, channel) => {
    if (!acc[channel.category]) acc[channel.category] = [];
    acc[channel.category].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChannel]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedChannel]);

  // Close drawer + search on channel change
  useEffect(() => {
    setShowAIDrawer(false);
    setAiData(null);
    setAiLoading(false);
    setAiTypingIdx(0);
    setShowSearch(false);
    setConvSearchQuery('');
    setActiveMatchIdx(0);
  }, [selectedChannel]);

  // Call timer
  useEffect(() => {
    if (!activeCall) { setCallElapsed(0); return; }
    const interval = setInterval(() => {
      setCallElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatCallTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const startCall = (type: 'audio' | 'video') => {
    if (currentChannel) {
      setActiveCall({ channelId: currentChannel.id, type, startedAt: Date.now() });
    }
  };

  const endCall = () => setActiveCall(null);

  const isClientChannel = currentChannel?.category === 'Client Channels';
  const isInCall = activeCall?.channelId === selectedChannel;

  // Auto-focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => convSearchRef.current?.focus(), 50);
    } else {
      setConvSearchQuery('');
      setActiveMatchIdx(0);
    }
  }, [showSearch]);

  // Reset active match when query changes
  useEffect(() => {
    setActiveMatchIdx(0);
  }, [convSearchQuery]);

  // Scroll to active match
  useEffect(() => {
    if (convMatches.length > 0 && convMatches[activeMatchIdx]) {
      const el = matchRefs.current.get(convMatches[activeMatchIdx]);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeMatchIdx, convMatches]);

  // Progressive reveal animation: increment sections after data loads
  useEffect(() => {
    if (!aiData) { setAiTypingIdx(0); return; }
    // 3 sections to reveal progressively
    if (aiTypingIdx >= 3) return;
    const timer = setTimeout(() => setAiTypingIdx(prev => prev + 1), 300);
    return () => clearTimeout(timer);
  }, [aiData, aiTypingIdx]);

  /* ── Pick up discussion message from PM module via sessionStorage ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('inbox_discussion_msg');
      if (!raw) return;
      sessionStorage.removeItem('inbox_discussion_msg');
      const data = JSON.parse(raw) as {
        channelId: string;
        message: string;
        metric: string;
        proposed: string;
        client: string;
        finalTarget: string;
        sender: string;
      };
      if (!data.channelId || !data.message) return;
      const newMsg: Message = {
        id: Date.now(),
        sender: 'You',
        avatar: 'JD',
        content: data.message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        isUser: true,
      };
      // Also add a context card message right before the user's message
      const contextMsg: Message = {
        id: Date.now() - 1,
        sender: 'You',
        avatar: 'JD',
        content: `📊 Metric Discussion: ${data.metric}\nProposed: ${data.proposed}  →  Client: ${data.client}  →  Final: ${data.finalTarget}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        isUser: true,
      };
      setInjectedMessages(prev => ({
        ...prev,
        [data.channelId]: [...(prev[data.channelId] || []), contextMsg, newMsg],
      }));
      // Ensure the Client Channels category is expanded
      setCollapsedCategories(prev => ({ ...prev, 'Client Channels': false }));
    } catch { /* ignore malformed data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (category: CategoryKey) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSummarize = () => {
    if (showAIDrawer && !aiLoading) {
      // Toggle off
      setShowAIDrawer(false);
      return;
    }
    setShowAIDrawer(true);
    setAiData(null);
    setAiLoading(true);
    setAiTypingIdx(0);
    // Simulate AI generating summary
    setTimeout(() => {
      setAiData(aiSummaryMap[selectedChannel] || {
        overview: 'Not enough conversation history in this channel to generate a detailed summary.',
        keyDecisions: [],
        actionItems: [],
        topics: [],
        participants: [],
        sentiment: 'neutral',
        messageRange: '0 messages',
        generatedAt: 'Just now',
      });
      setAiLoading(false);
    }, 2000);
  };

  const handleToggleSearch = () => {
    setShowSearch(prev => !prev);
  };

  const handleNextMatch = () => {
    if (convMatches.length === 0) return;
    setActiveMatchIdx(prev => (prev + 1) % convMatches.length);
  };

  const handlePrevMatch = () => {
    if (convMatches.length === 0) return;
    setActiveMatchIdx(prev => (prev - 1 + convMatches.length) % convMatches.length);
  };

  const handleConvSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearch(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─────────── Channel sidebar item ─────────── */
  const renderChannelItem = (channel: Channel) => {
    const isActive = selectedChannel === channel.id;
    const isDM = channel.category === 'Direct Messages';
    return (
      <button
        key={channel.id}
        onClick={() => { setSelectedChannel(channel.id); setSearchQuery(''); }}
        className={`w-full px-2 py-[5px] flex items-center gap-2 rounded-md text-left transition-colors group ${
          isActive
            ? 'bg-[#204CC7]/10 text-[#204CC7]'
            : 'text-black/70 hover:bg-black/[0.04]'
        }`}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`${isDM ? 'Direct message with' : 'Channel'} ${channel.name}${channel.unread > 0 ? `, ${channel.unread} unread` : ''}`}
      >
        {isDM ? (
          <div className="relative flex-shrink-0">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(channel.avatar || '')}`}>
              {channel.avatar}
            </div>
            {channel.online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" aria-label="Online" />
            )}
          </div>
        ) : channel.isPrivate ? (
          <Lock className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? 'text-[#204CC7]' : 'text-black/40'}`} aria-hidden="true" />
        ) : (
          <Hash className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? 'text-[#204CC7]' : 'text-black/40'}`} aria-hidden="true" />
        )}
        <span className={`text-[13.5px] leading-5 truncate flex-1 ${
          isActive ? 'font-semibold' : channel.unread > 0 ? 'font-semibold text-black/90' : 'font-normal'
        }`}>
          {channel.name}
        </span>
        {activeCall?.channelId === channel.id && (
          <span className="flex-shrink-0 w-[18px] h-[18px] bg-[#00C875]/15 rounded-full flex items-center justify-center" aria-label="In call">
            <Phone className="w-2.5 h-2.5 text-[#00C875]" />
          </span>
        )}
        {channel.unread > 0 && (
          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-[#E2445C] text-white text-[11px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
            {channel.unread}
          </span>
        )}
      </button>
    );
  };

  /* ─────────── Date separator ─────────── */
  const renderDateSeparator = (date: string) => (
    <div className="flex items-center gap-3 py-2" role="separator" aria-label={date}>
      <div className="flex-1 h-px bg-black/[0.08]" />
      <span className="text-[13px] font-semibold text-black/50 px-3 py-0.5 rounded-full border border-black/[0.08] bg-white">
        {date}
      </span>
      <div className="flex-1 h-px bg-black/[0.08]" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-53px)] bg-white" role="main" aria-label="Inbox messaging">
      {/* ══════════════ Left Sidebar ══════════════ */}
      <aside className="w-[248px] border-r border-black/[0.08] flex flex-col bg-[#F8F8FA] select-none flex-shrink-0" aria-label="Channel navigation">
        {/* Workspace header */}
        <div className="h-[49px] px-4 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
          <h1 className="text-[15px] font-bold text-black/90 tracking-[-0.01em]">Brego Business</h1>
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/[0.06] transition-colors" aria-label="New message">
            <Plus className="w-4 h-4 text-black/50" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-black/40" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSidebarView('channels')}
              className="w-full pl-8 pr-3 py-[6px] bg-white rounded-md text-[13px] text-black/90 placeholder:text-black/40 border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all"
              aria-label="Search channels and direct messages"
            />
          </div>
        </div>

        {/* Quick Access Tabs */}
        <div className="px-2 pt-2.5 pb-1">
          {([
            { id: 'threads' as SidebarView, icon: MessageSquareText, label: 'Threads', count: threadsData.filter(t => t.unread).length },
            { id: 'media' as SidebarView, icon: FileImage, label: 'Media, Links & Docs' },
            { id: 'starred' as SidebarView, icon: Star, label: 'Starred Messages' },
            { id: 'drafts' as SidebarView, icon: PenLine, label: 'Drafts', count: draftsData.length },
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = sidebarView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSidebarView(prev => prev === tab.id ? 'channels' : tab.id)}
                className={`w-full px-2.5 py-[7px] flex items-center gap-2.5 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-[#204CC7]/[0.08] text-[#204CC7]'
                    : 'text-black/60 hover:bg-black/[0.04]'
                }`}
                aria-pressed={isActive}
                aria-label={`${tab.label}${tab.count ? `, ${tab.count} items` : ''}`}
              >
                <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? '' : 'text-black/40'}`} aria-hidden="true" />
                <span className={`text-[13px] flex-1 truncate ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-[#204CC7]/15 text-[#204CC7]' : 'bg-black/[0.06] text-black/40'
                  }`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mx-3 h-px bg-black/[0.06]" />

        {/* Sidebar Content */}
        <nav className="flex-1 overflow-y-auto px-2 pt-1.5 pb-3" aria-label="Sidebar content">
          {sidebarView === 'channels' ? (
            /* ── Channels List ── */
            <>
              {filteredChannels ? (
                <div className="py-1">
                  <div className="px-2 py-1.5">
                    <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wider">Results ({filteredChannels.length})</span>
                  </div>
                  {filteredChannels.length === 0 ? (
                    <p className="px-2 py-4 text-[13px] text-black/40 text-center">No channels found</p>
                  ) : filteredChannels.map(renderChannelItem)}
                </div>
              ) : (
                Object.entries(groupedChannels).map(([category, categoryChannels]) => {
                  const isCollapsed = collapsedCategories[category as CategoryKey];
                  const catUnread = categoryChannels.reduce((s, c) => s + c.unread, 0);
                  return (
                    <div key={category} className="pt-3 first:pt-1">
                      <button
                        onClick={() => toggleCategory(category as CategoryKey)}
                        className="w-full px-2 py-1 flex items-center gap-1 group hover:bg-black/[0.03] rounded-md transition-colors"
                        aria-expanded={!isCollapsed}
                      >
                        <ChevronRight className={`w-3 h-3 text-black/40 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} aria-hidden="true" />
                        <span className="text-[11px] font-semibold text-black/50 uppercase tracking-wider flex-1 text-left">{category}</span>
                        {isCollapsed && catUnread > 0 && (
                          <span className="text-[11px] font-bold text-[#E2445C]">{catUnread}</span>
                        )}
                      </button>
                      {!isCollapsed && (
                        <div className="mt-0.5" role="list">
                          {categoryChannels.map(renderChannelItem)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          ) : sidebarView === 'threads' ? (
            /* ── Threads ── */
            <div className="py-1" role="list" aria-label="Threads">
              {threadsData.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => { setSelectedChannel(thread.channelId); setSidebarView('channels'); }}
                  className="w-full px-2.5 py-2.5 flex items-start gap-2.5 rounded-lg text-left hover:bg-black/[0.03] transition-colors group"
                  role="listitem"
                  aria-label={`Thread in ${thread.channel}: ${thread.preview}`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5 ${getAvatarColor(thread.lastReplyAvatar)}`}>
                    {thread.lastReplyAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[12px] text-black/40">{thread.channel}</span>
                      {thread.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#204CC7] flex-shrink-0" aria-label="Unread" />}
                    </div>
                    <p className={`text-[13px] leading-[1.4] truncate ${thread.unread ? 'font-semibold text-black/85' : 'text-black/60'}`}>
                      {thread.preview}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-black/35">{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
                      <span className="text-[11px] text-black/25" aria-hidden="true">·</span>
                      <span className="text-[11px] text-black/30 tabular-nums">{thread.time}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : sidebarView === 'media' ? (
            /* ── Media, Links & Docs ── */
            <div className="py-1" role="list" aria-label="Media, links and documents">
              {mediaData.map(item => (
                <div
                  key={item.id}
                  className="w-full px-2.5 py-2.5 flex items-start gap-2.5 rounded-lg hover:bg-black/[0.03] transition-colors cursor-pointer"
                  role="listitem"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'doc' ? 'bg-blue-50' : item.type === 'image' ? 'bg-rose-50' : 'bg-emerald-50'
                  }`}>
                    {item.type === 'doc' && <FileText className="w-4 h-4 text-blue-500" />}
                    {item.type === 'image' && <FileImage className="w-4 h-4 text-rose-500" />}
                    {item.type === 'link' && <Link2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-black/80 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-black/35">{item.sharedBy}</span>
                      <span className="text-[11px] text-black/20" aria-hidden="true">·</span>
                      <span className="text-[11px] text-black/30">{item.channel}</span>
                      <span className="text-[11px] text-black/20" aria-hidden="true">·</span>
                      <span className="text-[11px] text-black/25 tabular-nums">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sidebarView === 'starred' ? (
            /* ── Starred Messages ── */
            <div className="py-1" role="list" aria-label="Starred messages">
              {starredData.map(msg => (
                <div
                  key={msg.id}
                  className="w-full px-2.5 py-2.5 flex items-start gap-2.5 rounded-lg hover:bg-black/[0.03] transition-colors cursor-pointer"
                  role="listitem"
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5 ${getAvatarColor(msg.avatar)}`}>
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-semibold text-black/80">{msg.sender}</span>
                      <span className="text-[11px] text-black/30">in {msg.channel}</span>
                    </div>
                    <p className="text-[13px] leading-[1.45] text-black/55 line-clamp-2">{msg.content}</p>
                    <span className="text-[11px] text-black/25 tabular-nums mt-1 block">{msg.time}</span>
                  </div>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0 mt-1" aria-label="Starred" />
                </div>
              ))}
            </div>
          ) : sidebarView === 'drafts' ? (
            /* ── Drafts ── */
            <div className="py-1" role="list" aria-label="Drafts">
              {draftsData.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => { setSelectedChannel(draft.channelId); setSidebarView('channels'); }}
                  className="w-full px-2.5 py-2.5 flex items-start gap-2.5 rounded-lg text-left hover:bg-black/[0.03] transition-colors"
                  role="listitem"
                  aria-label={`Draft in ${draft.channel}: ${draft.preview}`}
                >
                  <div className="w-6 h-6 rounded-md bg-black/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {draft.isDM ? (
                      <AtSign className="w-3.5 h-3.5 text-black/35" aria-hidden="true" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-black/35" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-medium text-black/70">{draft.channel}</span>
                      <span className="text-[11px] text-black/25 tabular-nums ml-auto">{draft.time}</span>
                    </div>
                    <p className="text-[13px] leading-[1.45] text-black/45 truncate">{draft.preview}</p>
                  </div>
                </button>
              ))}
              {draftsData.length === 0 && (
                <p className="px-2 py-8 text-[13px] text-black/35 text-center">No drafts yet</p>
              )}
            </div>
          ) : null}
        </nav>
      </aside>

      {/* ══════════════ Main Chat Area ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <header className="h-[49px] px-4 border-b border-black/[0.08] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {currentChannel?.category === 'Direct Messages' ? (
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${getAvatarColor(currentChannel.avatar || '')}`}>
                {currentChannel.avatar}
              </div>
            ) : currentChannel?.isPrivate ? (
              <Lock className="w-4 h-4 text-black/50 flex-shrink-0" aria-hidden="true" />
            ) : (
              <Hash className="w-4 h-4 text-black/50 flex-shrink-0" aria-hidden="true" />
            )}
            <h2 className="text-[15px] font-bold text-black/90 truncate">{currentChannel?.name}</h2>
            <ChevronDown className="w-3.5 h-3.5 text-black/30 flex-shrink-0" aria-hidden="true" />
            <div className="h-4 w-px bg-black/[0.08] mx-1 flex-shrink-0" aria-hidden="true" />
            <span className="text-[13px] text-black/45 truncate flex-shrink">
              {currentChannel?.category === 'Direct Messages'
                ? (currentChannel.online ? 'Active' : 'Away')
                : `${currentMessages.length} messages`}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Huddle / Call — Client Channels only */}
            {isClientChannel && !isInCall && (
              <>
                <button
                  onClick={() => startCall('audio')}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#00C875]/10 text-black/50 hover:text-[#00C875] transition-colors"
                  aria-label={`Audio call ${currentChannel?.name}`}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#204CC7]/10 text-black/50 hover:text-[#204CC7] transition-colors"
                  aria-label={`Video call ${currentChannel?.name}`}
                >
                  <Video className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-black/[0.08] mx-0.5 flex-shrink-0" aria-hidden="true" />
              </>
            )}
            {isInCall && (
              <>
                <div className="h-[30px] px-3 flex items-center gap-2 rounded-md bg-[#00C875]/10 border border-[#00C875]/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C875] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C875]" />
                  </span>
                  <span className="text-caption font-medium text-[#00C875]">
                    {activeCall?.type === 'video' ? 'Video' : 'Call'} {formatCallTime(callElapsed)}
                  </span>
                  <button
                    onClick={endCall}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-[#E2445C] hover:bg-[#E2445C]/90 transition-colors"
                    aria-label="End call"
                  >
                    <PhoneOff className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="h-4 w-px bg-black/[0.08] mx-0.5 flex-shrink-0" aria-hidden="true" />
              </>
            )}
            <button
              onClick={handleSummarize}
              disabled={aiLoading}
              className={`h-[30px] px-3 flex items-center gap-1.5 rounded-md text-[13px] font-medium transition-all ${
                showAIDrawer
                  ? 'bg-violet-100 text-violet-700 border border-violet-200 shadow-sm'
                  : 'bg-black/[0.04] text-black/60 hover:bg-black/[0.07] hover:text-black/80'
              }`}
              aria-label="Summarize conversation with AI"
              aria-expanded={showAIDrawer}
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Summarize</span>
            </button>
            <button
              onClick={handleToggleSearch}
              className={`w-[30px] h-[30px] flex items-center justify-center rounded-md transition-colors ${
                showSearch ? 'bg-black/[0.08] text-black/80' : 'hover:bg-black/[0.04] text-black/50'
              }`}
              aria-label="Find in conversation"
              aria-expanded={showSearch}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Find in Conversation Bar */}
        {showSearch && (
          <div className="h-[44px] px-4 flex items-center gap-2 border-b border-black/[0.08] bg-[#FAFAFA] flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-black/35 flex-shrink-0" />
            <input
              ref={convSearchRef}
              type="text"
              value={convSearchQuery}
              onChange={e => setConvSearchQuery(e.target.value)}
              onKeyDown={handleConvSearchKeyDown}
              placeholder="Find in conversation..."
              className="flex-1 bg-transparent text-[13.5px] text-black/85 placeholder:text-black/35 focus:outline-none"
              aria-label="Find in conversation"
            />
            {convSearchQuery && (
              <span className="text-[12px] text-black/40 tabular-nums flex-shrink-0">
                {convMatches.length === 0
                  ? 'No results'
                  : `${activeMatchIdx + 1} of ${convMatches.length}`}
              </span>
            )}
            {convMatches.length > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={handlePrevMatch}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/[0.06] transition-colors text-black/45"
                  aria-label="Previous match"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMatch}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/[0.06] transition-colors text-black/45"
                  aria-label="Next match"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSearch(false)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/[0.06] transition-colors text-black/40 flex-shrink-0"
              aria-label="Close search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active call banner (shown when navigated away from the call channel) */}
        {activeCall && activeCall.channelId !== selectedChannel && (
          <div className="px-4 py-2 border-b border-[#00C875]/20 bg-[#00C875]/[0.06] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C875] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C875]" />
              </span>
              <span className="text-caption font-medium text-[#00C875]">
                {activeCall.type === 'video' ? 'Video call' : 'Call'} in progress with {channels.find(c => c.id === activeCall.channelId)?.name} — {formatCallTime(callElapsed)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedChannel(activeCall.channelId)}
                className="h-[26px] px-2.5 text-caption font-medium text-[#00C875] hover:bg-[#00C875]/10 rounded-md transition-colors"
              >
                Return
              </button>
              <button
                onClick={endCall}
                className="h-[26px] px-2.5 text-caption font-medium text-[#E2445C] hover:bg-[#E2445C]/10 rounded-md transition-colors flex items-center gap-1"
              >
                <PhoneOff className="w-3 h-3" />
                End
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" role="log" aria-label={`Messages in ${currentChannel?.name || 'channel'}`} aria-live="polite">
          <div className="px-5 py-4">
            {currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-xl bg-black/[0.04] flex items-center justify-center mb-3">
                  <Hash className="w-5 h-5 text-black/30" />
                </div>
                <p className="text-[15px] font-semibold text-black/70 mb-1">No messages yet</p>
                <p className="text-[13px] text-black/40">Be the first to send a message in #{currentChannel?.name}</p>
              </div>
            ) : (
              currentMessages.map((msg, idx) => {
                const showDate = msg.date && (idx === 0 || currentMessages[idx - 1]?.date !== msg.date);
                const prevMsg = currentMessages[idx - 1];
                const isGrouped = !showDate && prevMsg && prevMsg.sender === msg.sender && !msg.date;
                const isMatch = convMatches.includes(msg.id);
                const isActiveMatch = convMatches[activeMatchIdx] === msg.id;

                /* Highlight matching text within message */
                const renderContent = (text: string) => {
                  if (!convSearchQuery.trim() || !isMatch) return text;
                  const q = convSearchQuery.trim();
                  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                  const parts = text.split(regex);
                  return parts.map((part, pi) =>
                    regex.test(part)
                      ? <mark key={pi} className="bg-amber-200/80 text-black/90 rounded-sm px-px">{part}</mark>
                      : part
                  );
                };

                return (
                  <div key={msg.id} ref={el => { if (el && isMatch) matchRefs.current.set(msg.id, el); }}>
                    {showDate && renderDateSeparator(msg.date!)}
                    <div
                      className={`group flex gap-2.5 px-1 py-0.5 rounded-lg transition-colors ${isGrouped ? 'mt-0' : 'mt-3 first:mt-0'} ${
                        isActiveMatch
                          ? 'bg-amber-50 ring-1 ring-amber-300/60'
                          : isMatch
                            ? 'bg-amber-50/50'
                            : 'hover:bg-black/[0.02]'
                      }`}
                      role="article"
                      aria-label={`${msg.sender} at ${msg.timestamp}: ${msg.content}`}
                    >
                      <div className="w-8 flex-shrink-0 pt-0.5">
                        {isGrouped ? (
                          <span className="text-[11px] text-black/0 group-hover:text-black/35 transition-colors leading-5 block text-right tabular-nums">
                            {msg.timestamp.replace(' PM', '').replace(' AM', '')}
                          </span>
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white ${getAvatarColor(msg.avatar)}`} aria-hidden="true">
                            {msg.avatar}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {!isGrouped && (
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[14px] font-bold ${msg.isUser ? 'text-[#204CC7]' : 'text-black/90'}`}>{msg.sender}</span>
                            <time className="text-[12px] text-black/35 tabular-nums">{msg.timestamp}</time>
                          </div>
                        )}
                        <p className="text-[14px] leading-[1.55] text-black/80 whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5" role="group" aria-label="Reactions">
                            {msg.reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] border transition-colors ${
                                  r.reacted
                                    ? 'bg-[#204CC7]/10 border-[#204CC7]/20 text-[#204CC7]'
                                    : 'bg-black/[0.03] border-black/[0.06] text-black/60 hover:bg-black/[0.06] hover:border-black/[0.1]'
                                }`}
                                aria-label={`${r.emoji} ${r.count} reaction${r.count !== 1 ? 's' : ''}${r.reacted ? ', you reacted' : ''}`}
                                aria-pressed={r.reacted}
                              >
                                <span>{r.emoji}</span>
                                <span className="font-medium tabular-nums">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="px-5 pb-4 pt-1 flex-shrink-0">
          <div className="border border-black/[0.15] rounded-xl overflow-hidden focus-within:border-[#204CC7]/40 focus-within:shadow-[0_0_0_3px_rgba(32,76,199,0.08)] transition-all bg-white">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentChannel?.category === 'Direct Messages' ? currentChannel.name : '#' + (currentChannel?.name || 'channel')}`}
              className="w-full px-4 pt-3 pb-2 text-[14px] leading-[1.55] text-black/90 placeholder:text-black/40 focus:outline-none resize-none bg-transparent"
              rows={1}
              aria-label={`Message ${currentChannel?.name || 'channel'}. Press Enter to send, Shift+Enter for new line.`}
            />
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors text-black/40 hover:text-black/65" aria-label="Attach file">
                  <Paperclip className="w-[18px] h-[18px]" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors text-black/40 hover:text-black/65" aria-label="Mention someone">
                  <AtSign className="w-[18px] h-[18px]" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors text-black/40 hover:text-black/65" aria-label="Add emoji">
                  <Smile className="w-[18px] h-[18px]" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  message.trim()
                    ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm'
                    : 'bg-black/[0.04] text-black/20 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send className="w-[16px] h-[16px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ AI Summary Drawer (Right Panel) ══════════════ */}
      {showAIDrawer && (
        <aside
          className="w-[360px] border-l border-black/[0.08] flex flex-col bg-white flex-shrink-0 animate-[slideIn_200ms_ease-out]"
          role="complementary"
          aria-label="AI conversation summary"
          style={{ '--tw-animate': 'slideIn' } as React.CSSProperties}
        >
          {/* Drawer Header */}
          <div className="h-[49px] px-5 flex items-center justify-between border-b border-black/[0.08] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <h3 className="text-[14px] font-bold text-black/90">Summary</h3>
              <span className="text-[12px] text-black/30 font-medium">{aiData?.messageRange?.split('·')[0]?.trim()}</span>
            </div>
            <button
              onClick={() => setShowAIDrawer(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/[0.06] transition-colors"
              aria-label="Close AI summary"
            >
              <X className="w-4 h-4 text-black/45" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto">
            {aiLoading ? (
              /* Loading skeleton — minimal, 3 blocks */
              <div className="p-5 space-y-6">
                <div className="space-y-2.5">
                  <div className="h-3.5 w-20 bg-black/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-full bg-black/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-[90%] bg-black/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-[70%] bg-black/[0.04] rounded animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3.5 w-24 bg-black/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-[85%] bg-black/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-[80%] bg-black/[0.04] rounded animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3.5 w-22 bg-black/[0.06] rounded animate-pulse" />
                  <div className="h-8 w-full bg-black/[0.03] rounded-lg animate-pulse" />
                  <div className="h-8 w-full bg-black/[0.03] rounded-lg animate-pulse" />
                  <div className="h-8 w-full bg-black/[0.03] rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  <span className="text-[13px] text-violet-400 font-medium animate-pulse">Analyzing conversation...</span>
                </div>
              </div>
            ) : aiData ? (
              <div className="p-5">
                {/* ── Overview ── */}
                <div className={`pb-5 transition-all duration-300 ${aiTypingIdx >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <p className="text-[14px] leading-[1.65] text-black/75">{aiData.overview}</p>
                </div>

                {/* ── Key Decisions ── */}
                {aiData.keyDecisions.length > 0 && (
                  <div className={`py-5 border-t border-black/[0.06] transition-all duration-300 ${aiTypingIdx >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-3.5 h-3.5 text-[#204CC7]" />
                      <span className="text-[13px] font-semibold text-black/70">Key Decisions</span>
                    </div>
                    <div className="space-y-2">
                      {aiData.keyDecisions.map((d, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <ArrowRight className="w-3 h-3 text-[#204CC7]/50 mt-[4px] flex-shrink-0" />
                          <span className="text-[13.5px] leading-[1.5] text-black/65">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Action Items ── */}
                {aiData.actionItems.length > 0 && (
                  <div className={`py-5 border-t border-black/[0.06] transition-all duration-300 ${aiTypingIdx >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[13px] font-semibold text-black/70">Action Items</span>
                      <span className="ml-auto text-[12px] text-black/30 tabular-nums">
                        {aiData.actionItems.filter(a => a.status === 'done').length}/{aiData.actionItems.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {aiData.actionItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 py-2 px-0.5"
                        >
                          {item.status === 'done' ? (
                            <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 mt-px flex-shrink-0" />
                          ) : (
                            <CircleDot className="w-[18px] h-[18px] text-black/20 mt-px flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13.5px] leading-[1.45] ${item.status === 'done' ? 'text-black/35 line-through' : 'text-black/70'}`}>
                              {item.text}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[12px] ${item.status === 'done' ? 'text-black/25' : 'text-black/40'}`}>{item.owner}</span>
                              {item.due && item.due !== 'Done' && (
                                <>
                                  <span className="text-black/15">·</span>
                                  <span className={`text-[12px] font-medium ${
                                    item.due === 'ASAP' ? 'text-[#E2445C]' : 'text-black/35'
                                  }`}>
                                    {item.due}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Drawer Footer */}
          {aiData && !aiLoading && (
            <div className="px-5 py-3 border-t border-black/[0.06] flex-shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-black/25">AI-generated · {aiData.generatedAt}</span>
              <button
                onClick={handleSummarize}
                className="text-[12px] font-medium text-black/40 hover:text-black/70 transition-colors"
                aria-label="Regenerate summary"
              >
                Regenerate
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Slide-in animation keyframe */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
