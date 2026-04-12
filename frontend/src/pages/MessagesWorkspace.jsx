import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Compass,
  Inbox,
  Map,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  addMentorshipFollowup,
  createMentorshipRequest,
  fetchChatMessages,
  fetchUserChats,
  generateMentorBrief,
  loadMentorContext,
  loadMentorshipBookmark,
  loadMentorshipFollowups,
  loadMentorshipNotes,
  loadUserProfile,
  saveMentorshipBookmark,
  saveMentorshipNotes,
  sendMentorChatMessage,
  updateMentorshipFollowup,
} from '../lib/mentorSystem';
import { getStoredUser, isMentorRole } from '../lib/session';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  if (new Date().toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const focusOptions = [
  'Academic Help',
  'Career Guidance',
  'Project Direction',
  'Higher Studies',
  'Interview Prep',
];

const contextTypeLabel = {
  upload: 'My Upload',
  saved: 'Saved Resource',
  summary: 'AI Summary',
  roadmap: 'Roadmap',
};

const emptyContextPool = {
  uploads: [],
  saved: [],
  summaries: [],
  roadmap: [],
};

const mentorReplyTemplates = [
  {
    id: 'roadmap',
    label: '30-day roadmap',
    text: `Here is a simple 30-day roadmap for you:
Week 1: Understand the fundamentals and identify the exact weak areas.
Week 2: Practice consistently on one focused topic each day.
Week 3: Build or solve one concrete problem end to end.
Week 4: Review progress, fix gaps, and prepare the next milestone.

Start with one clear deliverable this week and send me your progress update after that.`,
  },
  {
    id: 'resources',
    label: 'Resource guidance',
    text: `Here is how I suggest you continue:
1. Pick one primary resource and avoid switching too often.
2. Revise the basics first before moving to advanced material.
3. Keep a short list of doubts and send them in one focused message.

If you want, I can next help you choose the best resource order for this topic.`,
  },
  {
    id: 'next-step',
    label: 'Next-step reply',
    text: `You do not need to solve everything at once. Focus on one next step:
- define the exact topic or problem
- spend 45 minutes working on it
- note where you get stuck
- come back with that specific blocker

Send me that and I will guide you further.`,
  },
];

const roadmapMessagePrefix = '[CAMPUSIQ_ROADMAP]';

const buildRoadmapMessage = ({ title, goal, duration, milestones, checkIn }) =>
  `${roadmapMessagePrefix}${JSON.stringify({
    title: String(title || '').trim() || 'Mentorship Roadmap',
    goal: String(goal || '').trim(),
    duration: String(duration || '').trim() || '4 weeks',
    milestones: milestones.map((item) => String(item || '').trim()).filter(Boolean),
    checkIn: String(checkIn || '').trim(),
  })}`;

const parseRoadmapMessage = (text = '') => {
  if (!String(text).startsWith(roadmapMessagePrefix)) {
    return null;
  }

  try {
    return JSON.parse(String(text).slice(roadmapMessagePrefix.length));
  } catch {
    return null;
  }
};

const getFriendlyError = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 404) {
    return '';
  }

  return error?.response?.data?.message || error?.message || fallback;
};

const buildOpeningMessage = ({ requestType, goals, challenge, targetOutcome, firstMessage, contextItems }) => {
  const cleanFirstMessage = String(firstMessage || '').trim();
  if (cleanFirstMessage.length >= 24) {
    return cleanFirstMessage;
  }

  const lines = [
    `Hi, I would like mentorship for ${String(requestType || 'general guidance').toLowerCase()}.`,
  ];

  if (goals) {
    lines.push(`What I need help with: ${goals}.`);
  }

  if (challenge) {
    lines.push(`Current challenge: ${challenge}.`);
  }

  if (targetOutcome) {
    lines.push(`Target outcome: ${targetOutcome}.`);
  }

  if (contextItems?.length) {
    lines.push(`Context I am sharing: ${contextItems.map((item) => item.label).join(', ')}.`);
  }

  lines.push('I would appreciate one clear next step to begin.');
  return lines.join('\n');
};

const MessagesWorkspace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useMemo(() => getStoredUser(), []);
  const [conversations, setConversations] = useState([]);
  const [activeWithUserId, setActiveWithUserId] = useState(searchParams.get('user') || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [targetProfile, setTargetProfile] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [followups, setFollowups] = useState([]);
  const [bookmark, setBookmark] = useState({ starred: false, target: '', personalNotes: '', updatedAt: null });
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [contextPool, setContextPool] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefData, setBriefData] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [chatNotice, setChatNotice] = useState('');
  const [showStudentPanel, setShowStudentPanel] = useState(false);
  const [showRoadmapComposer, setShowRoadmapComposer] = useState(false);
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    goal: '',
    duration: '4 weeks',
    milestoneOne: '',
    milestoneTwo: '',
    milestoneThree: '',
    checkIn: '',
  });
  const [requestForm, setRequestForm] = useState({
    requestType: 'Career Guidance',
    goals: '',
    challenge: '',
    targetOutcome: '',
    firstMessage: '',
    contextIds: [],
  });
  const messagesEndRef = useRef(null);
  const studentMode = !isMentorRole(currentUser?.role);
  const composeMode = searchParams.get('compose');
  const showRequestComposer = studentMode && composeMode === 'request' && Boolean(activeWithUserId);

  const loadConversations = useCallback(async () => {
    try {
      const items = await fetchUserChats();
      setConversations(items);
      setLoadingConvs(false);

      const requestedUser = searchParams.get('user');
      if (requestedUser) {
        setActiveWithUserId(requestedUser);
      } else if (!activeWithUserId && items[0]?.withUserId) {
        setActiveWithUserId(items[0].withUserId);
      }
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to load conversations'));
      setLoadingConvs(false);
    }
  }, [activeWithUserId, searchParams]);

  const hydrateMentorshipWorkspace = useCallback(async (withUserId) => {
    setLoadingMessages(true);
    setError('');
    try {
      const [messageItems, profileResult, notesResult, followupsResult, bookmarkResult] = await Promise.allSettled([
        fetchChatMessages(withUserId),
        loadUserProfile(withUserId),
        loadMentorshipNotes(withUserId),
        loadMentorshipFollowups(withUserId),
        studentMode ? loadMentorshipBookmark(withUserId) : Promise.resolve(null),
      ]);

      if (messageItems.status !== 'fulfilled') {
        throw messageItems.reason;
      }

      setMessages(messageItems.value);
      setTargetProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
      setNotes(notesResult.status === 'fulfilled' ? notesResult.value.notes || '' : '');
      setFollowups(followupsResult.status === 'fulfilled' ? followupsResult.value : []);
      setBookmark(bookmarkResult.status === 'fulfilled' && bookmarkResult.value
        ? bookmarkResult.value
        : { starred: false, target: '', personalNotes: '', updatedAt: null });

      if (profileResult.status !== 'fulfilled') {
        setChatNotice('Public profile details are missing, but the mentorship thread is still available.');
      } else {
        setChatNotice('');
      }
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to load messages'));
    } finally {
      setLoadingMessages(false);
    }
  }, [studentMode]);

  useEffect(() => {
    loadConversations();
    const intervalId = window.setInterval(loadConversations, 5000);
    return () => window.clearInterval(intervalId);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeWithUserId) {
      setMessages([]);
      setTargetProfile(null);
      setNotes('');
      setFollowups([]);
      setBookmark({ starred: false, target: '', personalNotes: '', updatedAt: null });
      setShowStudentPanel(false);
      return;
    }

    hydrateMentorshipWorkspace(activeWithUserId);
  }, [activeWithUserId, hydrateMentorshipWorkspace]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((item) => item.withUserId === activeWithUserId) || null;
  const activeProfile = targetProfile || activeConv || null;
  const inboxLabel = studentMode ? 'Mentorship Hub' : 'Mentor Inbox';
  const roleLabel = studentMode ? 'Your mentor conversations' : 'Incoming student guidance';

  useEffect(() => {
    if (!showRequestComposer) {
      setBriefData(null);
      return;
    }

    setRequestForm((prev) => ({
      ...prev,
      requestType: String(activeProfile?.role || activeProfile?.withUserRole || '').toLowerCase() === 'faculty'
        ? 'Academic Help'
        : prev.requestType || 'Career Guidance',
    }));

    if (!contextPool) {
      loadMentorContext()
        .then(setContextPool)
        .catch(() => setContextPool(emptyContextPool));
    }
  }, [activeProfile?.role, activeProfile?.withUserRole, contextPool, showRequestComposer]);

  const contextOptions = [
    ...(contextPool?.uploads || []).slice(0, 3).map((item) => ({ id: `upload-${item.id}`, type: 'upload', label: item.title })),
    ...(contextPool?.saved || []).slice(0, 3).map((item) => ({ id: `saved-${item.id}`, type: 'saved', label: item.title })),
    ...(contextPool?.summaries || []).slice(0, 3).map((item) => ({ id: `summary-${item.id}`, type: 'summary', label: item.title || item.subject || 'AI Summary' })),
    ...(contextPool?.roadmap || []).slice(0, 3).map((item) => ({ id: `roadmap-${item.id}`, type: 'roadmap', label: item.title })),
  ];
  const selectedContextItems = contextOptions
    .filter((item) => requestForm.contextIds.includes(item.id))
    .map((item) => ({
      label: item.label,
      type: contextTypeLabel[item.type] || item.type,
    }));
  const structuredOpeningPreview = buildOpeningMessage({
    requestType: requestForm.requestType,
    goals: requestForm.goals,
    challenge: requestForm.challenge,
    targetOutcome: requestForm.targetOutcome,
    firstMessage: requestForm.firstMessage,
    contextItems: selectedContextItems,
  });

  const filtered = conversations.filter((item) =>
    item.withUserName?.toLowerCase().includes(search.toLowerCase()),
  );
  const completedFollowups = followups.filter((item) => item.status === 'done').length;
  const activeDisplayName = activeProfile?.withUserName || activeProfile?.name || 'CampusIQ User';
  const activeDisplayRole = String(activeProfile?.withUserRole || activeProfile?.role || 'student').toLowerCase();
  const activeDisplayAvatar = activeProfile?.withUserAvatar || activeProfile?.profilePic || '';
  const activeProfileHighlights = [
    activeProfile?.company,
    activeProfile?.college,
    activeProfile?.headline,
  ].filter(Boolean).slice(0, 2);

  const applyMentorTemplate = (templateText) => {
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${templateText}` : templateText));
  };

  const submitRoadmapCard = async () => {
    if (!activeWithUserId || sending) return;

    const roadmapText = buildRoadmapMessage({
      title: roadmapForm.title,
      goal: roadmapForm.goal,
      duration: roadmapForm.duration,
      milestones: [
        roadmapForm.milestoneOne,
        roadmapForm.milestoneTwo,
        roadmapForm.milestoneThree,
      ],
      checkIn: roadmapForm.checkIn,
    });

    setSending(true);
    setError('');

    try {
      await sendMentorChatMessage({
        withUserId: activeWithUserId,
        text: roadmapText,
      });
      setShowRoadmapComposer(false);
      setRoadmapForm({
        title: '',
        goal: '',
        duration: '4 weeks',
        milestoneOne: '',
        milestoneTwo: '',
        milestoneThree: '',
        checkIn: '',
      });
      await loadConversations();
      const updatedMessages = await fetchChatMessages(activeWithUserId);
      setMessages(updatedMessages);
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to send roadmap'));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!activeWithUserId || !draft.trim() || sending) return;

    setSending(true);
    setError('');

    try {
      await sendMentorChatMessage({
        withUserId: activeWithUserId,
        text: draft,
      });
      setDraft('');
      await loadConversations();
      const updatedMessages = await fetchChatMessages(activeWithUserId);
      setMessages(updatedMessages);
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeWithUserId) return;
    setSavingNotes(true);
    try {
      await saveMentorshipNotes({ withUserId: activeWithUserId, notes });
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to save mentorship notes'));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveBookmark = async (nextBookmark = bookmark) => {
    if (!activeWithUserId || !studentMode) return;
    setSavingBookmark(true);
    try {
      await saveMentorshipBookmark({
        withUserId: activeWithUserId,
        starred: nextBookmark.starred,
        target: nextBookmark.target,
        personalNotes: nextBookmark.personalNotes,
      });
      setBookmark((prev) => ({
        ...prev,
        ...nextBookmark,
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to save mentorship bookmark'));
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleAddTask = async () => {
    if (!activeWithUserId || !newTask.trim()) return;
    setSavingTask(true);
    try {
      const followup = await addMentorshipFollowup({
        withUserId: activeWithUserId,
        task: newTask,
        dueDate: newDueDate,
      });
      setFollowups((prev) => [followup, ...prev]);
      setNewTask('');
      setNewDueDate('');
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to add follow-up task'));
    } finally {
      setSavingTask(false);
    }
  };

  const toggleTask = async (followup) => {
    const nextStatus = followup.status === 'done' ? 'pending' : 'done';
    try {
      await updateMentorshipFollowup({ followupId: followup.id, status: nextStatus });
      setFollowups((prev) =>
        prev.map((item) => (item.id === followup.id ? { ...item, status: nextStatus } : item)),
      );
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to update follow-up task'));
    }
  };

  const closeRequestComposer = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('compose');
    setSearchParams(nextParams);
  };

  const handleGenerateBrief = async () => {
    if (!activeWithUserId) return;
    setBriefLoading(true);
    try {
      const response = await generateMentorBrief(activeWithUserId);
      setBriefData(response);
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to generate AI mentor brief'));
    } finally {
      setBriefLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!activeWithUserId || requesting) return;
    setRequesting(true);
    setError('');

    try {
      const contextItems = selectedContextItems;
      const openingMessage = buildOpeningMessage({
        requestType: requestForm.requestType,
        goals: requestForm.goals,
        challenge: requestForm.challenge,
        targetOutcome: requestForm.targetOutcome,
        firstMessage: requestForm.firstMessage,
        contextItems,
      });

      await createMentorshipRequest({
        mentorId: activeWithUserId,
        payload: {
          requestType: requestForm.requestType,
          goals: requestForm.goals,
          challenge: requestForm.challenge,
          targetOutcome: requestForm.targetOutcome,
          firstMessage: openingMessage,
          contextItems,
        },
      });

      closeRequestComposer();
      await loadConversations();
      await hydrateMentorshipWorkspace(activeWithUserId);
    } catch (err) {
      setError(getFriendlyError(err, 'Failed to start mentorship request'));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <div className="flex-row gap-24 ms-container">
        <aside className="flex-column gap-20 ms-inbox">
          <header className="flex-column gap-6" style={{ width: '100%', padding: '0 4px' }}>
            <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
              <Inbox size={16} />
              <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>{roleLabel}</span>
            </div>
            <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.02em', fontWeight: 800 }}>{inboxLabel}</h2>
          </header>

        <div className="premium-card flex-column" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
        <div className="flex-column gap-16 p-20" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="premium-card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(46, 230, 166, 0.08) 0%, rgba(0, 0, 0, 0) 100%)', border: '1px solid rgba(46, 230, 166, 0.1)' }}>
            <div className="flex-row justify-between items-center gap-12">
              <div className="flex-column gap-2">
                <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.7 }}>Active threads</span>
                <strong className="premium-text-h3" style={{ margin: 0, fontSize: '18px' }}>{conversations.length}</strong>
              </div>
              <div className="flex-column gap-2 items-end">
                <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.7 }}>{studentMode ? 'Structured outreach' : 'Student guidance'}</span>
                <span className="premium-text-meta" style={{ color: 'var(--accent)', fontSize: '11px', fontWeight: 500 }}>
                  {studentMode ? 'AI brief + guided opener' : 'Reply with focused guidance'}
                </span>
              </div>
            </div>
          </div>

          <div className="premium-card flex-row gap-12 items-center" style={{ padding: '10px 14px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <Search size={14} color="var(--muted)" />
            <input
              className="premium-text-body"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '13px' }}
              placeholder="Filter conversations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {error ? <div className="error-msg" style={{ margin: 0, fontSize: '12px' }}>{error}</div> : null}
        </div>

        <div className="flex-column" style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {loadingConvs ? <div className="p-24"><p className="premium-text-meta">Loading conversations...</p></div> : null}

          {!loadingConvs && filtered.length === 0 ? (
            <div className="p-24">
              <p className="premium-text-meta">
                No conversations yet. Students can start from the mentor directory, and mentors will see incoming chats here automatically.
              </p>
              {studentMode ? (
                <Link to="/mentors" className="premium-button-secondary" style={{ display: 'inline-flex', marginTop: '16px' }}>
                  Browse mentors
                </Link>
              ) : null}
            </div>
          ) : null}

          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setActiveWithUserId(conversation.withUserId);
                setSearchParams({ user: conversation.withUserId });
              }}
              style={{
                border: '1px solid transparent',
                background: activeWithUserId === conversation.withUserId
                  ? 'linear-gradient(135deg, rgba(46, 230, 166, 0.08) 0%, rgba(94, 126, 255, 0.05) 100%)'
                  : 'transparent',
                borderColor: activeWithUserId === conversation.withUserId ? 'rgba(46, 230, 166, 0.15)' : 'transparent',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '16px',
                margin: '0 12px 8px',
                width: 'calc(100% - 24px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div className="flex-row gap-12 items-center">
                <div style={{ width: 44, height: 44, borderRadius: '14px', background: activeWithUserId === conversation.withUserId ? 'var(--accent)' : 'var(--surface-elevated)', overflow: 'hidden', display: 'grid', placeItems: 'center', fontWeight: 800, color: activeWithUserId === conversation.withUserId ? '#000' : 'var(--text)', flexShrink: 0, border: '1px solid var(--border-subtle)', transition: 'all 0.3s' }}>
                  {conversation.withUserAvatar ? (
                    <img src={conversation.withUserAvatar} alt={conversation.withUserName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '14px' }}>{getInitials(conversation.withUserName)}</span>
                  )}
                </div>
                <div className="flex-column gap-2" style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-row justify-between items-center gap-8">
                    <span className="premium-text-h3" style={{ fontSize: '13px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.withUserName}</span>
                    <span className="premium-text-meta" style={{ fontSize: '10px', opacity: 0.4, flexShrink: 0 }}>{formatTime(conversation.lastMessageAt)}</span>
                  </div>
                  <div className="flex-row justify-between items-center gap-8">
                    <p className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.6, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conversation.lastMessage || 'Conversation started'}
                    </p>
                    <span className="premium-text-meta" style={{ color: 'var(--accent)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, flexShrink: 0 }}>
                      {String(conversation.withUserRole || (studentMode ? 'mentor' : 'student')).toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        </div>
      </aside>

      <main className="premium-card flex-column ms-chat-area">
        {!activeWithUserId ? (
          <div className="flex-column items-center justify-center gap-24" style={{ flex: 1, opacity: 0.35 }}>
            <MessageCircle size={64} />
            <p className="premium-text-body">Select a mentor conversation to start chatting</p>
          </div>
        ) : (
          <>
            <header className="flex-row items-center ms-chat-header">
              <div className="flex-row gap-14 items-center">
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(46, 230, 166, 0.08)', border: '1px solid rgba(46, 230, 166, 0.15)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                  {activeDisplayAvatar ? (
                    <img src={activeDisplayAvatar} alt={activeDisplayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(activeDisplayName)
                  )}
                </div>
                <div className="flex-column gap-2">
                  <div className="flex-row gap-8 items-center">
                    <h3 className="premium-text-h3" style={{ fontSize: '16px', margin: 0 }}>
                      {activeDisplayName}
                    </h3>
                    <span className="premium-chip-outline" style={{ fontSize: '9px', color: 'var(--accent)', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px' }}>
                      {activeDisplayRole}
                    </span>
                  </div>
                  <div className="flex-row gap-8 items-center">
                    <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.7 }}>{activeProfile?.headline || activeProfile?.bio || 'Mentorship thread active'}</span>
                  </div>
                  {activeProfileHighlights.length ? (
                    <div className="flex-row gap-6 flex-wrap mt-2">
                      {activeProfileHighlights.map((item) => (
                        <span key={item} className="premium-text-meta" style={{ fontSize: '10px', opacity: 0.5, background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px' }}>{item}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex-row gap-12 items-center">
                <div className="flex-row items-center gap-12">
                  <div className="flex-column items-end">
                    <span className="premium-text-meta" style={{ fontSize: '10px', opacity: 0.5 }}>Messages</span>
                    <strong style={{ fontSize: '14px' }}>{messages.length}</strong>
                  </div>
                  {studentMode ? (
                    <div className="flex-column items-end" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
                      <span className="premium-text-meta" style={{ fontSize: '10px', opacity: 0.5 }}>Tasks done</span>
                      <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{completedFollowups}</strong>
                    </div>
                  ) : null}
                </div>
                {studentMode ? (
                  <button
                    type="button"
                    className="premium-button-secondary"
                    style={{ padding: '8px 12px', height: '36px', gap: '6px', fontSize: '13px' }}
                    onClick={() => setShowStudentPanel((prev) => !prev)}
                  >
                    {showStudentPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    <span>{showStudentPanel ? 'Hide tools' : 'Tools'}</span>
                  </button>
                ) : null}
              </div>
            </header>

            <div className="flex-column gap-16 ms-messages-scroll">
              {chatNotice ? (
                <div className="premium-card" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', maxWidth: '520px' }}>
                  <p className="premium-text-meta">{chatNotice}</p>
                </div>
              ) : null}

              {loadingMessages ? <p className="premium-text-meta">Loading messages...</p> : null}

              {!loadingMessages && messages.length === 0 ? (
                <div className="premium-card flex-column gap-16" style={{ maxWidth: '560px', background: 'var(--surface-elevated)' }}>
                  <div className="flex-row gap-10 items-center">
                    <MessageCircle size={18} color="var(--accent)" />
                    <strong>{studentMode ? 'Start with a clear mentorship ask' : 'Welcome the student with a clear next step'}</strong>
                  </div>
                  <p className="premium-text-meta">
                    {studentMode
                      ? 'Good mentorship chats start with context, a concrete goal, and what kind of help you need.'
                      : 'Strong mentor replies acknowledge the request, define the next milestone, and make the student feel guided.'}
                  </p>
                  <div className="flex-column gap-8">
                    {(studentMode
                      ? ['Introduce your current situation', 'State the exact outcome you want', 'Ask for one clear next step']
                      : ['Acknowledge the student goal', 'Give one focused action item', 'Set the expectation for the follow-up']
                    ).map((item) => (
                      <div key={item} className="flex-row gap-8 items-center">
                        <CheckCircle2 size={14} color="var(--accent)" />
                        <span className="premium-text-meta">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex-column ${message.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}
                  style={{ alignSelf: message.senderId === currentUser?.id ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: '12px' }}
                >
                  {parseRoadmapMessage(message.text) ? (
                    <div
                      className="premium-card flex-column gap-12"
                      style={{
                        minWidth: '280px',
                        padding: '16px',
                        background: message.senderId === currentUser?.id
                          ? 'linear-gradient(135deg, rgba(46, 230, 166, 0.12) 0%, rgba(94, 126, 255, 0.08) 100%)'
                          : 'var(--surface-elevated)',
                        borderRadius: message.senderId === currentUser?.id ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        border: message.senderId === currentUser?.id ? '1px solid rgba(46, 230, 166, 0.2)' : '1px solid var(--border-subtle)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      {(() => {
                        const roadmap = parseRoadmapMessage(message.text);
                        return (
                          <>
                            <div className="flex-row justify-between items-start gap-12">
                              <div className="flex-row gap-8 items-center">
                                <Map size={14} color="var(--accent)" />
                                <strong style={{ color: 'var(--text)', fontSize: '14px' }}>{roadmap.title}</strong>
                              </div>
                              <span className="premium-chip-outline" style={{ fontSize: '9px' }}>{roadmap.duration}</span>
                            </div>
                            {roadmap.goal ? (
                              <p className="premium-text-meta" style={{ margin: 0, color: 'rgba(230, 238, 255, 0.82)', fontSize: '12px' }}>
                                Goal: {roadmap.goal}
                              </p>
                            ) : null}
                            <div className="flex-column gap-6">
                              {roadmap.milestones.map((item, index) => (
                                <div key={`${item}-${index}`} className="flex-row gap-8 items-start">
                                  <span className="premium-chip" style={{ minWidth: '20px', height: '20px', justifyContent: 'center', fontSize: '10px', padding: 0 }}>{index + 1}</span>
                                  <span className="premium-text-meta" style={{ color: 'rgba(244, 247, 255, 0.92)', fontSize: '12px' }}>{item}</span>
                                </div>
                              ))}
                            </div>
                            {roadmap.checkIn ? (
                              <div className="premium-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px' }}>
                                <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.7 }}>Check-in: {roadmap.checkIn}</span>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      className="premium-card"
                      style={{
                        padding: '14px 20px',
                        background: message.senderId === currentUser?.id ? 'var(--accent)' : 'var(--surface-elevated)',
                        borderRadius: message.senderId === currentUser?.id ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        color: message.senderId === currentUser?.id ? '#000' : 'var(--text)'
                      }}
                    >
                      <p className="premium-text-body" style={{ fontSize: '15px', margin: 0, whiteSpace: 'pre-wrap', color: 'inherit', fontWeight: message.senderId === currentUser?.id ? 600 : 400 }}>{message.text}</p>
                    </div>
                  )}
                  <div className="flex-row gap-4 items-center mt-2 px-4" style={{ opacity: 0.4 }}>
                    <span className="premium-text-meta" style={{ fontSize: '9px' }}>
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-32" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
              {!studentMode ? (
                <div className="flex-row gap-8 flex-wrap mb-12">
                  <button
                    type="button"
                    className="premium-chip"
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                    onClick={() => setShowRoadmapComposer(true)}
                  >
                    <Map size={12} style={{ marginRight: '4px' }} />
                    Send roadmap
                  </button>
                  {mentorReplyTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="premium-chip-outline"
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                      onClick={() => applyMentorTemplate(template.text)}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex-row gap-12 items-center" style={{ background: 'var(--surface-2)', borderRadius: '24px', padding: '12px 16px', border: '1px solid var(--border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <input
                  className="premium-text-body"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', padding: '8px 4px', fontSize: '15px' }}
                  placeholder={`Message ${activeProfile?.withUserName || activeProfile?.name || 'mentor'}...`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                />
                <button 
                  className="premium-button" 
                  style={{ borderRadius: '16px', width: '44px', height: '44px', padding: 0, display: 'grid', placeItems: 'center', flexShrink: 0 }} 
                  onClick={sendMessage} 
                  disabled={!draft.trim() || sending}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {studentMode ? (
        <>
          {showStudentPanel ? <div className="profile-panel-backdrop" onClick={() => setShowStudentPanel(false)} /> : null}
          <aside
            className="flex-column"
            style={{
              background: 'var(--bg)',
              height: 'calc(100vh - 64px)',
              overflowY: 'auto',
              position: 'fixed',
              top: '64px',
              right: 0,
              width: 'min(380px, 92vw)',
              zIndex: 30,
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: '-18px 0 48px rgba(0, 0, 0, 0.28)',
              transform: showStudentPanel ? 'translateX(0)' : 'translateX(110%)',
              transition: 'transform 0.28s ease',
            }}
          >
            <div className="p-24 flex-column gap-20">
              <div className="flex-row justify-between items-center">
                <div className="flex-column gap-4">
                  <strong>Student tools</strong>
                  <span className="premium-text-meta">Bookmarks, notes, and follow-ups live here.</span>
                </div>
                <button type="button" className="premium-button-secondary" onClick={() => setShowStudentPanel(false)}>
                  <X size={16} />
                </button>
              </div>

              {activeWithUserId ? (
                <>
            <section className="premium-card flex-column gap-14" style={{ background: 'linear-gradient(135deg, rgba(46, 230, 166, 0.08) 0%, rgba(94, 126, 255, 0.06) 100%)' }}>
              <div className="flex-row gap-12 items-center">
                <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'var(--surface-elevated)', overflow: 'hidden', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                  {activeDisplayAvatar ? (
                    <img src={activeDisplayAvatar} alt={activeDisplayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(activeDisplayName)
                  )}
                </div>
                <div className="flex-column gap-4">
                  <strong>{activeDisplayName}</strong>
                  <span className="premium-text-meta" style={{ textTransform: 'capitalize' }}>{activeDisplayRole}</span>
                </div>
              </div>
              <div className="flex-row gap-10 flex-wrap">
                <span className="premium-chip-outline">Thread active</span>
                <span className="premium-chip-outline">{messages.length} messages</span>
                <span className="premium-chip-outline">{followups.length} follow-ups</span>
              </div>
              <p className="premium-text-meta" style={{ margin: 0 }}>
                {activeProfile?.bio || activeProfile?.headline || 'Use this workspace to turn mentor advice into actions you can track.'}
              </p>
            </section>

            <section className="premium-card flex-column gap-14" style={{ background: 'linear-gradient(135deg, rgba(46, 230, 166, 0.08) 0%, rgba(94, 126, 255, 0.06) 100%)' }}>
              <div className="flex-row gap-8 items-center">
                <MessageCircle size={16} color="var(--accent)" />
                <strong>Communication framework</strong>
              </div>
              <div className="flex-column gap-8">
                {['Share your current stage clearly', 'Keep each message focused on one problem', 'Convert mentor advice into action items on the right'].map((item) => (
                  <div key={item} className="flex-row gap-8 items-start">
                    <CheckCircle2 size={14} color="var(--accent)" style={{ marginTop: '2px' }} />
                    <span className="premium-text-meta">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="premium-card flex-column gap-14" style={{ background: 'var(--surface-elevated)' }}>
                <div className="flex-row justify-between items-center">
                  <div className="flex-row gap-8 items-center">
                    <CheckCircle2 size={16} color="var(--accent)" />
                    <strong>My mentorship bookmark</strong>
                  </div>
                  <button
                    type="button"
                    className={bookmark.starred ? 'premium-chip' : 'premium-chip-outline'}
                    onClick={() => {
                      const nextBookmark = { ...bookmark, starred: !bookmark.starred };
                      setBookmark(nextBookmark);
                      handleSaveBookmark(nextBookmark);
                    }}
                  >
                    {bookmark.starred ? 'Starred' : 'Star this'}
                  </button>
                </div>
                <input
                  value={bookmark.target || ''}
                  onChange={(event) => setBookmark((prev) => ({ ...prev, target: event.target.value }))}
                  placeholder="Set a target for this mentor relationship"
                  style={{ background: 'var(--surface-elevated)', color: 'var(--text)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}
                />
                <textarea
                  rows="4"
                  value={bookmark.personalNotes || ''}
                  onChange={(event) => setBookmark((prev) => ({ ...prev, personalNotes: event.target.value }))}
                  placeholder="Save the most useful advice from this mentor for yourself"
                  style={{ width: '100%', background: 'var(--surface-elevated)', color: 'var(--text)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px', resize: 'vertical' }}
                />
                <button className="premium-button-secondary" onClick={() => handleSaveBookmark()} disabled={savingBookmark}>
                  {savingBookmark ? 'Saving bookmark...' : 'Save bookmark'}
                </button>
            </section>

            <section className="premium-card flex-column gap-14">
              <div className="flex-row gap-8 items-center">
                <ClipboardList size={16} color="var(--accent)" />
                <strong>Mentorship notes</strong>
              </div>
              <textarea
                rows="8"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Capture advice, action points, deadlines, and takeaways from this mentorship thread..."
                style={{
                  width: '100%',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  resize: 'vertical',
                }}
              />
              <button className="premium-button-secondary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? 'Saving notes...' : 'Save notes'}
              </button>
            </section>

            <section className="premium-card flex-column gap-14">
              <div className="flex-row gap-8 items-center">
                <Target size={16} color="var(--warm-accent)" />
                <strong>Follow-up tracker</strong>
              </div>
              <div className="flex-column gap-10">
                <input
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  placeholder="Add an action item from this session"
                  style={{ background: 'var(--surface-elevated)', color: 'var(--text)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                  style={{ background: 'var(--surface-elevated)', color: 'var(--text)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}
                />
                <button className="premium-button" onClick={handleAddTask} disabled={savingTask || !newTask.trim()}>
                  <Plus size={16} />
                  <span>{savingTask ? 'Adding...' : 'Add task'}</span>
                </button>
              </div>

              <div className="flex-column gap-10">
                {followups.length ? followups.map((followup) => (
                  <button
                    key={followup.id}
                    type="button"
                    className="premium-card"
                    onClick={() => toggleTask(followup)}
                    style={{
                      textAlign: 'left',
                      background: followup.status === 'done' ? 'rgba(46,230,166,0.08)' : 'var(--surface-elevated)',
                      borderColor: followup.status === 'done' ? 'rgba(46,230,166,0.18)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex-row justify-between items-start gap-12">
                      <div className="flex-column gap-4">
                        <strong style={{ textDecoration: followup.status === 'done' ? 'line-through' : 'none' }}>{followup.task}</strong>
                        <span className="premium-text-meta">{followup.dueDate ? `Due ${followup.dueDate}` : 'No due date'}</span>
                      </div>
                      <CheckCircle2 size={16} color={followup.status === 'done' ? 'var(--accent)' : 'var(--muted)'} />
                    </div>
                  </button>
                )) : (
                  <p className="premium-text-meta">No follow-up items yet. Add the next concrete step from this mentorship conversation.</p>
                )}
              </div>
            </section>
                </>
              ) : (
                <p className="premium-text-meta">Select a conversation to open notes, bookmarks, and follow-up tracking.</p>
              )}
            </div>
          </aside>
        </>
      ) : null}
      </div>

      {showRequestComposer ? (
        <>
          <div className="mentor-compose-backdrop" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', zIndex: 1000 }} onClick={closeRequestComposer} />
          <aside className="mentor-compose-modal" style={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--surface)', 
            border: '1px solid var(--border-strong)', 
            borderRadius: '32px', 
            padding: '40px 48px', 
            maxWidth: '1200px', 
            width: '96vw', 
            height: '96vh',
            maxHeight: '96vh',
            overflowY: 'auto',
            zIndex: 1001,
            boxSizing: 'border-box',
            boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
            display: 'block'
          }}>
            <div className="flex-column gap-32">
              <div className="flex-row justify-between items-start gap-24">
                <div className="flex-column gap-8">
                  <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
                    <MessageCircle size={16} />
                    <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>
                      New mentorship chat
                    </span>
                  </div>
                  <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '32px', fontWeight: 800 }}>
                    Start with {activeProfile?.name || activeProfile?.withUserName || 'this mentor'}
                  </h2>
                  <p className="premium-text-meta" style={{ fontSize: '14px', opacity: 0.6 }}>
                    This opens as a dedicated chat request, not inside the mentor directory.
                  </p>
                </div>
                <button className="premium-button-secondary" style={{ background: 'var(--surface-elevated)', width: '40px', height: '40px', padding: 0, display: 'grid', placeItems: 'center', borderRadius: '12px' }} onClick={closeRequestComposer}>
                  <X size={20} color="var(--muted)" />
                </button>
              </div>

              <div className="premium-grid-base" style={{ padding: 0, gap: '24px' }}>
                <section className="premium-card flex-column gap-20" style={{ gridColumn: 'span 5', background: 'rgba(46, 230, 166, 0.03)', border: '1px solid rgba(46, 230, 166, 0.15)', padding: '24px', borderRadius: '24px' }}>
                  <div className="flex-row justify-between items-center">
                    <div className="flex-row gap-8 items-center">
                      <BrainCircuit size={18} color="var(--accent)" />
                      <strong style={{ fontSize: '16px' }}>AI mentor intelligence</strong>
                    </div>
                    <button className="premium-button-secondary" style={{ height: '32px', padding: '0 12px', fontSize: '11px', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', border: 'none' }} onClick={handleGenerateBrief} disabled={briefLoading}>
                      {briefLoading ? 'Thinking...' : 'Generate Analysis'}
                    </button>
                  </div>
                  {briefData?.brief ? (
                    <div className="flex-column gap-16">
                      <p className="premium-text-body" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>{briefData.brief.fitSummary}</p>
                      <div className="flex-column gap-8">
                        {(briefData.brief.talkingPoints || []).map((point) => (
                          <div key={point} className="flex-row gap-10 items-center">
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
                            <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.7 }}>{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex-column gap-8 mt-4" style={{ background: 'rgba(46, 230, 166, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(46, 230, 166, 0.1)' }}>
                        <strong className="premium-text-meta" style={{ color: 'var(--accent)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Recommendation</strong>
                        <p className="premium-text-meta" style={{ fontSize: '13px', margin: 0, opacity: 0.9, lineHeight: 1.5 }}>{briefData.brief.mentorAngle}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-column gap-12 py-12">
                      <p className="premium-text-meta" style={{ fontSize: '13px', opacity: 0.5 }}>Generate a quick fit summary and opening angle before sending the request.</p>
                      <div style={{ height: '120px', border: '1px dashed rgba(46, 230, 166, 0.2)', borderRadius: '16px', display: 'grid', placeItems: 'center' }}>
                        <Sparkles size={24} color="var(--accent)" style={{ opacity: 0.1 }} />
                      </div>
                    </div>
                  )}
                </section>

                <section className="flex-column gap-24" style={{ gridColumn: 'span 7' }}>
                  <div className="premium-grid-base" style={{ padding: 0, gap: '16px' }}>
                    <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                      <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Focus area</label>
                      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 14px' }}>
                        <select
                          value={requestForm.requestType}
                          onChange={(event) => setRequestForm((prev) => ({ ...prev, requestType: event.target.value }))}
                          style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                        >
                          {focusOptions.map((option) => (
                            <option key={option} value={option} style={{ background: 'var(--surface)' }}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                      <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Target outcome</label>
                      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 14px' }}>
                        <input
                          value={requestForm.targetOutcome}
                          onChange={(event) => setRequestForm((prev) => ({ ...prev, targetOutcome: event.target.value }))}
                          placeholder="30-day roadmap"
                          style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                    <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                      <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Need help with</label>
                      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 14px' }}>
                        <input
                          value={requestForm.goals}
                          onChange={(event) => setRequestForm((prev) => ({ ...prev, goals: event.target.value }))}
                          placeholder="DSA, OS, Projects"
                          style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Current challenge</label>
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '14px' }}>
                      <textarea
                        rows="2"
                        value={requestForm.challenge}
                        onChange={(event) => setRequestForm((prev) => ({ ...prev, challenge: event.target.value }))}
                        placeholder="Describe where you are stuck right now"
                        style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '14px', resize: 'none' }}
                      />
                    </div>
                  </div>

                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Opening message</label>
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '14px' }}>
                      <textarea
                        rows="2"
                        value={requestForm.firstMessage}
                        onChange={(event) => setRequestForm((prev) => ({ ...prev, firstMessage: event.target.value }))}
                        placeholder="Write the tone and context you want the mentor to see"
                        style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '14px', resize: 'none' }}
                      />
                    </div>
                  </div>

                  <div className="flex-column gap-12">
                    <span className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--accent)', opacity: 0.8, textTransform: 'uppercase' }}>Ask mentor with context</span>
                    {contextOptions.length ? (
                      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 14px' }}>
                        <select
                          value={requestForm.contextIds[0] || ''}
                          onChange={(event) => setRequestForm((prev) => ({ ...prev, contextIds: event.target.value ? [event.target.value] : [] }))}
                          style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                        >
                          <option value="" style={{ background: 'var(--surface)' }}>Select specific context or resource...</option>
                          {contextOptions.map((item) => (
                            <option key={item.id} value={item.id} style={{ background: 'var(--surface)' }}>{item.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.4 }}>No extra study context found. You can still continue with the request.</span>
                    )}
                  </div>



                  <div className="flex-row justify-between items-center pt-8">
                    <div className="premium-text-meta" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', maxWidth: '300px' }}>
                      This sends a structured first message and opens the thread immediately.
                    </div>
                    <button className="premium-button" style={{ height: '48px', padding: '0 32px', fontSize: '15px', fontWeight: 600 }} onClick={submitRequest} disabled={requesting}>
                      {requesting ? 'Initializing...' : 'Start Mentorship Chat'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {!studentMode && showRoadmapComposer ? (
        <>
          <div className="mentor-compose-backdrop" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 1000 }} onClick={() => setShowRoadmapComposer(false)} />
          <aside className="mentor-compose-modal" style={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#0a0a0a', 
            border: '1px solid rgba(16, 185, 129, 0.2)', 
            borderRadius: '32px', 
            padding: '40px', 
            maxWidth: '820px', 
            width: '92vw', 
            maxHeight: '94vh',
            overflowY: 'auto',
            zIndex: 1001,
            boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
            display: 'block'
          }}>
            <div className="flex-column gap-32">
              <div className="flex-row justify-between items-start gap-24">
                <div className="flex-column gap-8">
                  <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                    <Map size={16} />
                    <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                      Mentor roadmap
                    </span>
                  </div>
                  <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
                    Roadmap for {activeDisplayName}
                  </h2>
                  <p className="premium-text-meta" style={{ fontSize: '14px', opacity: 0.6 }}>
                    This sends a clean roadmap card inside the chat so the student can follow the plan clearly.
                  </p>
                </div>
                <button className="premium-button-secondary" style={{ background: '#000', padding: '8px 20px', fontSize: '13px' }} onClick={() => setShowRoadmapComposer(false)}>Close</button>
              </div>

              <div className="premium-grid-base" style={{ padding: 0, gap: '20px' }}>
                <div className="flex-column gap-20" style={{ gridColumn: 'span 6' }}>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Roadmap title</label>
                    <div style={{ background: '#000', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '10px 14px' }}>
                      <input
                        value={roadmapForm.title}
                        onChange={(event) => setRoadmapForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Placement prep roadmap"
                        style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Core Goal</label>
                    <div style={{ background: '#000', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '12px' }}>
                      <textarea
                        rows="3"
                        value={roadmapForm.goal}
                        onChange={(event) => setRoadmapForm((prev) => ({ ...prev, goal: event.target.value }))}
                        placeholder="Crack core interview rounds with stronger confidence"
                        style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px', resize: 'none' }}
                      />
                    </div>
                  </div>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Duration</label>
                    <div style={{ background: '#000', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '10px 14px' }}>
                      <input
                        value={roadmapForm.duration}
                        onChange={(event) => setRoadmapForm((prev) => ({ ...prev, duration: event.target.value }))}
                        placeholder="e.g. 4 weeks"
                        style={{ width: '100%', background: 'none', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-column gap-16" style={{ gridColumn: 'span 6', padding: '24px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '24px' }}>
                   <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '10px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Milestone 1</label>
                    <input
                      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', outline: 'none' }}
                      value={roadmapForm.milestoneOne}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, milestoneOne: event.target.value }))}
                      placeholder="OS processes and memory basics"
                    />
                  </div>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '10px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Milestone 2</label>
                    <input
                      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', outline: 'none' }}
                      value={roadmapForm.milestoneTwo}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, milestoneTwo: event.target.value }))}
                      placeholder="Practice 20 DSA questions"
                    />
                  </div>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '10px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Milestone 3</label>
                    <input
                      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', outline: 'none' }}
                      value={roadmapForm.milestoneThree}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, milestoneThree: event.target.value }))}
                      placeholder="Mock interview review"
                    />
                  </div>
                  <div className="flex-column gap-8">
                    <label className="premium-text-meta" style={{ fontSize: '10px', color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase' }}>Reporting check-in</label>
                    <input
                      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', color: 'rgba(16, 185, 129, 0.8)', fontSize: '12px', outline: 'none' }}
                      value={roadmapForm.checkIn}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, checkIn: event.target.value }))}
                      placeholder="Update me after milestone 1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-row justify-between items-center pt-8">
                <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.5 }}>This card will be pinned to the student's conversation.</span>
                <button className="premium-button" style={{ height: '48px', padding: '0 32px', fontSize: '15px', fontWeight: 600 }} onClick={submitRoadmapCard} disabled={sending}>
                  {sending ? 'Sending...' : 'Send Roadmap Card'}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
};

export default MessagesWorkspace;
