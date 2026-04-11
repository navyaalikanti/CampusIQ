export const getStoredUser = () => {
  try {
    return JSON.parse(window.localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const THEME_KEY = 'campusiq-theme';

export const getStoredTheme = () => 'dark';

export const applyTheme = (theme) => {
  const nextTheme = 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  document.documentElement.style.colorScheme = nextTheme;
  return nextTheme;
};

export const setStoredTheme = (theme) => {
  const nextTheme = applyTheme('dark');
  window.localStorage.setItem(THEME_KEY, nextTheme);
  return nextTheme;
};

export const setStoredSession = ({ token, user }) => {
  if (token) {
    window.localStorage.setItem('token', token);
  }

  if (user) {
    window.localStorage.setItem('user', JSON.stringify(user));
  }
};

export const clearStoredSession = () => {
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
};

export const isMentorRole = (role) =>
  ['faculty', 'graduate'].includes(String(role || '').toLowerCase());
