import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { initializeApp } from 'firebase/app';
import { createClient } from '@supabase/supabase-js';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, 'logs');
const uploadErrorLogPath = path.join(logsDir, 'upload-errors.log');
const uploadRequestLogPath = path.join(logsDir, 'upload-requests.log');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/live' });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/debug/ping', (_req, res) => {
  res.json({
    ok: true,
    service: 'CampusIQ backend',
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString(),
  });
});

const usersRef = collection(db, 'users');
const resourcesRef = collection(db, 'resources');
const aiSummariesRef = collection(db, 'ai_summaries');
const discussionThreadsRef = collection(db, 'discussion_threads');
const liveClassesRef = collection(db, 'live_classes');
const opportunitiesRef = collection(db, 'opportunities');
const notificationsRef = collection(db, 'notifications');
const roadmapsRef = collection(db, 'roadmaps');
const mentorBookingsRef = collection(db, 'mentor_bookings');
const mentorProfilesRef = collection(db, 'mentor_profiles');
const mentorRequestsRef = collection(db, 'mentor_requests');
const mentorSessionNotesRef = collection(db, 'mentor_session_notes');
const mentorFollowupsRef = collection(db, 'mentor_followups');
const mentorshipBookmarksRef = collection(db, 'mentorship_bookmarks');
const communityPostsRef = collection(db, 'community_posts');
const communityProfilesRef = collection(db, 'profiles');
const connectionsRef = collection(db, 'connections');
const liveRoomsRef = collection(db, 'live_rooms');
const announcementsRef = collection(db, 'announcements');
const eventRsvpsRef = collection(db, 'event_rsvps');
const teamPostsRef = collection(db, 'team_posts');
const teamRequestsRef = collection(db, 'team_requests');
const savedResourcesRef = collection(db, 'saved_resources');
const studyRoomsRef = collection(db, 'study_rooms');

const updateCollabScore = async (userId, points) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      collabScore: increment(points),
      lastContributionAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to update collab score:', error);
  }
};

const SUMMARY_TEXT_LIMIT = 42000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_KEYS = Array.from(
  new Set([
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ]),
).filter(Boolean);

let currentKeyIndex = 0;
const getNextGeminiKey = () => {
  if (!GEMINI_KEYS.length) return null;
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
};

const issueToken = (userId) =>
  new Promise((resolve, reject) => {
    jwt.sign(
      { user: { id: userId } },
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(token);
      },
    );
  });

const authenticateToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userSnapshot = await getDoc(doc(db, 'users', decoded.user.id));

    if (!userSnapshot.exists()) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: userSnapshot.id,
      ...userSnapshot.data(),
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const normalizeTimestamp = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const parseTimestampValue = (value) => {
  const normalized = normalizeTimestamp(value);
  if (!normalized) {
    return 0;
  }

  return new Date(normalized).getTime();
};

const uniqueById = (items) =>
  items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);

const sortByNewest = (items, key = 'createdAt') =>
  [...items].sort((a, b) => parseTimestampValue(b[key]) - parseTimestampValue(a[key]));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const emptyArray = [];

const mapBasicUser = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name || 'CampusIQ User',
    email: data.email || '',
    role: data.role || 'Student',
    headline: data.headline || '',
    branch: data.branch || '',
    year: data.year || '',
    avatar: data.avatar || '',
    contributionScore: data.contributionScore || 0,
    skills: Array.isArray(data.skills) ? data.skills : emptyArray,
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const mapNotification = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId || null,
    title: data.title || 'CampusIQ update',
    body: data.body || '',
    type: data.type || 'general',
    read: Boolean(data.read),
    ctaLabel: data.ctaLabel || 'Open',
    ctaRoute: data.ctaRoute || '/dashboard',
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const deriveSkillsForUser = ({ user, uploads, summaries, savedResources }) => {
  const explicitSkills = Array.isArray(user.skills) ? user.skills : [];
  const uploadSkills = uploads
    .map((item) => item.course || item.branch || item.type)
    .filter(Boolean)
    .slice(0, 6);
  const summarySkills = summaries
    .map((item) => item.subject || item.resourceType)
    .filter(Boolean)
    .slice(0, 4);
  const savedSkills = savedResources
    .map((item) => item.course || item.branch)
    .filter(Boolean)
    .slice(0, 4);

  return Array.from(new Set([...explicitSkills, ...uploadSkills, ...summarySkills, ...savedSkills])).slice(0, 8);
};

const mapDiscussionMessage = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    authorId: data.authorId || '',
    authorName: data.authorName || 'Anonymous',
    text: data.text || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    isAI: Boolean(data.isAI),
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const mapDiscussionThread = (snapshot, { currentUserId = null, messageCount = 0 } = {}) => {
  const data = snapshot.data();
  const joinedUsers = Array.isArray(data.joinedUsers) ? data.joinedUsers : [];
  const votes = Number(data.votes || 0);
  const userVotes = data.userVotes && typeof data.userVotes === 'object' ? data.userVotes : {};

  return {
    id: snapshot.id,
    title: data.title || 'Untitled discussion',
    description: data.description || '',
    channel: data.channel || 'General',
    topic: data.topic || data.channel || 'General',
    authorId: data.authorId || '',
    authorName: data.authorName || 'Anonymous',
    solved: Boolean(data.solved),
    roomActive: Boolean(data.roomActive),
    roomId: data.roomId || null,
    roomLabel: data.roomLabel || 'Doubt solving room',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    votes,
    replyCount: Number(data.replyCount || messageCount || 0),
    activeUsers: joinedUsers.length,
    joined: currentUserId ? joinedUsers.includes(currentUserId) : false,
    joinedUsers,
    unreadCount: Number((data.unreadCounts || {})[currentUserId] || 0),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt || data.createdAt),
    latestMessagePreview: data.latestMessagePreview || '',
    userVote: Number(userVotes[currentUserId] || 0),
    isMine: Boolean(currentUserId && currentUserId === data.authorId),
  };
};

const mapLiveClass = (snapshot, currentUserId) => {
  const data = snapshot.data();
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const enrolledUsers = Array.isArray(data.enrolledUsers) ? data.enrolledUsers : [];
  const seatLimit = Number(data.seatLimit || 0);
  const seatsFilled = Number(data.seatsFilled || enrolledUsers.length || 0);
  const startsAt = normalizeTimestamp(data.startsAt);
  const endsAt = normalizeTimestamp(data.endsAt);
  const now = Date.now();
  const startTime = parseTimestampValue(startsAt);
  const endTime = parseTimestampValue(endsAt);

  let status = data.status || 'upcoming';
  if (startTime && endTime && now >= startTime && now <= endTime) {
    status = 'live';
  } else if (endTime && now > endTime) {
    status = 'recorded';
  }

  return {
    id: snapshot.id,
    title: data.title || 'Live session',
    topic: data.topic || '',
    subject: data.subject || '',
    mentorName: data.mentorName || 'CampusIQ Mentor',
    mentorHeadline: data.mentorHeadline || '',
    mentorAvatar: data.mentorAvatar || '',
    mentorId: data.mentorId || '',
    startsAt,
    endsAt,
    countdownMs: startTime ? Math.max(startTime - now, 0) : 0,
    status,
    joinUrl: data.joinUrl || '',
    platform: data.platform || 'Meet',
    seatLimit,
    seatsFilled,
    seatsRemaining: seatLimit ? Math.max(seatLimit - seatsFilled, 0) : null,
    recordingUrl: data.recordingUrl || '',
    reminderSet: reminders.includes(currentUserId),
    reminderCount: reminders.length,
    joined: enrolledUsers.includes(currentUserId),
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const mapOpportunity = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: data.title || 'Recommended opportunity',
    type: data.type || 'Recommendation',
    description: data.description || '',
    ctaRoute: data.ctaRoute || '/resources',
    ctaLabel: data.ctaLabel || 'Explore',
    matchScore: Number(data.matchScore || 0),
    tags: Array.isArray(data.tags) ? data.tags : emptyArray,
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const mapRoadmapItem = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: data.title || 'Career milestone',
    stage: data.stage || 'Next step',
    description: data.description || '',
    progress: clamp(Number(data.progress || 0), 0, 100),
    ctaRoute: data.ctaRoute || '/roadmap',
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const logUploadError = async (error, context = {}) => {
  try {
    await fs.mkdir(logsDir, { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify({
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
      context,
    })}\n`;
    await fs.appendFile(uploadErrorLogPath, line, 'utf8');
  } catch {
    // Ignore logging failures so they never mask the real request error.
  }
};

const logUploadRequest = async (context = {}) => {
  try {
    await fs.mkdir(logsDir, { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify(context)}\n`;
    await fs.appendFile(uploadRequestLogPath, line, 'utf8');
  } catch {
    // Ignore logging failures.
  }
};

const mapResource = (snapshot, savedIds = new Set()) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: data.title,
    year: data.year,
    branch: data.branch,
    semester: data.semester,
    course: data.course,
    type: data.type,
    section: data.section,
    tags: data.tags || [],
    description: data.description || '',
    visibility: data.visibility || 'Campus Wide',
    fileUrl: data.fileUrl,
    uploadedBy: data.uploadedBy,
    uploaderId: data.uploaderId,
    downloads: data.downloads || 0,
    saves: data.saves || 0,
    ratingAverage: data.ratingAverage || 0,
    ratingCount: data.ratingCount || 0,
    createdAt: normalizeTimestamp(data.createdAt),
    saved: savedIds.has(snapshot.id),
  };
};

const sanitizeList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : typeof value === 'string'
      ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      : [];

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCurrentIsoTime = () => new Date().toISOString();

const normalizeRole = (value) => String(value || '').trim().toLowerCase();

const isMentorRole = (value) => ['faculty', 'graduate', 'mentor', 'admin'].includes(normalizeRole(value));

const uploadFileToPublicBucket = async (file, prefix = 'community') => {
  if (!file?.buffer) {
    return null;
  }

  const safeFileName = `${prefix}-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
  const { error } = await supabase.storage
    .from('pdfs')
    .upload(safeFileName, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('pdfs').getPublicUrl(safeFileName);

  return {
    url: publicUrl,
    name: file.originalname,
    type: file.mimetype || 'application/octet-stream',
    size: file.size || 0,
  };
};

const buildUserPreview = (user = {}) => ({
  id: user.id || '',
  name: user.name || 'CampusIQ User',
  role: user.role || 'Student',
  headline: user.headline || '',
  branch: user.branch || '',
  year: user.year || '',
  avatar: user.avatar || '',
  skills: Array.isArray(user.skills) ? user.skills : [],
});

const mapMentorProfile = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    role: normalizeRole(data.role || ''),
    profilePic: data.profilePic || '',
    college: data.college || '',
    experience: safeNumber(data.experience, 0),
    subjects: sanitizeList(data.subjects),
    researchAreas: sanitizeList(data.researchAreas),
    graduationYear: data.graduationYear || '',
    skills: sanitizeList(data.skills),
    currentJob: data.currentJob || '',
    company: data.company || '',
    goals: data.goals || '',
    cvUrl: data.cvUrl || '',
    bio: data.bio || '',
    availableForMentorship: data.availableForMentorship !== false,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
};

const buildMentorView = (userSnapshot, profileSnapshot = null) => {
  const userData = userSnapshot.data();
  const profile = profileSnapshot?.exists() ? mapMentorProfile(profileSnapshot) : null;
  const role = normalizeRole(profile?.role || userData.role || '');
  const skills = profile?.skills?.length
    ? profile.skills
    : Array.isArray(userData.skills)
      ? userData.skills
      : [];
  const subjects = profile?.subjects?.length
    ? profile.subjects
    : sanitizeList(userData.subjects);

  return {
    id: userSnapshot.id,
    name: userData.name || 'CampusIQ User',
    email: userData.email || '',
    role,
    profilePic: profile?.profilePic || userData.avatar || '',
    bio: profile?.bio || userData.headline || '',
    college: profile?.college || '',
    experience: safeNumber(profile?.experience, 0),
    subjects,
    researchAreas: profile?.researchAreas || [],
    graduationYear: profile?.graduationYear || '',
    skills,
    currentJob: profile?.currentJob || '',
    company: profile?.company || '',
    goals: profile?.goals || '',
    cvUrl: profile?.cvUrl || '',
    availableForMentorship: profile ? profile.availableForMentorship : isMentorRole(role),
    contributionScore: safeNumber(userData.contributionScore, 0),
    branch: userData.branch || '',
    year: userData.year || '',
    careerPath: [
      profile?.college ? `Academic base: ${profile.college}` : null,
      profile?.subjects?.length ? `Mentors in: ${profile.subjects.slice(0, 3).join(', ')}` : null,
      profile?.graduationYear ? `Graduated in ${profile.graduationYear}` : null,
      profile?.currentJob ? `Current role: ${profile.currentJob}` : null,
      profile?.company ? `Company: ${profile.company}` : null,
      profile?.skills?.length ? `Skills used: ${profile.skills.slice(0, 4).join(', ')}` : null,
    ].filter(Boolean),
    createdAt: profile?.createdAt || normalizeTimestamp(userData.createdAt),
  };
};

const uniqueNormalized = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const buildMentorMatch = (student = {}, mentor = {}) => {
  let score = 45;
  const reasons = [];

  const studentSkills = uniqueNormalized(student.skills);
  const mentorSkills = uniqueNormalized(mentor.skills, mentor.subjects, mentor.researchAreas);
  const mentorCareer = uniqueNormalized([mentor.currentJob, mentor.company, mentor.bio]);
  const studentGoals = uniqueNormalized([student.headline, student.branch, student.year, student.careerInterest, student.goals, student.weakSubjects]);

  const sharedSkills = studentSkills.filter((item) => mentorSkills.includes(item));
  if (sharedSkills.length) {
    score += Math.min(sharedSkills.length * 10, 25);
    reasons.push(`Shared focus areas: ${sharedSkills.slice(0, 3).join(', ')}`);
  }

  if (student.branch && mentor.bio?.toLowerCase().includes(String(student.branch).toLowerCase())) {
    score += 8;
    reasons.push(`Mentor bio aligns with ${student.branch}`);
  }

  if (student.branch && mentor.college?.toLowerCase().includes(String(student.branch).toLowerCase())) {
    score += 6;
    reasons.push(`Academic path is relevant to ${student.branch}`);
  }

  if (student.year && mentor.experience) {
    score += 4;
    reasons.push(`Mentor depth fits a ${student.year} student journey`);
  }

  if (mentor.role === 'faculty' && mentor.subjects?.length) {
    score += 10;
    reasons.push(`Strong academic guidance in ${mentor.subjects.slice(0, 2).join(', ')}`);
  }

  if (mentor.role === 'graduate' && mentorCareer.length) {
    score += 12;
    reasons.push(`Career mentorship available through ${mentor.currentJob || mentor.company || 'industry experience'}`);
  }

  if (studentGoals.some((item) => mentorCareer.join(' ').includes(item))) {
    score += 10;
    reasons.push('Mentor background overlaps with your current direction');
  }

  if (studentGoals.some((item) => String(mentor.goals || '').toLowerCase().includes(item))) {
    score += 8;
    reasons.push('Mentor goals align with what you want to improve');
  }

  return {
    score: clamp(score, 52, 98),
    reasons: reasons.slice(0, 3),
  };
};

const buildMentorshipThreadId = (userA, userB) => [userA, userB].sort().join('_');

const createMentorshipRequestMessage = ({
  studentName,
  requestType,
  goals,
  challenge,
  targetOutcome,
  contextItems = [],
  firstMessage,
}) => {
  const lines = [
    `Mentorship request from ${studentName}`,
    `Focus: ${requestType}`,
  ];

  if (goals) lines.push(`Goals: ${goals}`);
  if (challenge) lines.push(`Current challenge: ${challenge}`);
  if (targetOutcome) lines.push(`Target outcome: ${targetOutcome}`);
  if (contextItems.length) {
    lines.push(`Context: ${contextItems.map((item) => `${item.label}${item.type ? ` (${item.type})` : ''}`).join(', ')}`);
  }
  if (firstMessage) lines.push(`Message: ${firstMessage}`);

  return lines.join('\n');
};

const ensureCommunityProfile = async (user) => {
  if (!user?.id) {
    return null;
  }

  const profileRef = doc(db, 'profiles', user.id);
  await setDoc(
    profileRef,
    {
      userId: user.id,
      name: user.name || 'CampusIQ User',
      role: user.role || 'Student',
      headline: user.headline || '',
      branch: user.branch || '',
      year: user.year || '',
      avatar: user.avatar || '',
      skills: Array.isArray(user.skills) ? user.skills : [],
      interests: Array.isArray(user.interests) ? user.interests : [],
      expertise: Array.isArray(user.skills) ? user.skills.slice(0, 5) : [],
      contributionScore: safeNumber(user.contributionScore, 0),
      updatedAt: serverTimestamp(),
      createdAt: user.createdAt || serverTimestamp(),
    },
    { merge: true },
  );

  return profileRef;
};

const mapCommunityProfile = (snapshot, { currentUserId = null, relationshipMap = new Map() } = {}) => {
  const data = snapshot.data();
  const relationship =
    relationshipMap.get(snapshot.id) ||
    relationshipMap.get(`connect_${[snapshot.id, currentUserId].sort().join('_')}`) ||
    relationshipMap.get(`follow_${currentUserId}_${snapshot.id}`) ||
    {};

  return {
    id: snapshot.id,
    userId: data.userId || snapshot.id,
    name: data.name || 'CampusIQ User',
    role: data.role || 'Student',
    headline: data.headline || '',
    branch: data.branch || '',
    year: data.year || '',
    avatar: data.avatar || '',
    skills: sanitizeList(data.skills),
    interests: sanitizeList(data.interests),
    expertise: sanitizeList(data.expertise),
    contributionScore: safeNumber(data.contributionScore, 0),
    sharedInterests: sanitizeList(data.sharedInterests),
    mutualConnections: safeNumber(data.mutualConnections, 0),
    collaborationCount: safeNumber(data.collaborationCount, 0),
    relationship: relationship.status || 'none',
    followsYou: Boolean(relationship.followsYou),
    youFollow: Boolean(relationship.youFollow),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
};

const mapCommunityComment = (snapshot, { currentUserId = null } = {}) => {
  const data = snapshot.data();
  const reactionCounts =
    data.reactionCounts && typeof data.reactionCounts === 'object' ? data.reactionCounts : {};

  return {
    id: snapshot.id,
    parentId: data.parentId || null,
    postId: data.postId || '',
    author: buildUserPreview(data.author || { id: data.authorId, name: data.authorName }),
    content: data.content || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    mentions: sanitizeList(data.mentions),
    isAI: Boolean(data.isAI),
    isBestAnswer: Boolean(data.isBestAnswer),
    reactionCounts,
    userReaction: currentUserId ? data.userReactions?.[currentUserId] || null : null,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt || data.createdAt),
  };
};

const nestCommunityComments = (comments) => {
  const registry = new Map();
  const roots = [];

  comments.forEach((comment) => {
    registry.set(comment.id, { ...comment, replies: [] });
  });

  registry.forEach((comment) => {
    if (comment.parentId && registry.has(comment.parentId)) {
      registry.get(comment.parentId).replies.push(comment);
      return;
    }

    roots.push(comment);
  });

  const sortTree = (items) =>
    items
      .sort((a, b) => parseTimestampValue(a.createdAt) - parseTimestampValue(b.createdAt))
      .map((item) => ({
        ...item,
        replies: sortTree(item.replies || []),
      }));

  return sortTree(roots);
};

const mapCommunityPost = (snapshot, { currentUserId = null, comments = [] } = {}) => {
  const data = snapshot.data();
  const reactionCounts =
    data.reactionCounts && typeof data.reactionCounts === 'object' ? data.reactionCounts : {};
  const pollOptions = Array.isArray(data.pollOptions)
    ? data.pollOptions.map((option, index) => ({
      id: option?.id || `option-${index + 1}`,
      label: option?.label || `Option ${index + 1}`,
      votes: safeNumber(option?.votes, 0),
    }))
    : [];

  return {
    id: snapshot.id,
    type: data.type || 'discussion',
    title: data.title || 'Untitled post',
    content: data.content || '',
    author: buildUserPreview(data.author || { id: data.authorId, name: data.authorName }),
    tags: sanitizeList(data.tags),
    mentions: sanitizeList(data.mentions),
    urgency: data.urgency || 'normal',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    resourceIds: sanitizeList(data.resourceIds),
    requiredSkills: sanitizeList(data.requiredSkills),
    slotsNeeded: safeNumber(data.slotsNeeded, 0),
    scheduledFor: normalizeTimestamp(data.scheduledFor),
    liveRoomId: data.liveRoomId || null,
    applicants: sanitizeList(data.applicants),
    hasApplied: Boolean(currentUserId && Array.isArray(data.applicants) && data.applicants.includes(currentUserId)),
    solved: Boolean(data.solved),
    bestAnswerId: data.bestAnswerId || null,
    saveCount: safeNumber(data.saveCount, 0),
    shareCount: safeNumber(data.shareCount, 0),
    repostCount: safeNumber(data.repostCount, 0),
    commentCount: safeNumber(data.commentCount, comments.length),
    reactionCounts,
    pollOptions,
    userPollVote: currentUserId ? data.pollVotes?.[currentUserId] || null : null,
    userReaction: currentUserId ? data.userReactions?.[currentUserId] || null : null,
    savedByUser: Boolean(currentUserId && Array.isArray(data.savedBy) && data.savedBy.includes(currentUserId)),
    followers: sanitizeList(data.followers),
    comments: nestCommunityComments(comments),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt || data.createdAt),
  };
};

const mapLiveRoom = (snapshot, currentUserId = null) => {
  const data = snapshot.data();
  const participants = Array.isArray(data.participants) ? data.participants : [];

  return {
    id: snapshot.id,
    title: data.title || 'Live room',
    type: data.type || 'study-room',
    status: data.status || 'live',
    topic: data.topic || '',
    linkedPostId: data.linkedPostId || null,
    jitsiRoomName: data.jitsiRoomName || snapshot.id,
    participantCount: participants.length,
    participants,
    joined: Boolean(currentUserId && participants.includes(currentUserId)),
    notes: data.notes || '',
    whiteboardUrl: data.whiteboardUrl || '',
    recordingUrl: data.recordingUrl || '',
    summary: data.summary || '',
    scheduledFor: normalizeTimestamp(data.scheduledFor),
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt || data.createdAt),
  };
};

const mapAnnouncement = (snapshot, currentUserId = null, rsvpMap = new Map()) => {
  const data = snapshot.data();
  const attendeeIds = Array.isArray(data.attendeeIds) ? data.attendeeIds : [];
  const interestedIds = Array.isArray(data.interestedIds) ? data.interestedIds : [];
  const startsAt = normalizeTimestamp(data.startsAt || data.date);
  const startsAtMs = parseTimestampValue(startsAt);

  return {
    id: snapshot.id,
    title: data.title || 'Announcement',
    description: data.description || '',
    category: data.category || 'announcement',
    bannerUrl: data.bannerUrl || '',
    location: data.location || '',
    startsAt,
    countdownMs: startsAtMs ? Math.max(startsAtMs - Date.now(), 0) : 0,
    attendeeCount: attendeeIds.length,
    interestedCount: interestedIds.length,
    discussionPostId: data.discussionPostId || null,
    calendarUrl: data.calendarUrl || '',
    teammateFriendly: Boolean(data.teammateFriendly),
    rsvpStatus: currentUserId ? rsvpMap.get(snapshot.id) || 'none' : 'none',
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const mapTeamPost = (snapshot, currentUserId = null, requestCount = 0) => {
  const data = snapshot.data();
  const requestedUsers = Array.isArray(data.requestedUsers) ? data.requestedUsers : [];
  const members = Array.isArray(data.members) ? data.members : [];

  return {
    id: snapshot.id,
    title: data.title || 'Team opportunity',
    description: data.description || '',
    creator: buildUserPreview(data.creator || { id: data.creatorId, name: data.creatorName }),
    category: data.category || 'project',
    requiredSkills: sanitizeList(data.requiredSkills),
    branchPreference: sanitizeList(data.branchPreference),
    slotsNeeded: safeNumber(data.slotsNeeded, 1),
    deadline: normalizeTimestamp(data.deadline),
    liveRoomId: data.liveRoomId || null,
    members,
    isCreator: Boolean(currentUserId && data.creator?.id === currentUserId),
    isMember: Boolean(currentUserId && members.includes(currentUserId)),
    requestCount,
    hasRequested: Boolean(currentUserId && requestedUsers.includes(currentUserId)),
    createdAt: normalizeTimestamp(data.createdAt),
  };
};

const buildRelationshipMap = async (currentUserId) => {
  const snapshot = await getDocs(connectionsRef);
  const relationshipMap = new Map();

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.type === 'connect') {
      const people = Array.isArray(data.users) ? data.users : [];
      if (people.includes(currentUserId)) {
        const otherId = people.find((item) => item !== currentUserId);
        if (otherId) {
          relationshipMap.set(otherId, {
            status: data.status || 'connected',
            requestedBy: data.requestedBy || null,
          });
        }
      }
    }

    if (data.type === 'follow' && data.followerId === currentUserId) {
      relationshipMap.set(data.followeeId, {
        ...(relationshipMap.get(data.followeeId) || {}),
        youFollow: true,
        status: (relationshipMap.get(data.followeeId) || {}).status || 'following',
      });
    }

    if (data.type === 'follow' && data.followeeId === currentUserId) {
      relationshipMap.set(data.followerId, {
        ...(relationshipMap.get(data.followerId) || {}),
        followsYou: true,
        status: (relationshipMap.get(data.followerId) || {}).status || 'followed-by',
      });
    }
  });

  return relationshipMap;
};

const getCommunityComments = async (postId, currentUserId) => {
  const snapshot = await getDocs(query(collection(db, 'community_posts', postId, 'comments'), orderBy('createdAt', 'asc')));
  return snapshot.docs.map((docSnap) => mapCommunityComment(docSnap, { currentUserId }));
};

const buildCommunityWorkspace = async (user, { resourceId = '' } = {}) => {
  await ensureCommunityProfile(user);

  const [
    postsSnapshot,
    profilesSnapshot,
    roomsSnapshot,
    announcementsSnapshot,
    teamSnapshot,
    usersSnapshot,
    resourcesSnapshot,
    dmSnapshot,
    relationshipMap,
    savedResourceSnapshot,
  ] = await Promise.all([
    getDocs(query(communityPostsRef, orderBy('createdAt', 'desc'), limit(24))),
    getDocs(query(communityProfilesRef, orderBy('updatedAt', 'desc'), limit(24))),
    getDocs(query(liveRoomsRef, orderBy('updatedAt', 'desc'), limit(12))),
    getDocs(query(announcementsRef, orderBy('startsAt', 'asc'), limit(12))),
    getDocs(query(teamPostsRef, orderBy('createdAt', 'desc'), limit(12))),
    getDocs(query(usersRef, orderBy('createdAt', 'desc'), limit(36))),
    getDocs(query(resourcesRef, orderBy('createdAt', 'desc'), limit(30))),
    getDocs(dmConversationsRef),
    buildRelationshipMap(user.id),
    getDocs(query(savedResourcesRef, where('userId', '==', user.id))),
  ]);

  const savedResourceIds = new Set(savedResourceSnapshot.docs.map((item) => item.data().resourceId).filter(Boolean));

  const posts = await Promise.all(
    postsSnapshot.docs.map(async (docSnap) => {
      const comments = await getCommunityComments(docSnap.id, user.id);
      return mapCommunityPost(docSnap, {
        currentUserId: user.id,
        comments,
      });
    }),
  );

  const teamRequestSnapshots = await Promise.all(
    teamSnapshot.docs.map((docSnap) =>
      getDocs(query(teamRequestsRef, where('teamPostId', '==', docSnap.id))),
    ),
  );

  const connectionSnapshot = await getDocs(query(connectionsRef, where('type', '==', 'connect')));

  const rsvpSnapshot = await getDocs(query(eventRsvpsRef, where('userId', '==', user.id)));
  const rsvpMap = new Map(rsvpSnapshot.docs.map((docSnap) => [docSnap.data().eventId, docSnap.data().status || 'going']));

  const rooms = roomsSnapshot.docs.map((docSnap) => mapLiveRoom(docSnap, user.id));
  const announcements = announcementsSnapshot.docs.map((docSnap) => mapAnnouncement(docSnap, user.id, rsvpMap));
  const teams = teamSnapshot.docs.map((docSnap, index) =>
    mapTeamPost(docSnap, user.id, teamRequestSnapshots[index]?.size || 0),
  );

  const teamRequests = teamRequestSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((docSnap) => {
      const request = docSnap.data();
      return {
        id: docSnap.id,
        teamPostId: request.teamPostId,
        requesterId: request.requesterId,
        requesterName: request.requesterName || 'CampusIQ User',
        message: request.message || '',
        status: request.status || 'pending',
      };
    }),
  );

  const profilesFromUsers = usersSnapshot.docs
    .filter((docSnap) => docSnap.id !== user.id)
    .map((docSnap) => ({
      id: docSnap.id,
      data: () => ({
        userId: docSnap.id,
        ...docSnap.data(),
        expertise: deriveSkillsForUser({
          user: { id: docSnap.id, ...docSnap.data() },
          uploads: [],
          summaries: [],
          savedResources: [],
        }),
      }),
    }));

  const mergedProfiles = uniqueById(
    [
      ...profilesSnapshot.docs.map((docSnap) => mapCommunityProfile(docSnap, { currentUserId: user.id, relationshipMap })),
      ...profilesFromUsers.map((docLike) =>
        mapCommunityProfile(docLike, { currentUserId: user.id, relationshipMap }),
      ),
    ],
  )
    .filter((profile) => profile.id !== user.id)
    .slice(0, 12);

  const incomingConnectionRequests = connectionSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((item) => item.status === 'pending' && item.requestedBy !== user.id && Array.isArray(item.users) && item.users.includes(user.id))
    .map((item) => ({
      id: item.id,
      requesterId: item.requestedBy,
      requesterName: mergedProfiles.find((profile) => profile.id === item.requestedBy)?.name || 'CampusIQ User',
      status: item.status,
    }));

  const conversations = dmSnapshot.docs
    .filter((docSnap) => {
      const participants = Array.isArray(docSnap.data().participants) ? docSnap.data().participants : [];
      return participants.includes(user.id);
    })
    .map((docSnap) => {
      const data = docSnap.data();
      const otherId = (Array.isArray(data.participants) ? data.participants : []).find((item) => item !== user.id) || '';
      return {
        id: docSnap.id,
        withUserId: otherId,
        withUserName: data[`name_${otherId}`] || 'CampusIQ User',
        lastMessage: data.lastMessage || '',
        unreadCount: safeNumber((data.unreadCounts || {})[user.id], 0),
        lastMessageAt: normalizeTimestamp(data.lastMessageAt),
      };
    })
    .sort((a, b) => parseTimestampValue(b.lastMessageAt) - parseTimestampValue(a.lastMessageAt))
    .slice(0, 8);

  const resources = resourcesSnapshot.docs.map((docSnap) => mapResource(docSnap, savedResourceIds));
  const relatedPosts = resourceId
    ? posts.filter((post) => post.resourceIds.includes(resourceId)).slice(0, 6)
    : [];
  const activePeers = resourceId
    ? mergedProfiles.filter((profile) =>
      resources.some((resource) => resource.id === resourceId && sanitizeList(profile.skills).includes(resource.course)),
    ).slice(0, 6)
    : [];
  const upcomingClasses = resourceId
    ? rooms.filter((room) => room.type === 'mini-class' || room.type === 'revision-room').slice(0, 4)
    : [];

  return {
    currentUser: buildUserPreview(user),
    stats: {
      postCount: posts.length,
      liveRoomCount: rooms.filter((room) => room.status === 'live').length,
      eventCount: announcements.length,
      teamCount: teams.length,
      connectionCount: mergedProfiles.filter((profile) => profile.relationship === 'connected').length,
      savedResourceCount: savedResourceIds.size,
    },
    posts,
    profiles: mergedProfiles,
    rooms,
    announcements,
    teams,
    conversations,
    incomingConnectionRequests,
    teamRequests,
    resourceContext: resourceId
      ? {
        resourceId,
        relatedPosts,
        activePeers,
        upcomingClasses,
      }
      : null,
  };
};

const buildSavedIds = async (userId) => {
  try {
    const savedSnapshot = await getDocs(collection(db, 'users', userId, 'savedResources'));
    return new Set(savedSnapshot.docs.map((item) => item.id));
  } catch {
    return new Set();
  }
};

const sortResources = (resources, sortBy) => {
  if (sortBy === 'Most Downloaded') {
    return [...resources].sort((a, b) => b.downloads - a.downloads);
  }

  if (sortBy === 'Top Rated') {
    return [...resources].sort((a, b) => b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount);
  }

  return [...resources].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const onlineSessions = new Map();

const getOnlineUsers = () =>
  Array.from(onlineSessions.values()).map((session) => ({
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
  }));

const getOnlineCount = () => onlineSessions.size;

const emitRealtimeRefresh = (channels = [], payload = {}) => {
  const serialized = JSON.stringify({
    type: 'refresh',
    channels,
    payload,
    at: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState !== 1) {
      return;
    }

    const subscribedChannels = client.subscriptions || new Set();
    if (!channels.length || channels.some((channel) => subscribedChannels.has(channel))) {
      client.send(serialized);
    }
  });
};

const buildDerivedRecommendations = ({ user, resources, savedResources, summaries }) => {
  const focusTerms = Array.from(
    new Set(
      [
        user.branch,
        user.year,
        ...savedResources.map((item) => item.course),
        ...summaries.map((item) => item.subject),
      ].filter(Boolean),
    ),
  );

  return resources
    .filter((item) => item.uploaderId !== user.id)
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type === 'PYQ' ? 'PYQ Opportunity' : 'Resource Recommendation',
      description: `${item.course} | ${item.branch} | ${item.section}`,
      ctaRoute: item.type === 'PYQ' ? '/resources' : '/resources',
      ctaLabel: item.type === 'PYQ' ? 'Open PYQ' : 'Open resource',
      matchScore: focusTerms.some((term) => `${item.course} ${item.branch} ${item.title}`.includes(term)) ? 92 : 74,
      tags: uniqueById(
        [item.branch, item.course, item.type, item.section]
          .filter(Boolean)
          .map((tag, index) => ({ id: `${item.id}-${index}`, value: tag })),
      ).map((entry) => entry.value),
      createdAt: item.createdAt,
    }))
    .slice(0, 6);
};

const buildDefaultRoadmap = ({ user, summaryCount, uploadCount }) => [
  {
    id: 'foundation',
    title: `${user.branch || 'Core'} knowledge map`,
    stage: 'Foundation',
    description: 'Lock in high-frequency topics, PYQs, and revision notes for your current branch.',
    progress: clamp(uploadCount * 12, 18, 82),
    ctaRoute: '/roadmap',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'practice',
    title: 'Peer discussion mastery',
    stage: 'Practice',
    description: 'Convert doubt solving and thread participation into a repeatable study feedback loop.',
    progress: clamp(summaryCount * 18, 10, 76),
    ctaRoute: '/community',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'career',
    title: 'Career roadmap milestones',
    stage: 'Career',
    description: 'Track mentorship, live sessions, and role-aligned learning goals across the semester.',
    progress: 34,
    ctaRoute: '/roadmap',
    createdAt: new Date().toISOString(),
  },
];

const normalizeAiSummary = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    resourceId: data.resourceId,
    userId: data.userId,
    resourceTitle: data.resourceTitle || '',
    resourceType: data.resourceType || '',
    pdfUrl: data.pdfUrl || '',
    subject: data.subject || '',
    branch: data.branch || '',
    semester: data.semester || '',
    summary: data.summary || [],
    keyConcepts: data.keyConcepts || {
      terms: [],
      formulas: [],
      definitions: [],
      examTopics: [],
    },
    unitWiseBreakdown: data.unitWiseBreakdown || [],
    questions: data.questions || [],
    revisionPoints: data.revisionPoints || [],
    difficultyLevel: data.difficultyLevel || 'Important',
    examProbabilityTags: data.examProbabilityTags || [],
    repeatedPyqConcepts: data.repeatedPyqConcepts || [],
    relatedNotes: data.relatedNotes || [],
    flashcards: data.flashcards || [],
    shareSlug: data.shareSlug || snapshot.id,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
};

const getTextBetweenBraces = (value) => {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return value.slice(start, end + 1);
};

const parseSummaryPayload = (value) => {
  if (!value) {
    throw new Error('Gemini did not return any content');
  }

  const sanitized = value
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  const candidate = getTextBetweenBraces(sanitized) || sanitized;
  return JSON.parse(candidate);
};

const normalizeStringList = (value, fallback = []) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;

const normalizeBreakdown = (value) =>
  Array.isArray(value)
    ? value
      .map((item, index) => ({
        title: String(item?.title || item?.unit || `Section ${index + 1}`).trim(),
        summary: normalizeStringList(item?.summary),
        topics: normalizeStringList(item?.topics),
      }))
      .filter((item) => item.summary.length || item.topics.length)
    : [];

const normalizeFlashcards = (value) =>
  Array.isArray(value)
    ? value
      .map((item) => ({
        front: String(item?.front || '').trim(),
        back: String(item?.back || '').trim(),
      }))
      .filter((item) => item.front && item.back)
    : [];

const inferDifficulty = (payload) => {
  const accepted = ['Easy', 'Medium', 'Important'];
  return accepted.includes(payload?.difficultyLevel) ? payload.difficultyLevel : 'Important';
};

const buildSummaryPrompt = ({ resource, extractedText }) => `
You are CampusIQ, an elite academic copilot that converts academic PDFs into structured, revision-ready intelligence.

Analyze the following academic PDF text and return ONLY valid JSON with this exact schema:
{
  "quickSummary": ["5 to 7 concise bullets"],
  "keyConcepts": {
    "terms": ["important technical terms"],
    "formulas": ["formula or equation bullets"],
    "definitions": ["high-value definitions"],
    "examTopics": ["topics most likely to matter in exam or viva"]
  },
  "unitWiseBreakdown": [
    {
      "title": "Unit or section title",
      "summary": ["2 to 4 mini-summary bullets"],
      "topics": ["segmented topics inside that unit"]
    }
  ],
  "importantQuestions": ["likely viva, lab, descriptive, or exam questions"],
  "lastDayRevision": ["ultra-short 1 minute revision bullets"],
  "difficultyLevel": "Easy or Medium or Important",
  "subject": "best inferred subject",
  "examProbabilityTags": ["High Probability", "Viva", "Numerical", "Theory", "PYQ Repeat", etc],
  "repeatedPyqConcepts": ["concepts that look repeatedly examinable or PYQ-like"],
  "flashcards": [
    {
      "front": "question or prompt",
      "back": "answer"
    }
  ]
}

Rules:
- No markdown.
- No explanation outside JSON.
- Make the output feel premium, academic, and exam-oriented.
- Use concise bullets, not paragraphs.
- If formulas are missing, return an empty array for formulas.
- If the PDF structure is weak, infer sensible section segmentation.
- Subject should be inferred from content, course, and title.

Resource title: ${resource.title}
Course: ${resource.course}
Type: ${resource.type}
Section: ${resource.section}
Branch: ${resource.branch}
Semester: ${resource.semester}

PDF text:
${extractedText}
`;

const buildQuizPrompt = ({ resource, extractedText }) => `
You are CampusIQ, an elite academic assistant. 
Generate a high-quality academic quiz from the following PDF text.

Rules:
1. Generate exactly 5 Multiple Choice Questions (MCQs).
2. Each question must have exactly 3 options.
3. Only ONE option must be correct.
4. Return ONLY valid JSON with this exact schema:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C"],
      "correctAnswer": "The exact text of the correct option"
    }
  ]
}

Resource Title: ${resource.title}
Course: ${resource.course}

PDF text:
${extractedText}
`;

const callGeminiSummary = async (payload, retryCount = 0) => {
  const apiKey = getNextGeminiKey();
  if (!apiKey) {
    throw new Error('No Gemini API keys are configured on the backend');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: payload }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const isOverloaded = response.status === 503 || response.status === 429;
      if (isOverloaded && retryCount < GEMINI_KEYS.length && GEMINI_KEYS.length > 1) {
        console.warn(`Gemini Key at index ${currentKeyIndex - 1} is overloaded. Rotating key...`);
        return callGeminiSummary(payload, retryCount + 1);
      }
      throw new Error(data?.error?.message || 'Gemini request failed');
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    return parseSummaryPayload(text);
  } catch (error) {
    if (retryCount < GEMINI_KEYS.length && GEMINI_KEYS.length > 1) {
      console.warn(`Gemini request failed with "${error.message}". Rotating key...`);
      return callGeminiSummary(payload, retryCount + 1);
    }
    throw error;
  }
};

const callGeminiChat = async (payload, chatHistory = [], retryCount = 0) => {
  const apiKey = getNextGeminiKey();
  if (!apiKey) {
    throw new Error('No Gemini API keys are configured on the backend');
  }

  // Gemini REST API expects each element to be { role: 'user' | 'model', parts: [{ text: '...' }] }
  const contents = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text || '' }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: payload }],
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const isOverloaded = response.status === 503 || response.status === 429;
      if (isOverloaded && retryCount < GEMINI_KEYS.length && GEMINI_KEYS.length > 1) {
        console.warn(`Gemini Key at index ${currentKeyIndex - 1} is overloaded. Rotating key...`);
        return callGeminiChat(payload, chatHistory, retryCount + 1);
      }
      throw new Error(data?.error?.message || 'Gemini request failed');
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    return text;
  } catch (error) {
    if (retryCount < GEMINI_KEYS.length && GEMINI_KEYS.length > 1) {
      console.warn(`Gemini chat request failed with "${error.message}". Rotating key...`);
      return callGeminiChat(payload, chatHistory, retryCount + 1);
    }
    throw error;
  }
};

const getPdfBufferFromUrl = async (pdfUrl) => {
  const response = await fetch(pdfUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF from URL (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
};

const extractAcademicText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const rawText = String(parsed?.text || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error('No readable text could be extracted from this PDF');
  }

  return trimmed.slice(0, SUMMARY_TEXT_LIMIT);
};

const findRelatedNotes = async (resource, currentResourceId) => {
  try {
    const relatedQuery = query(resourcesRef, where('branch', '==', resource.branch));
    const snapshot = await getDocs(relatedQuery);

    return snapshot.docs
      .filter((item) => item.data().semester === resource.semester)
      .filter((item) => item.id !== currentResourceId)
      .sort(
        (a, b) =>
          new Date(normalizeTimestamp(b.data().createdAt) || 0) -
          new Date(normalizeTimestamp(a.data().createdAt) || 0),
      )
      .map((item) => ({
        id: item.id,
        title: item.data().title,
        type: item.data().type,
        course: item.data().course,
      }))
      .filter((item) => item.title)
      .slice(0, 3);
  } catch {
    return [];
  }
};

const buildSummaryDocument = async ({ resourceSnapshot, userId, parsedSummary }) => {
  const resource = resourceSnapshot.data();
  const relatedNotes = await findRelatedNotes(resource, resourceSnapshot.id);

  return {
    resourceId: resourceSnapshot.id,
    userId,
    resourceTitle: resource.title,
    resourceType: resource.type,
    pdfUrl: resource.fileUrl,
    course: resource.course,
    branch: resource.branch,
    semester: resource.semester,
    subject: String(parsedSummary?.subject || resource.course || '').trim(),
    summary: normalizeStringList(parsedSummary?.quickSummary),
    keyConcepts: {
      terms: normalizeStringList(parsedSummary?.keyConcepts?.terms),
      formulas: normalizeStringList(parsedSummary?.keyConcepts?.formulas),
      definitions: normalizeStringList(parsedSummary?.keyConcepts?.definitions),
      examTopics: normalizeStringList(parsedSummary?.keyConcepts?.examTopics),
    },
    unitWiseBreakdown: normalizeBreakdown(parsedSummary?.unitWiseBreakdown),
    questions: normalizeStringList(parsedSummary?.importantQuestions),
    revisionPoints: normalizeStringList(parsedSummary?.lastDayRevision),
    difficultyLevel: inferDifficulty(parsedSummary),
    examProbabilityTags: normalizeStringList(parsedSummary?.examProbabilityTags),
    repeatedPyqConcepts: normalizeStringList(parsedSummary?.repeatedPyqConcepts),
    relatedNotes,
    flashcards: normalizeFlashcards(parsedSummary?.flashcards).slice(0, 8),
    shareSlug: resourceSnapshot.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

const getThreadMessages = async (threadId) => {
  const snapshot = await getDocs(collection(db, 'discussion_threads', threadId, 'messages'));
  return sortByNewest(snapshot.docs.map(mapDiscussionMessage), 'createdAt');
};

const buildDiscussionOverview = async (userId) => {
  const [threadSnapshot, notificationSnapshot] = await Promise.all([
    getDocs(discussionThreadsRef),
    getDocs(query(notificationsRef, where('userId', '==', userId))),
  ]);

  const threads = await Promise.all(
    threadSnapshot.docs.map(async (snapshot) => {
      const messages = await getThreadMessages(snapshot.id);
      return {
        ...mapDiscussionThread(snapshot, {
          currentUserId: userId,
          messageCount: messages.length,
        }),
        messages,
      };
    }),
  );

  const channels = Array.from(new Set(threads.map((item) => item.channel).filter(Boolean))).map((name) => ({
    name,
    threadCount: threads.filter((item) => item.channel === name).length,
  }));

  const unreadCount = notificationSnapshot.docs
    .map(mapNotification)
    .filter((item) => !item.read && item.type === 'discussion').length;

  return {
    threads: sortByNewest(threads, 'updatedAt'),
    channels,
    onlineUsers: getOnlineUsers(),
    activeUsersOnline: getOnlineCount(),
    unreadCount,
  };
};

const buildLiveClassesOverview = async (userId) => {
  const liveClassSnapshot = await getDocs(liveClassesRef);
  const classes = sortByNewest(
    liveClassSnapshot.docs.map((snapshot) => mapLiveClass(snapshot, userId)),
    'startsAt',
  );

  return {
    liveNow: classes.filter((item) => item.status === 'live'),
    upcoming: classes.filter((item) => item.status === 'upcoming'),
    recorded: classes.filter((item) => item.status === 'recorded'),
  };
};

const buildDashboardResponse = async (user) => {
  const [resourceSnapshot, savedIds, aiSummarySnapshot, userSnapshot, recommendationSnapshot, roadmapSnapshot, notificationSnapshot, liveClassesOverview, discussionOverview] = await Promise.all([
    getDocs(query(resourcesRef, orderBy('createdAt', 'desc'))),
    buildSavedIds(user.id),
    getDocs(query(aiSummariesRef, where('userId', '==', user.id))),
    getDocs(usersRef),
    getDocs(opportunitiesRef),
    getDocs(roadmapsRef),
    getDocs(query(notificationsRef, where('userId', '==', user.id))),
    buildLiveClassesOverview(user.id),
    buildDiscussionOverview(user.id),
  ]);

  const allResources = resourceSnapshot.docs.map((item) => mapResource(item, savedIds));
  const uploadedByUser = allResources.filter((item) => item.uploaderId === user.id);
  const savedResources = allResources.filter((item) => item.saved);
  const summaries = aiSummarySnapshot.docs.map(normalizeAiSummary);
  const latestPyqs = sortResources(allResources.filter((item) => item.type === 'PYQ'), 'Recent').slice(0, 4);
  const trendingNotes = sortResources(allResources.filter((item) => item.type === 'Notes'), 'Most Downloaded').slice(0, 4);
  const recentUploads = sortByNewest(uploadedByUser, 'createdAt').slice(0, 4);
  const recommendationsFromDb = recommendationSnapshot.docs.map(mapOpportunity);
  const recommendations = recommendationsFromDb.length
    ? recommendationsFromDb.slice(0, 6)
    : buildDerivedRecommendations({
        user,
        resources: allResources,
        savedResources,
        summaries,
      });
  const roadmapItems = roadmapSnapshot.docs.length
    ? roadmapSnapshot.docs.map(mapRoadmapItem).slice(0, 4)
    : buildDefaultRoadmap({
        user,
        summaryCount: summaries.length,
        uploadCount: uploadedByUser.length,
      });
  const mentors = userSnapshot.docs
    .map(mapBasicUser)
    .filter((candidate) => ['mentor', 'faculty', 'admin'].includes(String(candidate.role || '').toLowerCase()))
    .sort((a, b) => b.contributionScore - a.contributionScore)
    .slice(0, 4);
  const notifications = sortByNewest(notificationSnapshot.docs.map(mapNotification), 'createdAt').slice(0, 8);

  const recentActivity = sortByNewest(
    uniqueById(
      [
        ...recentUploads.map((item) => ({
          id: item.id,
          title: item.title,
          action: 'Uploaded resource',
          createdAt: item.createdAt,
        })),
        ...savedResources.map((item) => ({
          id: `${item.id}-saved`,
          title: item.title,
          action: 'Saved resource',
          createdAt: item.createdAt,
        })),
        ...discussionOverview.threads.slice(0, 3).map((item) => ({
          id: `${item.id}-discussion`,
          title: item.title,
          action: item.solved ? 'Solved discussion' : 'Discussion active',
          createdAt: item.updatedAt,
        })),
      ],
    ),
    'createdAt',
  ).slice(0, 6);

  const contributionScore =
    uploadedByUser.length * 12 +
    savedResources.length * 2 +
    uploadedByUser.reduce((total, item) => total + item.downloads, 0) +
    discussionOverview.threads.reduce((total, item) => total + (item.joined ? 2 : 0), 0);

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch || '',
    year: user.year || '',
    skills: deriveSkillsForUser({
      user,
      uploads: uploadedByUser,
      summaries,
      savedResources,
    }),
  };

  return {
    user: profile,
    stats: {
      uploadedCount: uploadedByUser.length,
      savedCount: savedResources.length,
      aiSummariesCount: summaries.length,
      contributionScore,
      activeDiscussions: discussionOverview.threads.length,
      liveClassesCount: liveClassesOverview.liveNow.length + liveClassesOverview.upcoming.length,
      unreadNotifications: notifications.filter((item) => !item.read).length,
      onlineUsers: discussionOverview.activeUsersOnline,
    },
    analytics: {
      totalDownloads: uploadedByUser.reduce((total, item) => total + item.downloads, 0),
      totalSaves: savedResources.length,
      mentorResponses: mentors.length,
      liveSessionsToday: liveClassesOverview.liveNow.length,
    },
    recentUploads,
    recentActivity,
    latestPyqs,
    trendingNotes,
    discussions: discussionOverview.threads.slice(0, 4),
    channels: discussionOverview.channels.slice(0, 5),
    liveClasses: {
      liveNow: liveClassesOverview.liveNow.slice(0, 3),
      upcoming: liveClassesOverview.upcoming.slice(0, 3),
      recorded: liveClassesOverview.recorded.slice(0, 3),
    },
    mentors,
    recommendations,
    roadmap: roadmapItems,
    notifications,
    onlineUsers: discussionOverview.onlineUsers,
  };
};

wss.on('connection', async (socket, request) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const token = requestUrl.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userSnapshot = await getDoc(doc(db, 'users', decoded.user.id));

    if (!userSnapshot.exists()) {
      socket.close(4004, 'User not found');
      return;
    }

    const user = {
      id: userSnapshot.id,
      ...userSnapshot.data(),
    };

    socket.user = user;
    socket.subscriptions = new Set(['dashboard', 'discussions', 'live-classes', 'notifications']);
    onlineSessions.set(user.id, { socket, user });

    socket.send(
      JSON.stringify({
        type: 'welcome',
        payload: {
          userId: user.id,
          onlineUsers: getOnlineCount(),
        },
      }),
    );

    emitRealtimeRefresh(['dashboard', 'discussions', 'live-classes', 'notifications'], {
      onlineUsers: getOnlineCount(),
    });

    socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(String(rawMessage || '{}'));
        if (message.type === 'subscribe' && Array.isArray(message.channels)) {
          socket.subscriptions = new Set(message.channels);
        }
      } catch {
        // Ignore malformed client messages.
      }
    });

    socket.on('close', () => {
      if (onlineSessions.get(user.id)?.socket === socket) {
        onlineSessions.delete(user.id);
      }

      emitRealtimeRefresh(['dashboard', 'discussions', 'live-classes', 'notifications'], {
        onlineUsers: getOnlineCount(),
      });
    });
  } catch {
    socket.close(4002, 'Unauthorized');
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUserQuery = query(usersRef, where('email', '==', email));
    const existingUserSnapshot = await getDocs(existingUserQuery);

    if (!existingUserSnapshot.empty) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userPayload = {
      name,
      email,
      password: hashedPassword,
      role: role || 'Student',
      contributionScore: 0,
      createdAt: serverTimestamp(),
    };

    const userRef = await addDoc(usersRef, userPayload);
    const token = await issueToken(userRef.id);

    res.json({
      token,
      user: { id: userRef.id, name, email, role: userPayload.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const matchedUser = userSnapshot.docs[0];
    const userData = matchedUser.data();
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = await issueToken(matchedUser.id);
    res.json({
      token,
      user: {
        id: matchedUser.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/dashboard/overview', authenticateToken, async (req, res) => {
  try {
    const response = await buildDashboardResponse(req.user);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load dashboard overview' });
  }
});

app.get('/api/dashboard/home', authenticateToken, async (req, res) => {
  try {
    const response = await buildDashboardResponse(req.user);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load dashboard home' });
  }
});

app.get('/api/community/workspace', authenticateToken, async (req, res) => {
  try {
    const response = await buildCommunityWorkspace(req.user, {
      resourceId: req.query.resourceId || '',
    });
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load community workspace' });
  }
});

app.post('/api/community/posts', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      type,
      title,
      content,
      tags,
      urgency,
      mentions,
      resourceIds,
      pollOptions,
      requiredSkills,
      slotsNeeded,
      scheduledFor,
    } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    await ensureCommunityProfile(req.user);
    const attachment = await uploadFileToPublicBucket(req.file, 'community-post');
    const parsedPollOptions = sanitizeList(pollOptions).slice(0, 4).map((label, index) => ({
      id: `option-${index + 1}`,
      label,
      votes: 0,
    }));

    const postRef = await addDoc(communityPostsRef, {
      type: type || 'discussion',
      title: title.trim(),
      content: content.trim(),
      author: buildUserPreview(req.user),
      tags: sanitizeList(tags),
      urgency: urgency || 'normal',
      mentions: sanitizeList(mentions),
      attachments: attachment ? [attachment] : [],
      resourceIds: sanitizeList(resourceIds),
      requiredSkills: sanitizeList(requiredSkills),
      slotsNeeded: safeNumber(slotsNeeded, 0),
      scheduledFor: scheduledFor || null,
      pollOptions: parsedPollOptions,
      liveRoomId: null,
      applicants: [],
      solved: false,
      bestAnswerId: null,
      commentCount: 0,
      saveCount: 0,
      shareCount: 0,
      repostCount: 0,
      reactionCounts: {},
      userReactions: {},
      savedBy: [],
      isAnonymous: req.body.isAnonymous === 'true' || req.body.isAnonymous === true,
      followers: [req.user.id],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateCollabScore(req.user.id, 10); // Points for posting

    emitRealtimeRefresh(['community', 'dashboard', 'notifications']);
    const snapshot = await getDoc(postRef);
    res.status(201).json({
      post: mapCommunityPost(snapshot, { currentUserId: req.user.id, comments: [] }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create community post' });
  }
});

app.post('/api/community/posts/:postId/go-live', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return res.status(404).json({ message: 'Post not found' });
    
    const postData = postSnap.data();
    const roomName = `doubt-${req.params.postId}`;
    
    await updateDoc(postRef, {
      liveRoomId: roomName,
      isLive: true
    });

    // Notify followers (simplified: broadcast to WS)
    broadcastToLive('notifications', {
      type: 'DOUBT_LIVE',
      postId: req.params.postId,
      title: postData.title,
      message: `${postData.author.name} is LIVE resolving a doubt!`
    });

    await updateCollabScore(req.user.id, 50); // High points for going live to help
    res.json({ roomName });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start live session' });
  }
});

app.post('/api/community/posts/:postId/live-summary', authenticateToken, async (req, res) => {
  try {
    const { summary } = req.body;
    const postRef = doc(db, 'community_posts', req.params.postId);
    
    await addDoc(collection(db, 'community_posts', req.params.postId, 'comments'), {
      postId: req.params.postId,
      author: buildUserPreview(req.user),
      content: summary,
      isAcceptedAnswer: true,
      createdAt: serverTimestamp()
    });

    await updateDoc(postRef, {
      solved: true,
      isLive: false
    });

    await updateCollabScore(req.user.id, 30);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save live summary' });
  }
});

app.post('/api/community/posts/:postId/comments', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { content, parentId, mentions } = req.body;
    if (!content?.trim() && !req.file) {
      return res.status(400).json({ message: 'Reply content or attachment is required' });
    }

    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const attachment = await uploadFileToPublicBucket(req.file, 'community-comment');
    const commentRef = await addDoc(collection(db, 'community_posts', req.params.postId, 'comments'), {
      postId: req.params.postId,
      parentId: parentId || null,
      author: buildUserPreview(req.user),
      content: (content || '').trim(),
      mentions: sanitizeList(mentions),
      attachments: attachment ? [attachment] : [],
      reactionCounts: {},
      userReactions: {},
      isAI: false,
      isBestAnswer: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(postRef, {
      commentCount: increment(1),
      updatedAt: serverTimestamp(),
      followers: arrayUnion(req.user.id),
    });

    emitRealtimeRefresh(['community', 'notifications']);
    const commentSnapshot = await getDoc(commentRef);
    res.status(201).json({
      comment: mapCommunityComment(commentSnapshot, { currentUserId: req.user.id }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

app.post('/api/community/posts/:postId/comments/:commentId/solve', authenticateToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const postRef = doc(db, 'community_posts', postId);
    const commentRef = doc(db, 'community_posts', postId, 'comments', commentId);
    
    const [postSnap, commentSnap] = await Promise.all([getDoc(postRef), getDoc(commentRef)]);
    if (!postSnap.exists() || !commentSnap.exists()) return res.status(404).json({ message: 'Post or comment not found' });
    
    const postData = postSnap.data();
    if (postData.author.id !== req.user.id) return res.status(403).json({ message: 'Only the author can solve this doubt' });

    await Promise.all([
      updateDoc(postRef, { solved: true, bestAnswerId: commentId, updatedAt: serverTimestamp() }),
      updateDoc(commentRef, { isBestAnswer: true, updatedAt: serverTimestamp() })
    ]);

    const solverId = commentSnap.data().author.id;
    await updateCollabScore(solverId, 25); // Score for solving a doubt
    
    emitRealtimeRefresh(['community', 'notifications']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as solved' });
  }
});

app.post('/api/community/posts/:postId/react', authenticateToken, async (req, res) => {
  try {
    const { reaction = 'support' } = req.body;
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const data = postSnapshot.data();
    const userReactions = data.userReactions && typeof data.userReactions === 'object' ? data.userReactions : {};
    const reactionCounts = data.reactionCounts && typeof data.reactionCounts === 'object' ? data.reactionCounts : {};
    const previousReaction = userReactions[req.user.id];

    if (previousReaction && reactionCounts[previousReaction]) {
      reactionCounts[previousReaction] = Math.max(0, safeNumber(reactionCounts[previousReaction]) - 1);
    }

    reactionCounts[reaction] = safeNumber(reactionCounts[reaction]) + 1;

    await updateDoc(postRef, {
      reactionCounts,
      [`userReactions.${req.user.id}`]: reaction,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to react to post' });
  }
});

app.post('/api/community/posts/:postId/poll-vote', authenticateToken, async (req, res) => {
  try {
    const { optionId } = req.body;
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const data = postSnapshot.data();
    const pollOptions = Array.isArray(data.pollOptions) ? data.pollOptions : [];
    const nextOptions = pollOptions.map((option) => ({
      ...option,
      votes: option.id === optionId ? safeNumber(option.votes) + 1 : safeNumber(option.votes),
    }));

    await updateDoc(postRef, {
      pollOptions: nextOptions,
      [`pollVotes.${req.user.id}`]: optionId,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to vote on poll' });
  }
});

app.post('/api/community/posts/:postId/save', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const data = postSnapshot.data();
    const alreadySaved = Array.isArray(data.savedBy) && data.savedBy.includes(req.user.id);
    const nextSavedBy = alreadySaved
      ? data.savedBy.filter((item) => item !== req.user.id)
      : [...(Array.isArray(data.savedBy) ? data.savedBy : []), req.user.id];

    await updateDoc(postRef, {
      savedBy: nextSavedBy,
      saveCount: nextSavedBy.length,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ saved: !alreadySaved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save post' });
  }
});

app.post('/api/community/posts/:postId/repost', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await updateDoc(postRef, {
      repostCount: increment(1),
      shareCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to repost post' });
  }
});

app.post('/api/community/posts/:postId/apply', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const data = postSnapshot.data();
    const applicants = Array.isArray(data.applicants) ? data.applicants : [];
    const nextApplicants = applicants.includes(req.user.id)
      ? applicants.filter((item) => item !== req.user.id)
      : [...applicants, req.user.id];

    await updateDoc(postRef, {
      applicants: nextApplicants,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ applied: nextApplicants.includes(req.user.id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update application' });
  }
});

app.post('/api/community/posts/:postId/mark-solved', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await updateDoc(postRef, {
      solved: true,
      bestAnswerId: req.body.bestAnswerId || null,
      updatedAt: serverTimestamp(),
    });

    if (req.body.bestAnswerId) {
      await updateDoc(doc(db, 'community_posts', req.params.postId, 'comments', req.body.bestAnswerId), {
        isBestAnswer: true,
        updatedAt: serverTimestamp(),
      });
    }

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to mark post as solved' });
  }
});

app.post('/api/community/posts/:postId/ai-answer', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postData = postSnapshot.data();
    const answer = await callGeminiChat(
      `You are CampusIQ AI. Summarize the problem and suggest a direct helpful answer for this campus community post.\n\nTitle: ${postData.title}\nType: ${postData.type}\nContent: ${postData.content}`,
      [],
    );

    const commentRef = await addDoc(collection(db, 'community_posts', req.params.postId, 'comments'), {
      postId: req.params.postId,
      parentId: null,
      author: {
        id: 'campusiq-ai',
        name: 'CampusIQ AI',
        role: 'AI Copilot',
      },
      content: answer,
      mentions: [],
      attachments: [],
      reactionCounts: {},
      userReactions: {},
      isAI: true,
      isBestAnswer: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(postRef, {
      commentCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    const commentSnapshot = await getDoc(commentRef);
    res.status(201).json({
      comment: mapCommunityComment(commentSnapshot, { currentUserId: req.user.id }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate AI answer' });
  }
});

app.post('/api/community/posts/:postId/live-room', authenticateToken, async (req, res) => {
  try {
    const postRef = doc(db, 'community_posts', req.params.postId);
    const postSnapshot = await getDoc(postRef);
    if (!postSnapshot.exists()) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postData = postSnapshot.data();
    const roomRef = await addDoc(liveRoomsRef, {
      title: req.body.title || postData.title,
      type: req.body.type || 'quick-doubt-room',
      status: 'live',
      topic: postData.content || '',
      linkedPostId: req.params.postId,
      jitsiRoomName: `campusiq-${req.params.postId}-${Date.now()}`,
      participants: [req.user.id],
      notes: '',
      whiteboardUrl: '',
      recordingUrl: '',
      summary: '',
      scheduledFor: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(postRef, {
      liveRoomId: roomRef.id,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community', 'live-classes']);
    const roomSnapshot = await getDoc(roomRef);
    res.status(201).json({
      room: mapLiveRoom(roomSnapshot, req.user.id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to start live room' });
  }
});

app.post('/api/community/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const roomRef = doc(db, 'live_rooms', req.params.roomId);
    const roomSnapshot = await getDoc(roomRef);
    if (!roomSnapshot.exists()) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await updateDoc(roomRef, {
      participants: arrayUnion(req.user.id),
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community', 'live-classes']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to join live room' });
  }
});

app.post('/api/community/connections/:profileId/connect', authenticateToken, async (req, res) => {
  try {
    if (req.params.profileId === req.user.id) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    const connectionId = `connect_${[req.user.id, req.params.profileId].sort().join('_')}`;
    await setDoc(
      doc(db, 'connections', connectionId),
      {
        type: 'connect',
        users: [req.user.id, req.params.profileId].sort(),
        status: 'pending',
        requestedBy: req.user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    emitRealtimeRefresh(['community']);
    res.json({ ok: true, status: 'pending' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to connect user' });
  }
});

app.post('/api/community/connections/:connectionId/respond', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    const connectionRef = doc(db, 'connections', req.params.connectionId);
    const connectionSnapshot = await getDoc(connectionRef);
    if (!connectionSnapshot.exists()) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    const data = connectionSnapshot.data();
    if (!Array.isArray(data.users) || !data.users.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this request' });
    }

    await updateDoc(connectionRef, {
      status: action === 'accept' ? 'connected' : 'declined',
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update connection request' });
  }
});

app.post('/api/community/connections/:profileId/follow', authenticateToken, async (req, res) => {
  try {
    if (req.params.profileId === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const followId = `follow_${req.user.id}_${req.params.profileId}`;
    const followRef = doc(db, 'connections', followId);
    const followSnapshot = await getDoc(followRef);

    if (followSnapshot.exists()) {
      await deleteDoc(followRef);
      emitRealtimeRefresh(['community']);
      return res.json({ following: false });
    }

    await setDoc(followRef, {
      type: 'follow',
      followerId: req.user.id,
      followeeId: req.params.profileId,
      status: 'following',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    res.json({ following: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to follow user' });
  }
});

app.post('/api/community/events', authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    const { title, description, category, location, startsAt, teammateFriendly } = req.body;
    if (!title?.trim() || !startsAt) {
      return res.status(400).json({ message: 'Event title and start time are required' });
    }

    const banner = await uploadFileToPublicBucket(req.file, 'event-banner');
    const announcementRef = await addDoc(announcementsRef, {
      title: title.trim(),
      description: description || '',
      category: category || 'event',
      bannerUrl: banner?.url || '',
      location: location || '',
      startsAt,
      attendeeIds: [],
      interestedIds: [],
      discussionPostId: null,
      calendarUrl: '',
      teammateFriendly: teammateFriendly === 'true' || teammateFriendly === true,
      createdAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community', 'notifications']);
    const snapshot = await getDoc(announcementRef);
    res.status(201).json({
      event: mapAnnouncement(snapshot, req.user.id, new Map()),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

app.post('/api/community/events/:eventId/rsvp', authenticateToken, async (req, res) => {
  try {
    const { status = 'going' } = req.body;
    const eventRef = doc(db, 'announcements', req.params.eventId);
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventData = eventSnapshot.data();
    const attendeeIds = Array.isArray(eventData.attendeeIds) ? eventData.attendeeIds.filter((item) => item !== req.user.id) : [];
    const interestedIds = Array.isArray(eventData.interestedIds) ? eventData.interestedIds.filter((item) => item !== req.user.id) : [];

    if (status === 'going') attendeeIds.push(req.user.id);
    if (status === 'interested') interestedIds.push(req.user.id);

    await setDoc(
      doc(db, 'event_rsvps', `${req.params.eventId}_${req.user.id}`),
      {
        eventId: req.params.eventId,
        userId: req.user.id,
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await updateDoc(eventRef, {
      attendeeIds: Array.from(new Set(attendeeIds)),
      interestedIds: Array.from(new Set(interestedIds)),
    });

    emitRealtimeRefresh(['community', 'notifications']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to RSVP for event' });
  }
});

app.post('/api/community/teams', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, requiredSkills, slotsNeeded, deadline, branchPreference } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Team title and description are required' });
    }

    const teamRef = await addDoc(teamPostsRef, {
      title: title.trim(),
      description: description.trim(),
      category: category || 'project',
      requiredSkills: sanitizeList(requiredSkills),
      slotsNeeded: safeNumber(slotsNeeded, 1),
      deadline: deadline || null,
      branchPreference: sanitizeList(branchPreference),
      creator: buildUserPreview(req.user),
      members: [req.user.id],
      requestedUsers: [],
      liveRoomId: null,
      createdAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['community']);
    const snapshot = await getDoc(teamRef);
    res.status(201).json({
      team: mapTeamPost(snapshot, req.user.id, 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create team post' });
  }
});

app.post('/api/community/teams/:teamId/request', authenticateToken, async (req, res) => {
  try {
    const teamRef = doc(db, 'team_posts', req.params.teamId);
    const teamSnapshot = await getDoc(teamRef);
    if (!teamSnapshot.exists()) {
      return res.status(404).json({ message: 'Team post not found' });
    }

    await setDoc(
      doc(db, 'team_requests', `${req.params.teamId}_${req.user.id}`),
      {
        teamPostId: req.params.teamId,
        requesterId: req.user.id,
        requesterName: req.user.name,
        message: req.body.message || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    await updateDoc(teamRef, {
      requestedUsers: arrayUnion(req.user.id),
    });

    emitRealtimeRefresh(['community', 'notifications']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to request to join team' });
  }
});

app.post('/api/community/teams/:teamId/requests/:requestId/respond', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    const teamRef = doc(db, 'team_posts', req.params.teamId);
    const teamSnapshot = await getDoc(teamRef);
    if (!teamSnapshot.exists()) {
      return res.status(404).json({ message: 'Team post not found' });
    }

    const teamData = teamSnapshot.data();
    if (teamData.creator?.id !== req.user.id) {
      return res.status(403).json({ message: 'Only the team creator can review requests' });
    }

    const requestRef = doc(db, 'team_requests', req.params.requestId);
    const requestSnapshot = await getDoc(requestRef);
    if (!requestSnapshot.exists()) {
      return res.status(404).json({ message: 'Team request not found' });
    }

    const requestData = requestSnapshot.data();

    if (action === 'accept') {
      let roomId = teamData.liveRoomId || null;
      if (!roomId) {
        const roomRef = await addDoc(liveRoomsRef, {
          title: `${teamData.title} team room`,
          type: 'team-room',
          status: 'live',
          topic: teamData.description || '',
          linkedPostId: req.params.teamId,
          jitsiRoomName: `campusiq-team-${req.params.teamId}`,
          participants: Array.from(new Set([...(teamData.members || []), requestData.requesterId])),
          notes: '',
          whiteboardUrl: '',
          recordingUrl: '',
          summary: '',
          scheduledFor: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        roomId = roomRef.id;
      }

      await updateDoc(teamRef, {
        members: arrayUnion(requestData.requesterId),
        requestedUsers: Array.isArray(teamData.requestedUsers)
          ? teamData.requestedUsers.filter((userId) => userId !== requestData.requesterId)
          : [],
        liveRoomId: roomId,
      });

      if (roomId) {
        await updateDoc(doc(db, 'live_rooms', roomId), {
          participants: arrayUnion(requestData.requesterId),
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(requestRef, {
        status: 'accepted',
        reviewedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(teamRef, {
        requestedUsers: Array.isArray(teamData.requestedUsers)
          ? teamData.requestedUsers.filter((userId) => userId !== requestData.requesterId)
          : [],
      });
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
      });
    }

    emitRealtimeRefresh(['community']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to review team request' });
  }
});

app.get('/api/community/resources/:resourceId/context', authenticateToken, async (req, res) => {
  try {
    const response = await buildCommunityWorkspace(req.user, {
      resourceId: req.params.resourceId,
    });
    res.json(response.resourceContext || {
      resourceId: req.params.resourceId,
      relatedPosts: [],
      activePeers: [],
      upcomingClasses: [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load resource community context' });
  }
});

app.get('/api/discussions/overview', authenticateToken, async (req, res) => {
  try {
    const response = await buildDiscussionOverview(req.user.id);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load discussions overview' });
  }
});

app.post('/api/discussions/threads', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { title, description, channel, topic } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    let attachments = [];
    if (req.file?.buffer) {
      const safeFileName = `discussion-attachment-${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(safeFileName, req.file.buffer, {
          contentType: req.file.mimetype || 'application/pdf',
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(safeFileName);
        attachments.push(publicUrl);
      }
    }

    const threadRef = await addDoc(discussionThreadsRef, {
      title,
      description,
      channel: channel || 'General',
      topic: topic || channel || 'General',
      authorId: req.user.id,
      authorName: req.user.name,
      joinedUsers: [req.user.id],
      attachments,
      unreadCounts: {},
      userVotes: {},
      votes: 0,
      solved: false,
      roomActive: false,
      roomId: null,
      roomLabel: `${channel || 'General'} room`,
      latestMessagePreview: description,
      replyCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(threadRef);
    emitRealtimeRefresh(['dashboard', 'discussions', 'notifications']);
    res.status(201).json({ thread: mapDiscussionThread(snapshot, { currentUserId: req.user.id }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create discussion thread' });
  }
});

app.post('/api/discussions/threads/:threadId/messages', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { text } = req.body;
    const { threadId } = req.params;

    if (!text && !req.file) {
      return res.status(400).json({ message: 'Message text or attachment is required' });
    }

    const threadRef = doc(db, 'discussion_threads', threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    let attachments = [];
    if (req.file?.buffer) {
      const safeFileName = `discussion-reply-${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(safeFileName, req.file.buffer, {
          contentType: req.file.mimetype || 'application/pdf',
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('pdfs')
          .getPublicUrl(safeFileName);
        attachments.push(publicUrl);
      }
    }

    const messageRef = await addDoc(collection(db, 'discussion_threads', threadId, 'messages'), {
      authorId: req.user.id,
      authorName: req.user.name,
      text: text || '',
      attachments,
      isAI: false,
      createdAt: serverTimestamp(),
    });

    const joinedUsers = Array.isArray(threadSnapshot.data().joinedUsers)
      ? Array.from(new Set([...threadSnapshot.data().joinedUsers, req.user.id]))
      : [req.user.id];

    await updateDoc(threadRef, {
      latestMessagePreview: text || 'Sent an attachment',
      updatedAt: serverTimestamp(),
      replyCount: increment(1),
      joinedUsers,
    });

    const messageSnapshot = await getDoc(messageRef);
    emitRealtimeRefresh(['dashboard', 'discussions', 'notifications']);
    res.status(201).json({ message: mapDiscussionMessage(messageSnapshot) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to post message' });
  }
});

app.post('/api/discussions/threads/:threadId/vote', authenticateToken, async (req, res) => {
  try {
    const { direction } = req.body;
    const threadRef = doc(db, 'discussion_threads', req.params.threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const nextVote = direction === 'down' ? -1 : 1;
    const data = threadSnapshot.data();
    const userVotes = data.userVotes && typeof data.userVotes === 'object' ? data.userVotes : {};
    const previousVote = Number(userVotes[req.user.id] || 0);
    const voteDelta = nextVote - previousVote;

    await updateDoc(threadRef, {
      votes: increment(voteDelta),
      [`userVotes.${req.user.id}`]: nextVote,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'discussions']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update vote' });
  }
});

app.post('/api/discussions/threads/:threadId/join', authenticateToken, async (req, res) => {
  try {
    const threadRef = doc(db, 'discussion_threads', req.params.threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    await updateDoc(threadRef, {
      joinedUsers: arrayUnion(req.user.id),
      roomActive: true,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'discussions']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to join discussion' });
  }
});

app.put('/api/discussions/solve/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadRef = doc(db, 'discussion_threads', req.params.threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    await updateDoc(threadRef, {
      solved: true,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'discussions']);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to solve discussion' });
  }
});

app.post('/api/discussions/live-session/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadRef = doc(db, 'discussion_threads', req.params.threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    const roomId = `campusiq-${req.params.threadId}-${Date.now()}`;

    await updateDoc(threadRef, {
      joinedUsers: arrayUnion(req.user.id),
      roomActive: true,
      roomId,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'discussions']);
    res.json({ ok: true, roomId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to start live session' });
  }
});

app.post('/api/discussions/ai-answer/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadRef = doc(db, 'discussion_threads', req.params.threadId);
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    
    const threadData = threadSnapshot.data();
    
    // Generate AI response
    const payload = `You are CampusIQ AI, an elite academic peer. 
Provide a clear, correct, and encouraging answer to the following academic doubt. 
Format your response using Markdown, highlighting key terms and formulas.

Title: ${threadData.title}
Description: ${threadData.description}
Subject: ${threadData.channel}

Answer concisely but thoroughly.`;

    const answerText = await callGeminiChat(payload, []);

    const messageRef = await addDoc(collection(db, 'discussion_threads', req.params.threadId, 'messages'), {
      authorId: 'ai-system',
      authorName: 'CampusIQ AI',
      text: answerText,
      isAI: true,
      createdAt: serverTimestamp(),
    });

    await updateDoc(threadRef, {
      latestMessagePreview: 'CampusIQ AI answered this doubt.',
      updatedAt: serverTimestamp(),
      replyCount: increment(1),
    });

    const messageSnapshot = await getDoc(messageRef);
    emitRealtimeRefresh(['dashboard', 'discussions', 'notifications']);
    res.status(201).json({ message: mapDiscussionMessage(messageSnapshot) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate AI answer' });
  }
});

app.get('/api/live-classes', authenticateToken, async (req, res) => {
  try {
    const response = await buildLiveClassesOverview(req.user.id);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load live classes' });
  }
});

app.post('/api/live-classes/:classId/reminder', authenticateToken, async (req, res) => {
  try {
    const classRef = doc(db, 'live_classes', req.params.classId);
    const snapshot = await getDoc(classRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    const reminders = Array.isArray(snapshot.data().reminders) ? snapshot.data().reminders : [];
    const reminderSet = reminders.includes(req.user.id);
    const nextReminders = reminderSet
      ? reminders.filter((item) => item !== req.user.id)
      : [...reminders, req.user.id];

    await updateDoc(classRef, {
      reminders: nextReminders,
      updatedAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'live-classes', 'notifications']);
    res.json({ reminderSet: !reminderSet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update reminder' });
  }
});

app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const data = await buildDashboardResponse(req.user);
    res.json({ recommendations: data.recommendations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load recommendations' });
  }
});

app.get('/api/mentor-profile/me', authenticateToken, async (req, res) => {
  try {
    const profileSnapshot = await getDoc(doc(db, 'mentor_profiles', req.user.id));
    if (!profileSnapshot.exists()) {
      return res.json({ completed: false, profile: null });
    }

    const userSnapshot = await getDoc(doc(db, 'users', req.user.id));
    const baseSnapshot = userSnapshot.exists() ? userSnapshot : { id: req.user.id, data: () => req.user };

    res.json({
      completed: true,
      profile: buildMentorView(baseSnapshot, profileSnapshot),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load mentor profile' });
  }
});

app.put('/api/mentor-profile/me', authenticateToken, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'profilePic', maxCount: 1 },
]), async (req, res) => {
  try {
    if (!isMentorRole(req.user.role)) {
      return res.status(403).json({ message: 'Only faculty and graduates can manage mentor profiles' });
    }

    const role = normalizeRole(req.user.role);
    const profileRef = doc(db, 'mentor_profiles', req.user.id);
    const currentSnapshot = await getDoc(profileRef);
    const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {};
    const cvFile = req.files?.cv?.[0] || null;
    const profilePicFile = req.files?.profilePic?.[0] || null;

    let cvUrl = currentData.cvUrl || '';
    if (cvFile) {
      const uploadedCv = await uploadFileToPublicBucket(cvFile, 'mentor-cv');
      cvUrl = uploadedCv?.url || cvUrl;
    } else if (typeof req.body.cvUrl === 'string') {
      cvUrl = req.body.cvUrl.trim();
    }

    let profilePic = currentData.profilePic || req.user.avatar || '';
    if (profilePicFile) {
      const uploadedProfilePic = await uploadFileToPublicBucket(profilePicFile, 'mentor-avatar');
      profilePic = uploadedProfilePic?.url || profilePic;
    } else if (typeof req.body.profilePicUrl === 'string' && req.body.profilePicUrl.trim()) {
      profilePic = req.body.profilePicUrl.trim();
    }

    const payload = {
      role,
      name: req.user.name,
      email: req.user.email,
      profilePic,
      bio: req.body.bio?.trim() || '',
      availableForMentorship: req.body.availableForMentorship === 'false' ? false : true,
      updatedAt: serverTimestamp(),
      createdAt: currentData.createdAt || serverTimestamp(),
    };

    if (role === 'faculty' || role === 'admin' || role === 'mentor') {
      payload.college = req.body.college?.trim() || '';
      payload.experience = safeNumber(req.body.experience, 0);
      payload.subjects = sanitizeList(req.body.subjects);
      payload.researchAreas = sanitizeList(req.body.researchAreas);
      payload.skills = sanitizeList(req.body.subjects);
      payload.currentJob = currentData.currentJob || '';
      payload.company = currentData.company || '';
      payload.graduationYear = currentData.graduationYear || '';
      payload.goals = currentData.goals || '';
      payload.cvUrl = currentData.cvUrl || '';
    } else {
      payload.graduationYear = req.body.graduationYear?.trim() || '';
      payload.skills = sanitizeList(req.body.skills);
      payload.currentJob = req.body.currentJob?.trim() || '';
      payload.company = req.body.company?.trim() || '';
      payload.goals = req.body.goals?.trim() || '';
      payload.cvUrl = cvUrl;
      payload.college = currentData.college || '';
      payload.experience = currentData.experience || 0;
      payload.subjects = currentData.subjects || [];
      payload.researchAreas = currentData.researchAreas || [];
    }

    await setDoc(profileRef, payload, { merge: true });

    await updateDoc(doc(db, 'users', req.user.id), {
      role: req.user.role,
      headline: payload.bio || req.user.headline || '',
      avatar: profilePic || req.user.avatar || '',
      skills: payload.skills?.length ? payload.skills : payload.subjects || [],
      updatedAt: serverTimestamp(),
    });

    const userSnapshot = await getDoc(doc(db, 'users', req.user.id));
    const profileSnapshot = await getDoc(profileRef);

    res.json({
      profile: buildMentorView(userSnapshot, profileSnapshot),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save mentor profile' });
  }
});

app.get('/api/mentors/discover', authenticateToken, async (req, res) => {
  try {
    const [userSnapshot, profileSnapshot] = await Promise.all([
      getDocs(usersRef),
      getDocs(mentorProfilesRef),
    ]);

    const profileMap = new Map(profileSnapshot.docs.map((item) => [item.id, item]));
    const search = String(req.query.search || '').trim().toLowerCase();
    const subject = String(req.query.subject || '').trim().toLowerCase();
    const skill = String(req.query.skill || '').trim().toLowerCase();
    const minExperience = safeNumber(req.query.minExperience, 0);
    const limitCount = safeNumber(req.query.limit, 0);

    let mentors = userSnapshot.docs
      .filter((item) => item.id !== req.user.id)
      .map((item) => buildMentorView(item, profileMap.get(item.id)))
      .filter((item) => isMentorRole(item.role) && item.availableForMentorship)
      .map((item) => {
        const match = buildMentorMatch(req.user, item);
        return {
          ...item,
          matchScore: match.score,
          matchReasons: match.reasons,
        };
      });

    mentors = mentors.filter((mentor) => {
      const haystack = [
        mentor.name,
        mentor.bio,
        mentor.college,
        mentor.currentJob,
        mentor.company,
        ...mentor.subjects,
        ...mentor.skills,
        ...mentor.researchAreas,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const subjectMatch = !subject || mentor.subjects.some((item) => item.toLowerCase().includes(subject));
      const skillMatch = !skill || mentor.skills.some((item) => item.toLowerCase().includes(skill));
      const searchMatch = !search || haystack.includes(search);
      const experienceMatch = !minExperience || mentor.experience >= minExperience;

      return searchMatch && subjectMatch && skillMatch && experienceMatch;
    });

    mentors.sort((left, right) => {
      const scoreDelta = safeNumber(right.contributionScore, 0) - safeNumber(left.contributionScore, 0);
      if (scoreDelta !== 0) return scoreDelta;
      return parseTimestampValue(right.createdAt) - parseTimestampValue(left.createdAt);
    });

    if (limitCount > 0) {
      mentors = mentors.slice(0, limitCount);
    }

    res.json({ mentors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load mentor directory' });
  }
});

app.get('/api/mentors/:mentorId/brief', authenticateToken, async (req, res) => {
  try {
    const mentorUserSnapshot = await getDoc(doc(db, 'users', req.params.mentorId));
    if (!mentorUserSnapshot.exists()) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    const mentorProfileSnapshot = await getDoc(doc(db, 'mentor_profiles', req.params.mentorId));
    const mentor = buildMentorView(mentorUserSnapshot, mentorProfileSnapshot);
    const match = buildMentorMatch(req.user, mentor);

    const prompt = `
You are CampusIQ's mentor matching copilot.
Return ONLY valid JSON with this exact schema:
{
  "fitSummary": "2 sentence plain-English explanation",
  "talkingPoints": ["3 concise things the student should ask or discuss"],
  "firstStep": "1 short actionable first step",
  "mentorAngle": "1 sentence describing the specific value this mentor brings"
}

Student profile:
- Name: ${req.user.name}
- Role: ${req.user.role}
- Branch: ${req.user.branch || 'Unknown'}
- Year: ${req.user.year || 'Unknown'}
- Skills: ${sanitizeList(req.user.skills).join(', ') || 'None'}
- Headline: ${req.user.headline || 'None'}

Mentor profile:
- Name: ${mentor.name}
- Role: ${mentor.role}
- Bio: ${mentor.bio || 'None'}
- Subjects: ${(mentor.subjects || []).join(', ') || 'None'}
- Skills: ${(mentor.skills || []).join(', ') || 'None'}
- Research areas: ${(mentor.researchAreas || []).join(', ') || 'None'}
- Current Job: ${mentor.currentJob || 'None'}
- Company: ${mentor.company || 'None'}
- Goals they support: ${mentor.goals || 'None'}

Match score: ${match.score}
Match reasons: ${(match.reasons || []).join('; ') || 'None'}
`;

    const brief = parseSummaryPayload(await callGeminiChat(prompt, []));
    res.json({
      brief,
      matchScore: match.score,
      matchReasons: match.reasons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate mentor brief' });
  }
});

app.post('/api/mentors/:mentorId/request', authenticateToken, async (req, res) => {
  try {
    const mentorUserSnapshot = await getDoc(doc(db, 'users', req.params.mentorId));
    if (!mentorUserSnapshot.exists()) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    const mentor = mentorUserSnapshot.data();
    const requestType = String(req.body.requestType || 'general guidance').trim();
    const goals = String(req.body.goals || '').trim();
    const challenge = String(req.body.challenge || '').trim();
    const targetOutcome = String(req.body.targetOutcome || '').trim();
    const firstMessage = String(req.body.firstMessage || '').trim();
    const contextItems = Array.isArray(req.body.contextItems)
      ? req.body.contextItems
      : (() => {
        try {
          return JSON.parse(req.body.contextItems || '[]');
        } catch {
          return [];
        }
      })();

    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.mentorId);

    const requestRef = await addDoc(mentorRequestsRef, {
      mentorshipId,
      mentorId: req.params.mentorId,
      mentorName: mentor.name || 'Mentor',
      studentId: req.user.id,
      studentName: req.user.name || 'Student',
      requestType,
      goals,
      challenge,
      targetOutcome,
      firstMessage,
      contextItems,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const conversationId = getDmConversationId(req.user.id, req.params.mentorId);
    const convRef = doc(db, 'direct_messages', conversationId);
    const convSnap = await getDoc(convRef);
    const mentorName = mentor.name || 'CampusIQ Mentor';
    const bootstrapMessage = createMentorshipRequestMessage({
      studentName: req.user.name,
      requestType,
      goals,
      challenge,
      targetOutcome,
      contextItems,
      firstMessage,
    });

    if (!convSnap.exists()) {
      await setDoc(convRef, {
        participants: [req.user.id, req.params.mentorId],
        [`name_${req.user.id}`]: req.user.name,
        [`name_${req.params.mentorId}`]: mentorName,
        lastMessage: bootstrapMessage,
        lastMessageAt: serverTimestamp(),
        unreadCounts: { [req.params.mentorId]: 1, [req.user.id]: 0 },
      });
    } else {
      await updateDoc(convRef, {
        lastMessage: bootstrapMessage,
        lastMessageAt: serverTimestamp(),
        [`unreadCounts.${req.params.mentorId}`]: ((convSnap.data().unreadCounts || {})[req.params.mentorId] || 0) + 1,
        [`unreadCounts.${req.user.id}`]: 0,
      });
    }

    await addDoc(collection(db, 'direct_messages', conversationId, 'messages'), {
      senderId: req.user.id,
      senderName: req.user.name,
      text: bootstrapMessage,
      createdAt: serverTimestamp(),
      mentorshipRequestId: requestRef.id,
      requestType,
    });

    emitRealtimeRefresh(['dashboard', 'notifications']);
    res.status(201).json({
      requestId: requestRef.id,
      conversationId,
      bootstrapMessage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create mentorship request' });
  }
});

app.get('/api/mentorship/:withUserId/notes', authenticateToken, async (req, res) => {
  try {
    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    const noteRef = doc(db, 'mentor_session_notes', mentorshipId);
    const snapshot = await getDoc(noteRef);
    res.json({
      notes: snapshot.exists() ? snapshot.data().notes || '' : '',
      updatedAt: snapshot.exists() ? normalizeTimestamp(snapshot.data().updatedAt) : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load mentorship notes' });
  }
});

app.put('/api/mentorship/:withUserId/notes', authenticateToken, async (req, res) => {
  try {
    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    await setDoc(doc(db, 'mentor_session_notes', mentorshipId), {
      mentorshipId,
      participants: [req.user.id, req.params.withUserId].sort(),
      notes: String(req.body.notes || '').trim(),
      updatedBy: req.user.id,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save mentorship notes' });
  }
});

app.get('/api/mentorship/:withUserId/followups', authenticateToken, async (req, res) => {
  try {
    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    const snapshot = await getDocs(
      query(mentorFollowupsRef, where('mentorshipId', '==', mentorshipId)),
    );

    res.json({
      followups: snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          task: data.task || '',
          ownerId: data.ownerId || '',
          ownerName: data.ownerName || '',
          status: data.status || 'pending',
          dueDate: data.dueDate || '',
          createdAt: normalizeTimestamp(data.createdAt),
        };
      }).sort((left, right) => parseTimestampValue(right.createdAt) - parseTimestampValue(left.createdAt)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load follow-up tracker' });
  }
});

app.post('/api/mentorship/:withUserId/followups', authenticateToken, async (req, res) => {
  try {
    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    const task = String(req.body.task || '').trim();
    if (!task) {
      return res.status(400).json({ message: 'Task is required' });
    }

    const followupRef = await addDoc(mentorFollowupsRef, {
      mentorshipId,
      participants: [req.user.id, req.params.withUserId].sort(),
      task,
      ownerId: req.user.id,
      ownerName: req.user.name,
      dueDate: String(req.body.dueDate || '').trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(followupRef);
    const data = snapshot.data();
    res.status(201).json({
      followup: {
        id: snapshot.id,
        task: data.task,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        status: data.status,
        dueDate: data.dueDate,
        createdAt: normalizeTimestamp(data.createdAt),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add follow-up task' });
  }
});

app.patch('/api/mentorship/followups/:followupId', authenticateToken, async (req, res) => {
  try {
    const ref = doc(db, 'mentor_followups', req.params.followupId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Follow-up task not found' });
    }

    const data = snapshot.data();
    if (!Array.isArray(data.participants) || !data.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await updateDoc(ref, {
      status: String(req.body.status || 'pending').trim(),
      updatedAt: serverTimestamp(),
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update follow-up task' });
  }
});

app.get('/api/mentorship/:withUserId/bookmark', authenticateToken, async (req, res) => {
  try {
    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    const snapshot = await getDocs(
      query(
        mentorshipBookmarksRef,
        where('mentorshipId', '==', mentorshipId),
        where('studentId', '==', req.user.id),
        limit(1),
      ),
    );

    if (snapshot.empty) {
      return res.json({
        bookmark: {
          starred: false,
          target: '',
          personalNotes: '',
          updatedAt: null,
        },
      });
    }

    const item = snapshot.docs[0];
    const data = item.data();
    res.json({
      bookmark: {
        id: item.id,
        starred: data.starred === true,
        target: data.target || '',
        personalNotes: data.personalNotes || '',
        updatedAt: normalizeTimestamp(data.updatedAt),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load mentorship bookmark' });
  }
});

app.put('/api/mentorship/:withUserId/bookmark', authenticateToken, async (req, res) => {
  try {
    if (isMentorRole(req.user.role)) {
      return res.status(403).json({ message: 'Only students can save mentorship bookmarks' });
    }

    const mentorshipId = buildMentorshipThreadId(req.user.id, req.params.withUserId);
    const snapshot = await getDocs(
      query(
        mentorshipBookmarksRef,
        where('mentorshipId', '==', mentorshipId),
        where('studentId', '==', req.user.id),
        limit(1),
      ),
    );

    const bookmarkPayload = {
      mentorshipId,
      studentId: req.user.id,
      mentorId: req.params.withUserId,
      starred: req.body.starred === true,
      target: String(req.body.target || '').trim(),
      personalNotes: String(req.body.personalNotes || '').trim(),
      updatedAt: serverTimestamp(),
    };

    if (snapshot.empty) {
      await addDoc(mentorshipBookmarksRef, {
        ...bookmarkPayload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(snapshot.docs[0].ref, bookmarkPayload);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save mentorship bookmark' });
  }
});

app.get('/api/mentors', authenticateToken, async (req, res) => {
  try {
    const data = await buildDashboardResponse(req.user);
    res.json({ mentors: data.mentors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load mentors' });
  }
});

app.post('/api/mentors/:mentorId/book', authenticateToken, async (req, res) => {
  try {
    const mentorSnapshot = await getDoc(doc(db, 'users', req.params.mentorId));

    if (!mentorSnapshot.exists()) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    await addDoc(mentorBookingsRef, {
      mentorId: req.params.mentorId,
      mentorName: mentorSnapshot.data().name || 'Mentor',
      userId: req.user.id,
      userName: req.user.name,
      createdAt: serverTimestamp(),
    });

    emitRealtimeRefresh(['dashboard', 'notifications']);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to book mentor' });
  }
});

app.get('/api/roadmap', authenticateToken, async (req, res) => {
  try {
    const data = await buildDashboardResponse(req.user);
    res.json({ roadmap: data.roadmap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load roadmap' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const snapshot = await getDocs(query(notificationsRef, where('userId', '==', req.user.id)));
    const notifications = sortByNewest(snapshot.docs.map(mapNotification), 'createdAt');
    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

app.get('/api/resources', authenticateToken, async (req, res) => {
  try {
    const savedIds = await buildSavedIds(req.user.id);
    const resourceSnapshot = await getDocs(query(resourcesRef, orderBy('createdAt', 'desc')));
    let resourceList = resourceSnapshot.docs.map((item) => mapResource(item, savedIds));

    const { year, branch, semester, subject, type, section, sortBy } = req.query;

    resourceList = resourceList.filter((resource) => {
      const yearMatch = !year || year === 'All Years' || resource.year === year;
      const branchMatch = !branch || branch === 'All Branches' || resource.branch === branch;
      const semesterMatch =
        !semester || semester === 'All Semesters' || resource.semester === semester;
      const typeMatch = !type || type === 'All Types' || resource.type === type;
      const sectionMatch = !section || section === 'All Sections' || resource.section === section;
      const subjectMatch =
        !subject ||
        resource.course?.toLowerCase().includes(subject.toLowerCase()) ||
        resource.title?.toLowerCase().includes(subject.toLowerCase());

      return yearMatch && branchMatch && semesterMatch && typeMatch && sectionMatch && subjectMatch;
    });

    res.json({
      resources: sortResources(resourceList, sortBy || 'Recent'),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
});

app.get('/api/resources/my-uploads', authenticateToken, async (req, res) => {
  try {
    const savedIds = await buildSavedIds(req.user.id);
    const resourceSnapshot = await getDocs(
      query(resourcesRef, where('uploaderId', '==', req.user.id))
    );
    const resourceList = resourceSnapshot.docs
      .map((item) => mapResource(item, savedIds))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });

    res.json({
      resources: resourceList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch your resources' });
  }
});

app.get('/api/resources/saved', authenticateToken, async (req, res) => {
  try {
    const savedIds = await buildSavedIds(req.user.id);
    if (savedIds.size === 0) {
      return res.json({ resources: [] });
    }

    // Convert Set to Array for mapping
    const savedIdsArray = Array.from(savedIds);
    const resourcePromises = savedIdsArray.map(id => getDoc(doc(db, 'resources', id)));
    const snapshots = await Promise.all(resourcePromises);
    
    const resourceList = snapshots
      .filter(snap => snap.exists())
      .map(snap => mapResource(snap, savedIds));

    res.json({
      resources: resourceList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch saved resources' });
  }
});

app.get('/api/resources/:id', authenticateToken, async (req, res) => {
  try {
    const savedIds = await buildSavedIds(req.user.id);
    const resourceSnapshot = await getDoc(doc(db, 'resources', req.params.id));

    if (!resourceSnapshot.exists()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const userRatingSnapshot = await getDoc(doc(db, 'resources', req.params.id, 'ratings', req.user.id));

    res.json({
      resource: {
        ...mapResource(resourceSnapshot, savedIds),
        userRating: userRatingSnapshot.exists() ? userRatingSnapshot.data().rating || 0 : 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch resource' });
  }
});

app.post('/api/resources/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    await logUploadRequest({
      route: '/api/resources/upload',
      userId: req.user?.id || null,
      hasFile: Boolean(req.file),
      fileName: req.file?.originalname || null,
      title: req.body?.title || null,
      year: req.body?.year || null,
      branch: req.body?.branch || null,
      semester: req.body?.semester || null,
      course: req.body?.course || null,
      type: req.body?.type || null,
      section: req.body?.section || null,
    });

    const {
      title,
      year,
      branch,
      semester,
      course,
      type,
      section,
      description,
      visibility,
      tags,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    if (!title || !year || !branch || !semester || !course || !type || !section) {
      return res.status(400).json({ message: 'Complete all required resource fields before uploading' });
    }

    const safeFileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;

    // Upload PDF buffer to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(safeFileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase Storage Error: ${uploadError.message}`);
    }

    // Get the Public URL from Supabase
    const { data: { publicUrl: fileUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(safeFileName);

    const resourcePayload = {
      title,
      year,
      branch,
      semester,
      course,
      type,
      section,
      description: description || '',
      visibility: visibility || 'Campus Wide',
      tags: tags
        ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
        : [],
      fileUrl,
      fileName: req.file.originalname,
      uploadedBy: req.user.name,
      uploaderId: req.user.id,
      downloads: 0,
      saves: 0,
      createdAt: serverTimestamp(),
    };

    const resourceRef = await addDoc(resourcesRef, resourcePayload);
    try {
      await updateDoc(doc(db, 'users', req.user.id), {
        contributionScore: increment(12),
        recentUploads: arrayUnion(resourceRef.id),
      });
    } catch (userUpdateError) {
      console.warn('Resource uploaded, but user stats update failed.');
      console.warn(userUpdateError);
    }

    return res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: {
        id: resourceRef.id,
        title,
        year,
        branch,
        semester,
        course,
        type,
        section,
        tags: tags
          ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
          : [],
        description: description || '',
        visibility: visibility || 'Campus Wide',
        fileUrl,
        uploadedBy: req.user.name,
        uploaderId: req.user.id,
        downloads: 0,
        saves: 0,
        createdAt: new Date().toISOString(),
        saved: false,
      },
    });
  } catch (error) {
    console.error(error);
    await logUploadError(error, {
      route: '/api/resources/upload',
      hasFile: Boolean(req.file),
      title: req.body?.title,
      year: req.body?.year,
      branch: req.body?.branch,
      semester: req.body?.semester,
      course: req.body?.course,
      type: req.body?.type,
      section: req.body?.section,
    });
    res.status(500).json({
      message:
        `${error?.code ? `${error.code}: ` : ''}${error?.message || 'Failed to upload resource'}`,
      details: error?.stack || null,
    });
  }
});

app.post('/api/resources/save/:id', authenticateToken, async (req, res) => {
  try {
    const resourceRef = doc(db, 'resources', req.params.id);
    const resourceSnapshot = await getDoc(resourceRef);

    if (!resourceSnapshot.exists()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const savedRef = doc(db, 'users', req.user.id, 'savedResources', req.params.id);
    const savedSnapshot = await getDoc(savedRef);

    if (savedSnapshot.exists()) {
      await deleteDoc(savedRef);
      await deleteDoc(doc(db, 'saved_resources', `${req.user.id}_${req.params.id}`)).catch(() => {});
      await updateDoc(resourceRef, { saves: increment(-1) });
      return res.json({ saved: false });
    }

    await setDoc(savedRef, {
      resourceId: req.params.id,
      savedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'saved_resources', `${req.user.id}_${req.params.id}`), {
      userId: req.user.id,
      resourceId: req.params.id,
      savedAt: serverTimestamp(),
    });
    await updateDoc(resourceRef, { saves: increment(1) });
    return res.json({ saved: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update saved resource' });
  }
});

app.post('/api/resources/download/:id', authenticateToken, async (req, res) => {
  try {
    const resourceRef = doc(db, 'resources', req.params.id);
    const resourceSnapshot = await getDoc(resourceRef);

    if (!resourceSnapshot.exists()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    await updateDoc(resourceRef, { downloads: increment(1) });
    const updatedSnapshot = await getDoc(resourceRef);

    res.json({
      fileUrl: updatedSnapshot.data().fileUrl,
      downloads: updatedSnapshot.data().downloads || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to track download' });
  }
});

app.get('/api/ai/summaries', authenticateToken, async (req, res) => {
  try {
    const summarySnapshot = await getDocs(query(aiSummariesRef, where('userId', '==', req.user.id)));

    res.json({
      summaries: summarySnapshot.docs
        .map(normalizeAiSummary)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load AI summaries' });
  }
});

app.get('/api/ai/summaries/resource/:resourceId', authenticateToken, async (req, res) => {
  try {
    const summarySnapshot = await getDocs(
      query(
        aiSummariesRef,
        where('resourceId', '==', req.params.resourceId),
        where('userId', '==', req.user.id),
        limit(1),
      ),
    );

    if (summarySnapshot.empty) {
      return res.status(404).json({ message: 'AI summary not found for this resource' });
    }

    return res.json({
      summary: normalizeAiSummary(summarySnapshot.docs[0]),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load AI summary' });
  }
});

app.post(
  '/api/ai/summarize',
  authenticateToken,
  upload.single('pdf'),
  async (req, res) => {
    try {
      const { resourceId, pdfUrl } = req.body;

      let resourceSnapshot = null;
      let pdfBuffer = null;
      let resourceContext = {
        title: req.body?.title || req.file?.originalname || 'Uploaded academic PDF',
        course: req.body?.course || 'Unknown course',
        type: req.body?.type || 'Notes',
        section: req.body?.section || 'General',
        branch: req.body?.branch || 'General',
        semester: req.body?.semester || 'General',
      };

      if (resourceId) {
        resourceSnapshot = await getDoc(doc(db, 'resources', resourceId));

        if (!resourceSnapshot.exists()) {
          return res.status(404).json({ message: 'Resource not found' });
        }

        resourceContext = {
          title: resourceSnapshot.data().title,
          course: resourceSnapshot.data().course,
          type: resourceSnapshot.data().type,
          section: resourceSnapshot.data().section,
          branch: resourceSnapshot.data().branch,
          semester: resourceSnapshot.data().semester,
        };

        const existingSummarySnapshot = await getDocs(
          query(
            aiSummariesRef,
            where('resourceId', '==', resourceId),
            where('userId', '==', req.user.id),
            limit(1),
          ),
        );

        if (!existingSummarySnapshot.empty) {
          return res.json({
            summary: normalizeAiSummary(existingSummarySnapshot.docs[0]),
            reused: true,
          });
        }
      }

      let finalPdfUrl = pdfUrl;

      if (req.file?.buffer) {
        pdfBuffer = req.file.buffer;

        // Persist the ad-hoc PDF to Supabase as well so the summary has a reachable URL
        const safeFileName = `adhoc-${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(safeFileName, req.file.buffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(safeFileName);
          finalPdfUrl = publicUrl;
        }
      } else if (resourceSnapshot?.data()?.fileUrl) {
        pdfBuffer = await getPdfBufferFromUrl(resourceSnapshot.data().fileUrl);
      } else if (pdfUrl) {
        pdfBuffer = await getPdfBufferFromUrl(pdfUrl);
      }

      if (!pdfBuffer) {
        return res.status(400).json({ message: 'Provide a resourceId, PDF file, or PDF URL' });
      }

      const extractedText = await extractAcademicText(pdfBuffer);
      const parsedSummary = await callGeminiSummary(
        buildSummaryPrompt({
          resource: resourceContext,
          extractedText,
        }),
      );

      let summaryDocument = {
        resourceId: resourceId || null,
        userId: req.user.id,
        resourceTitle: resourceContext.title,
        resourceType: resourceContext.type,
        pdfUrl: finalPdfUrl || resourceSnapshot?.data()?.fileUrl || '',
        course: resourceContext.course,
        branch: resourceContext.branch,
        semester: resourceContext.semester,
        subject: String(parsedSummary?.subject || resourceContext.course || '').trim(),
        summary: normalizeStringList(parsedSummary?.quickSummary),
        keyConcepts: {
          terms: normalizeStringList(parsedSummary?.keyConcepts?.terms),
          formulas: normalizeStringList(parsedSummary?.keyConcepts?.formulas),
          definitions: normalizeStringList(parsedSummary?.keyConcepts?.definitions),
          examTopics: normalizeStringList(parsedSummary?.keyConcepts?.examTopics),
        },
        unitWiseBreakdown: normalizeBreakdown(parsedSummary?.unitWiseBreakdown),
        questions: normalizeStringList(parsedSummary?.importantQuestions),
        revisionPoints: normalizeStringList(parsedSummary?.lastDayRevision),
        difficultyLevel: inferDifficulty(parsedSummary),
        examProbabilityTags: normalizeStringList(parsedSummary?.examProbabilityTags),
        repeatedPyqConcepts: normalizeStringList(parsedSummary?.repeatedPyqConcepts),
        relatedNotes: [],
        flashcards: normalizeFlashcards(parsedSummary?.flashcards).slice(0, 8),
        shareSlug: resourceId || `${req.user.id}-${Date.now()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (resourceSnapshot) {
        summaryDocument = await buildSummaryDocument({
          resourceSnapshot,
          userId: req.user.id,
          parsedSummary,
        });

        const updatedTags = Array.from(new Set([...(resourceSnapshot.data().tags || []), 'AI Summary']));
        await updateDoc(doc(db, 'resources', resourceId), {
          tags: updatedTags,
        });
      }

      const summaryRef = await addDoc(aiSummariesRef, summaryDocument);
      const summarySnapshot = await getDoc(summaryRef);

      return res.status(201).json({
        summary: normalizeAiSummary(summarySnapshot),
        reused: false,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error?.message || 'Failed to generate AI summary',
      });
    }
  },
);

app.post('/api/ai/generate-quiz', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    const { resourceId, pdfUrl } = req.body;
    let pdfBuffer = null;
    let resourceTitle = req.file?.originalname || 'Uploaded Document';
    let resourceCourse = 'General';

    if (req.file?.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (resourceId) {
      const resourceSnapshot = await getDoc(doc(db, 'resources', resourceId));
      if (!resourceSnapshot.exists()) return res.status(404).json({ message: 'Resource not found' });
      const resource = resourceSnapshot.data();
      resourceTitle = resource.title;
      resourceCourse = resource.course;
      pdfBuffer = await getPdfBufferFromUrl(resource.fileUrl);
    } else if (pdfUrl) {
      pdfBuffer = await getPdfBufferFromUrl(pdfUrl);
    }

    if (!pdfBuffer) return res.status(400).json({ message: 'Provide resourceId or a PDF file' });

    const extractedText = await extractAcademicText(pdfBuffer);
    const quizPrompt = buildQuizPrompt({
      resource: { title: resourceTitle, course: resourceCourse },
      extractedText,
    });

    const parsedQuiz = await callGeminiSummary(quizPrompt);

    res.json({ quiz: parsedQuiz.questions || [] });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate quiz' });
  }
});

app.post('/api/ai/solve-doubt', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    const { resourceId, pdfUrl, question } = req.body;
    let chatHistory = [];
    try {
      chatHistory = JSON.parse(req.body.chatHistory || '[]');
    } catch {
      chatHistory = [];
    }

    if (!question) return res.status(400).json({ message: 'Question is required' });

    let pdfBuffer = null;
    if (req.file?.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (resourceId) {
      const resourceSnapshot = await getDoc(doc(db, 'resources', resourceId));
      if (resourceSnapshot.exists()) {
        pdfBuffer = await getPdfBufferFromUrl(resourceSnapshot.data().fileUrl);
      }
    } else if (pdfUrl) {
      pdfBuffer = await getPdfBufferFromUrl(pdfUrl);
    }

    if (!pdfBuffer) return res.status(400).json({ message: 'Provide resourceId or a PDF file context' });

    // Cache the extracted text somewhat (or just extract it)
    const extractedText = await extractAcademicText(pdfBuffer);
    const systemPrompt = `You are the CampusIQ Study Genie, an elite academic assistant. Use the provided PDF context to answer the student's question accurately. Keep answers concise, clear, and academic.\n\nContext Document:\n${extractedText}`;

    // Add context only to the final message to save token transmission overhead
    const payload = `${systemPrompt}\n\nUser Question: ${question}`;

    const answerText = await callGeminiChat(payload, chatHistory);

    res.json({ answer: answerText });
  } catch (error) {
    console.error('Doubt Solver Error:', error);
    res.status(500).json({ message: error.message || 'Failed to answer doubt' });
  }
});

const PORT = process.env.PORT || 5000;
app.get('/api/resources/my-uploads', authenticateToken, async (req, res) => {
  try {
    const savedIds = await buildSavedIds(req.user.id);
    const myQuery = query(
      resourcesRef,
      where('uploaderId', '==', req.user.id),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(myQuery);
    const resources = snapshot.docs.map((item) => mapResource(item, savedIds));

    res.json({ resources });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch your contributions' });
  }
});

app.post('/api/resources/rate/:id', authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    const resourceId = req.params.id;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating (1-5 required)' });
    }

    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnapshot = await getDoc(resourceRef);

    if (!resourceSnapshot.exists()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const ratingsRef = collection(db, 'resources', resourceId, 'ratings');
    const userRatingRef = doc(ratingsRef, req.user.id);
    const userRatingSnapshot = await getDoc(userRatingRef);

    let ratingDelta = rating;
    let countDelta = 1;

    if (userRatingSnapshot.exists()) {
      const oldRating = userRatingSnapshot.data().rating;
      ratingDelta = rating - oldRating;
      countDelta = 0;
    }

    await setDoc(userRatingRef, {
      userId: req.user.id,
      userName: req.user.name || 'CampusIQ User',
      userRole: req.user.role || 'Student',
      rating,
      comment: req.body.comment || '',
      updatedAt: serverTimestamp(),
    });

    const resourceData = resourceSnapshot.data();
    const currentTotalWeight = (resourceData.ratingAverage || 0) * (resourceData.ratingCount || 0);
    const nextCount = (resourceData.ratingCount || 0) + countDelta;
    const nextTotalWeight = currentTotalWeight + ratingDelta;
    const nextAverage = nextCount > 0 ? parseFloat((nextTotalWeight / nextCount).toFixed(1)) : 0;

    await updateDoc(resourceRef, {
      ratingAverage: nextAverage,
      ratingCount: nextCount,
    });

    res.json({
      ratingAverage: nextAverage,
      ratingCount: nextCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

app.get('/api/resources/:id/endorsements', authenticateToken, async (req, res) => {
  try {
    const ratingsRef = collection(db, 'resources', req.params.id, 'ratings');
    const q = query(ratingsRef, where('userRole', 'in', ['Faculty', 'Graduate', 'Mentor', 'faculty', 'graduate', 'mentor']));
    const snapshot = await getDocs(q);
    
    const endorsements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: normalizeTimestamp(doc.data().updatedAt)
    }));

    res.json({ endorsements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch endorsements' });
  }
});

app.delete('/api/resources/:id', authenticateToken, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);

    if (!resourceSnap.exists()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resourceData = resourceSnap.data();

    // Verify ownership or admin role
    if (resourceData.uploaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this resource' });
    }

    // Storage cleanup (attempt delete if file is on Supabase)
    if (resourceData.fileUrl && resourceData.fileUrl.includes('supabase')) {
      try {
        const urlParts = resourceData.fileUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('pdfs').remove([fileName]);
      } catch (storageErr) {
        console.error('Storage cleanup failed:', storageErr);
      }
    }

    await deleteDoc(resourceRef);

    // Also clean up any associated AI summaries
    const snapshots = await getDocs(query(collection(db, 'ai_summaries'), where('resourceId', '==', resourceId)));
    await Promise.all(snapshots.docs.map(d => deleteDoc(d.ref)));

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Resource deletion failed:', error);
    res.status(500).json({ message: 'Failed to delete resource' });
  }
});

// ─── User Public Profile ─────────────────────────────────────────────────────

app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const [userSnapshot, mentorProfileSnapshot, postsSnapshot, resourcesSnapshot, summarySnapshot, relationshipMap] = await Promise.all([
      getDoc(doc(db, 'users', targetUserId)),
      getDoc(doc(db, 'mentor_profiles', targetUserId)),
      getDocs(query(communityPostsRef, where('author.id', '==', targetUserId))),
      getDocs(query(resourcesRef, where('uploaderId', '==', targetUserId))),
      getDocs(query(aiSummariesRef, where('userId', '==', targetUserId))),
      buildRelationshipMap(req.user.id)
    ]);

    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userSnapshot.data();
    const relationship = relationshipMap.get(targetUserId) || {};
    const mentorProfile = mentorProfileSnapshot.exists()
      ? buildMentorView(userSnapshot, mentorProfileSnapshot)
      : null;

    // Normalize activity and sort in memory to avoid Firestore index requirement 
    // (Queries with where + orderBy require explicit composite indexes)
    const recentPosts = postsSnapshot.docs
      .map(docSnap => mapCommunityPost(docSnap, { currentUserId: req.user.id }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    const uploads = resourcesSnapshot.docs
      .map(docSnap => mapResource(docSnap))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    const summaries = summarySnapshot.docs
      .map(docSnap => normalizeAiSummary(docSnap))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    res.json({
      profile: {
        id: userSnapshot.id,
        name: userData.name || 'CampusIQ User',
        email: userData.email || '',
        role: userData.role || 'Student',
        headline: userData.headline || '',
        branch: userData.branch || '',
        year: userData.year || '',
        avatar: mentorProfile?.profilePic || userData.avatar || '',
        contributionScore: userData.contributionScore || 0,
        skills: Array.isArray(userData.skills) ? userData.skills : [],
        joinedAt: normalizeTimestamp(userData.createdAt),
        bio: mentorProfile?.bio || '',
        company: mentorProfile?.company || '',
        college: mentorProfile?.college || '',
        currentJob: mentorProfile?.currentJob || '',
        profilePic: mentorProfile?.profilePic || '',
        subjects: mentorProfile?.subjects || [],
        researchAreas: mentorProfile?.researchAreas || [],
        goals: mentorProfile?.goals || '',
      },
      recentPosts,
      uploads,
      summaries,
      connectionStatus: relationship.status || 'none'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// ─── Direct Messages ──────────────────────────────────────────────────────────

const getDmConversationId = (userA, userB) =>
  [userA, userB].sort().join('_');

const dmConversationsRef = collection(db, 'direct_messages');

app.get('/api/dm/conversations', authenticateToken, async (req, res) => {
  try {
    const snapshot = await getDocs(dmConversationsRef);
    const myId = req.user.id;

    const conversations = snapshot.docs
      .filter((docSnap) => {
        const parts = docSnap.id.split('_');
        return parts.includes(myId);
      })
      .map(async (docSnap) => {
        const data = docSnap.data();
        const parts = docSnap.id.split('_');
        const otherId = parts.find((p) => p !== myId) || '';
        let withUserAvatar = '';
        let withUserRole = '';
        try {
          const userSnap = await getDoc(doc(db, 'users', otherId));
          if (userSnap.exists()) {
            withUserAvatar = userSnap.data().avatar || '';
            withUserRole = userSnap.data().role || '';
          }
        } catch {
          withUserAvatar = '';
          withUserRole = '';
        }
        return {
          id: docSnap.id,
          withUserId: otherId,
          withUserName: data[`name_${otherId}`] || 'CampusIQ User',
          withUserAvatar,
          withUserRole,
          lastMessage: data.lastMessage || '',
          lastMessageAt: normalizeTimestamp(data.lastMessageAt),
          unreadCount: Number((data.unreadCounts || {})[myId] || 0),
        };
      });

    const hydratedConversations = await Promise.all(conversations);

    res.json({
      conversations: hydratedConversations
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

app.get('/api/dm/conversations/:withUserId', authenticateToken, async (req, res) => {
  try {
    const conversationId = getDmConversationId(req.user.id, req.params.withUserId);
    const messagesSnapshot = await getDocs(
      query(
        collection(db, 'direct_messages', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
      ),
    );

    const messages = messagesSnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        senderId: data.senderId || '',
        senderName: data.senderName || 'User',
        text: data.text || '',
        createdAt: normalizeTimestamp(data.createdAt),
      };
    });

    // Mark as read — clear unread count for current user
    const convRef = doc(db, 'direct_messages', conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      await updateDoc(convRef, {
        [`unreadCounts.${req.user.id}`]: 0,
      });
    }

    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

app.post('/api/dm/conversations/:withUserId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const myId = req.user.id;
    const withId = req.params.withUserId;
    const conversationId = getDmConversationId(myId, withId);
    const convRef = doc(db, 'direct_messages', conversationId);
    const convSnap = await getDoc(convRef);

    // Fetch the other user's name for the conversation metadata
    let withUserName = 'CampusIQ User';
    try {
      const withUserSnap = await getDoc(doc(db, 'users', withId));
      if (withUserSnap.exists()) {
        withUserName = withUserSnap.data().name || 'CampusIQ User';
      }
    } catch { /* ignore */ }

    const convPayload = {
      participants: [myId, withId],
      [`name_${myId}`]: req.user.name,
      [`name_${withId}`]: withUserName,
      lastMessage: text.trim(),
      lastMessageAt: serverTimestamp(),
      [`unreadCounts.${withId}`]: convSnap.exists()
        ? ((convSnap.data().unreadCounts || {})[withId] || 0) + 1
        : 1,
      [`unreadCounts.${myId}`]: 0,
    };

    if (!convSnap.exists()) {
      await setDoc(convRef, {
        participants: [myId, withId],
        [`name_${myId}`]: req.user.name,
        [`name_${withId}`]: withUserName,
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        unreadCounts: { [withId]: 1, [myId]: 0 },
      });
    } else {
      await updateDoc(convRef, {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCounts.${withId}`]: ((convSnap.data().unreadCounts || {})[withId] || 0) + 1,
        [`unreadCounts.${myId}`]: 0,
      });
    }

    const messageRef = await addDoc(
      collection(db, 'direct_messages', conversationId, 'messages'),
      {
        senderId: myId,
        senderName: req.user.name,
        text: text.trim(),
        createdAt: serverTimestamp(),
      },
    );

    const messageSnap = await getDoc(messageRef);
    const data = messageSnap.data();
    res.status(201).json({
      message: {
        id: messageSnap.id,
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.text,
        createdAt: normalizeTimestamp(data.createdAt),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// ─── Server Start ─────────────────────────────────────────────────────────────


// ── STUDY ROOMS ──
// STUDY ROOMS
const mapStudyRoom = (snap, extras = {}) => {
  const d = snap.data();
  return {
    id: snap.id,
    title: d.title || 'Untitled Room',
    description: d.description || '',
    subjectTag: d.subjectTag || d.topic || '',
    branch: d.branch || 'General',
    year: d.year || 'All',
    creatorId: d.creatorId || '',
    memberCount: Array.isArray(d.members) ? d.members.length : 0,
    members: Array.isArray(d.members) ? d.members : [],
    pinnedResources: Array.isArray(d.pinnedResources) ? d.pinnedResources : [],
    pinnedAnswers: Array.isArray(d.pinnedAnswers) ? d.pinnedAnswers : [],
    lastMessage: d.lastMessage || null,
    onlineCount: d.onlineCount || 0,
    activeSession: d.activeSession || null,
    createdAt: normalizeTimestamp(d.createdAt),
    ...extras
  };
};

app.get('/api/study-rooms', authenticateToken, async (req, res) => {
  try {
    const q = query(studyRoomsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const rooms = snapshot.docs.map(s => mapStudyRoom(s));
    const myRooms = rooms.filter(r => r.members.includes(req.user.id));
    const popular = [...rooms].sort((a, b) => b.onlineCount - a.onlineCount).slice(0, 6);
    res.json({ rooms, myRooms, popular });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load study rooms' });
  }
});

app.post('/api/study-rooms', authenticateToken, async (req, res) => {
  try {
    const { title, description, subjectTag, branch, year } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Room title is required' });
    const roomRef = await addDoc(studyRoomsRef, {
      title: title.trim(),
      description: (description || '').trim(),
      subjectTag: subjectTag || '',
      branch: branch || 'General',
      year: year || 'All',
      creatorId: req.user.id,
      members: [req.user.id],
      pinnedResources: [],
      pinnedAnswers: [],
      lastMessage: null,
      onlineCount: 1,
      activeSession: null,
      createdAt: serverTimestamp()
    });
    emitRealtimeRefresh(['study-rooms']);
    res.status(201).json({ id: roomRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create study room' });
  }
});

app.get('/api/study-rooms/:id', authenticateToken, async (req, res) => {
  try {
    const roomSnap = await getDoc(doc(db, 'study_rooms', req.params.id));
    if (!roomSnap.exists()) return res.status(404).json({ message: 'Room not found' });
    const roomData = mapStudyRoom(roomSnap);
    const memberProfiles = await Promise.all(
      roomData.members.map(async uid => {
        try {
          const uSnap = await getDoc(doc(db, 'users', uid));
          return uSnap.exists() ? { id: uSnap.id, name: uSnap.data().name, branch: uSnap.data().branch, year: uSnap.data().year, collabScore: uSnap.data().collabScore || 0 } : null;
        } catch { return null; }
      })
    );
    res.json({ room: roomData, members: memberProfiles.filter(Boolean) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load study room' });
  }
});

app.post('/api/study-rooms/:id/join', authenticateToken, async (req, res) => {
  try {
    await updateDoc(doc(db, 'study_rooms', req.params.id), { members: arrayUnion(req.user.id) });
    emitRealtimeRefresh(['study-rooms']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to join room' });
  }
});

app.get('/api/study-rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messagesRef = collection(db, 'study_rooms', req.params.id, 'messages');
    const limitNum = Math.min(parseInt(req.query.limit) || 100, 200);
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(limitNum));
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(d => ({
      id: d.id,
      content: d.data().content || '',
      author: d.data().author || {},
      mentions: d.data().mentions || [],
      isPinned: Boolean(d.data().isPinned),
      createdAt: normalizeTimestamp(d.data().createdAt),
    }));
    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

app.post('/api/study-rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content is required' });
    const mentions = (content.match(/@(\w+)/g) || []).map(m => m.slice(1));
    const messagesRef = collection(db, 'study_rooms', req.params.id, 'messages');
    const msgRef = await addDoc(messagesRef, {
      content: content.trim(),
      author: buildUserPreview(req.user),
      mentions,
      isPinned: false,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'study_rooms', req.params.id), {
      lastMessage: { text: content.trim().slice(0, 80), author: req.user.name, at: new Date().toISOString() }
    });
    emitRealtimeRefresh(['study-rooms']);
    res.status(201).json({ id: msgRef.id, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

app.post('/api/study-rooms/:id/pin-resource', authenticateToken, async (req, res) => {
  try {
    const { resourceId, title, url } = req.body;
    await updateDoc(doc(db, 'study_rooms', req.params.id), {
      pinnedResources: arrayUnion({ resourceId, title, url: url || '', pinnedBy: req.user.name, pinnedAt: new Date().toISOString() })
    });
    emitRealtimeRefresh(['study-rooms']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to pin resource' });
  }
});

app.post('/api/study-rooms/:id/pin-answer', authenticateToken, async (req, res) => {
  try {
    const { messageId, content, authorName } = req.body;
    await updateDoc(doc(db, 'study_rooms', req.params.id, 'messages', messageId), { isPinned: true });
    await updateDoc(doc(db, 'study_rooms', req.params.id), {
      pinnedAnswers: arrayUnion({ messageId, content, authorName, pinnedBy: req.user.name, pinnedAt: new Date().toISOString() })
    });
    emitRealtimeRefresh(['study-rooms']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to pin answer' });
  }
});

app.post('/api/study-rooms/:id/start-session', authenticateToken, async (req, res) => {
  try {
    const jitsiRoomName = `campusiq-room-${req.params.id}`;
    await updateDoc(doc(db, 'study_rooms', req.params.id), {
      activeSession: { jitsiRoom: jitsiRoomName, startedBy: req.user.name, startedAt: new Date().toISOString() }
    });
    broadcastToLive('study-rooms', {
      type: 'SESSION_STARTED', roomId: req.params.id, jitsiRoom: jitsiRoomName,
      startedBy: req.user.name, message: `${req.user.name} started a live session — Join?`
    });
    emitRealtimeRefresh(['study-rooms']);
    res.json({ jitsiRoom: jitsiRoomName });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start session' });
  }
});

// ── ANNOUNCEMENTS ──
app.post('/api/announcements', authenticateToken, async (req, res) => {
  const user = await getDoc(doc(db, 'users', req.user.id));
  const role = user.data()?.role;
  if (role !== 'admin' && role !== 'faculty') {
    return res.status(403).json({ message: 'Only admin/faculty can post announcements' });
  }
  try {
    const { title, content, category, isPinned } = req.body;
    await addDoc(announcementsRef, {
      title, content, category,
      isPinned: isPinned || false,
      author: buildUserPreview(req.user),
      reactions: {},
      createdAt: serverTimestamp()
    });
    emitRealtimeRefresh(['notifications', 'dashboard']);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to post announcement' });
  }
});

// ── COLLAB SCORE ──
app.get('/api/collab-score/me', authenticateToken, async (req, res) => {
  try {
    const user = await getDoc(doc(db, 'users', req.user.id));
    res.json({ 
      collabScore: user.data()?.collabScore || 0,
      rank: 'Top 5%', // Placeholder logic
      breakdown: {
        doubtsSolved: 12,
        sessionsHosted: 4,
        teamsFormed: 2
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load collab score' });
  }
});

app.get('/api/collab-score/leaderboard', authenticateToken, async (req, res) => {
  try {
    const q = query(usersRef, orderBy('collabScore', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    res.json(snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      collabScore: doc.data().collabScore || 0,
      avatar: doc.data().avatar
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load leaderboard' });
  }
});

// ── LIVE CLASSES ──
app.post('/api/live-classes', authenticateToken, async (req, res) => {
  try {
    const { title, topic, startsAt, branch, year, subjectTag } = req.body;
    
    if (!title || !startsAt) {
      return res.status(400).json({ message: 'Title and Start Time are required' });
    }

    const startTimeDate = new Date(startsAt);
    if (isNaN(startTimeDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start time format' });
    }
    
    // Estimate end time as 1 hour after start
    const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000);

    const newClass = {
      title: title.trim(),
      topic: (topic || '').trim(),
      subject: (subjectTag || '').trim(),
      startsAt: startsAt, // ISO string from frontend
      endsAt: endTimeDate.toISOString(),
      branch: branch || 'all',
      year: year || 'all',
      subjectTag: subjectTag || '',
      status: 'upcoming',
      mentorName: req.user.name || 'CampusIQ Mentor',
      mentorId: req.user.id || '',
      mentorAvatar: req.user.avatar || '',
      reminders: [],
      enrolledUsers: [],
      createdAt: serverTimestamp()
    };

    console.log('[DEBUG] Scheduling Live Class:', newClass.title);
    const docRef = await addDoc(liveClassesRef, newClass);
    console.log('[DEBUG] Successfully scheduled class with ID:', docRef.id);
    
    res.status(201).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('[ERROR] Failed to schedule class:', error);
    res.status(500).json({ message: 'Failed to schedule class. please check server logs.', details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT} using Firebase Firestore + WebSocket live updates`);
});
