import api from './api';

export const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
  }

  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

export const getMentorProfile = async () => {
  const response = await api.get('/mentor-profile/me');
  return response.data.profile;
};

export const saveMentorProfile = async (payload) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      formData.append(key, value.join(', '));
      return;
    }

    formData.append(key, value);
  });

  const response = await api.put('/mentor-profile/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.profile;
};

export const loadMentorPreview = async (max = 3) => {
  const response = await api.get('/mentors/discover', {
    params: { limit: max },
  });

  return response.data.mentors || [];
};

export const loadMentors = async (filters = {}) => {
  const response = await api.get('/mentors/discover', {
    params: {
      search: filters.search || undefined,
      subject: filters.subject || undefined,
      skill: filters.skill || undefined,
      minExperience: filters.minExperience || undefined,
    },
  });

  return response.data.mentors || [];
};

export const generateMentorBrief = async (mentorId) => {
  const response = await api.get(`/mentors/${mentorId}/brief`);
  return response.data;
};

export const createMentorshipRequest = async ({ mentorId, payload }) => {
  const response = await api.post(`/mentors/${mentorId}/request`, payload);
  return response.data;
};

export const loadMentorContext = async () => {
  const [uploads, saved, summaries, roadmap] = await Promise.allSettled([
    api.get('/resources/my-uploads'),
    api.get('/resources/saved'),
    api.get('/ai/summaries'),
    api.get('/roadmap'),
  ]);

  return {
    uploads: uploads.status === 'fulfilled' ? uploads.value.data.resources || [] : [],
    saved: saved.status === 'fulfilled' ? saved.value.data.resources || [] : [],
    summaries: summaries.status === 'fulfilled' ? summaries.value.data.summaries || [] : [],
    roadmap: roadmap.status === 'fulfilled' ? roadmap.value.data.roadmap || [] : [],
  };
};

export const fetchUserChats = async () => {
  const response = await api.get('/dm/conversations');
  return response.data.conversations || [];
};

export const fetchChatMessages = async (withUserId) => {
  const response = await api.get(`/dm/conversations/${withUserId}`);
  return response.data.messages || [];
};

export const sendMentorChatMessage = async ({ withUserId, text }) => {
  const response = await api.post(`/dm/conversations/${withUserId}`, { text });
  return response.data.message;
};

export const loadUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}/profile`);
  return response.data.profile;
};

export const loadMentorshipNotes = async (withUserId) => {
  const response = await api.get(`/mentorship/${withUserId}/notes`);
  return response.data;
};

export const saveMentorshipNotes = async ({ withUserId, notes }) => {
  const response = await api.put(`/mentorship/${withUserId}/notes`, { notes });
  return response.data;
};

export const loadMentorshipFollowups = async (withUserId) => {
  const response = await api.get(`/mentorship/${withUserId}/followups`);
  return response.data.followups || [];
};

export const loadMentorshipBookmark = async (withUserId) => {
  const response = await api.get(`/mentorship/${withUserId}/bookmark`);
  return response.data.bookmark || {
    starred: false,
    target: '',
    personalNotes: '',
    updatedAt: null,
  };
};

export const saveMentorshipBookmark = async ({ withUserId, starred, target, personalNotes }) => {
  const response = await api.put(`/mentorship/${withUserId}/bookmark`, {
    starred,
    target,
    personalNotes,
  });
  return response.data;
};

export const addMentorshipFollowup = async ({ withUserId, task, dueDate }) => {
  const response = await api.post(`/mentorship/${withUserId}/followups`, { task, dueDate });
  return response.data.followup;
};

export const updateMentorshipFollowup = async ({ followupId, status }) => {
  const response = await api.patch(`/mentorship/followups/${followupId}`, { status });
  return response.data;
};
