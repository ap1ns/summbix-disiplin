const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000/api';

let accessToken: string | null = null;

// ==================== TOKEN MANAGEMENT ====================

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// ==================== CORE FETCH WRAPPER ====================

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // for refresh token cookie
  });

  // If 401, try refreshing the token
  if (res.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  return res;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      accessToken = data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ==================== AUTH API ====================

export const authApi = {
  async register(email: string, password: string, name: string) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    accessToken = data.accessToken;
    return data;
  },

  async login(email: string, password: string) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    accessToken = data.accessToken;
    return data;
  },

  async logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    accessToken = null;
  },

  async verifyOtp(email: string, otp: string) {
    const res = await apiFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    accessToken = data.accessToken;
    return data;
  },

  async resendOtp(email: string) {
    const res = await apiFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async devLogin() {
    const res = await apiFetch('/auth/dev-login', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    accessToken = data.accessToken;
    return data;
  },

  async me() {
    const res = await apiFetch('/auth/me');
    if (!res.ok) return null;
    return res.json();
  },

  async tryRefresh() {
    const ok = await refreshAccessToken();
    if (!ok) return null;
    return authApi.me();
  },
};

// ==================== GOALS API ====================

export const goalsApi = {
  async getAll() {
    const res = await apiFetch('/goals');
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },

  async create(data: { title: string; description: string; deadline: string; color: string; startDate: string }) {
    const res = await apiFetch('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async update(id: string, data: Record<string, any>) {
    const res = await apiFetch(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async remove(id: string) {
    const res = await apiFetch(`/goals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete goal');
  },
};

// ==================== TASKS API ====================

export const tasksApi = {
  async getAll() {
    const res = await apiFetch('/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async create(data: { title: string; goalId?: string; priority: string; startTime?: string; endTime?: string; date?: string }) {
    const res = await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async update(id: string, data: Record<string, any>) {
    const res = await apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async toggle(id: string) {
    const res = await apiFetch(`/tasks/${id}/toggle`, { method: 'PATCH' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async remove(id: string) {
    const res = await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
  },
};

// ==================== HABITS API ====================

export const habitsApi = {
  async getAll() {
    const res = await apiFetch('/habits');
    if (!res.ok) throw new Error('Failed to fetch habits');
    return res.json();
  },

  async create(data: { label: string; goalId?: string; startTime?: string; endTime?: string }) {
    const res = await apiFetch('/habits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async update(id: string, data: Record<string, any>) {
    const res = await apiFetch(`/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async toggle(id: string, date: string) {
    const res = await apiFetch(`/habits/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ date }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async remove(id: string) {
    const res = await apiFetch(`/habits/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete habit');
  },
};

// ==================== SESSIONS API ====================

export const sessionsApi = {
  async getAll() {
    const res = await apiFetch('/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async create(data: { date: string; duration: number; title?: string; goalId?: string; taskId?: string; habitId?: string }) {
    const res = await apiFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async remove(id: string) {
    const res = await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  async removeByTask(taskId: string) {
    await apiFetch(`/sessions/by-task/${taskId}`, { method: 'DELETE' });
  },

  async removeByHabit(habitId: string, date?: string) {
    const query = date ? `?date=${date}` : '';
    await apiFetch(`/sessions/by-habit/${habitId}${query}`, { method: 'DELETE' });
  },
};

// ==================== NOTIFICATIONS API ====================

export const notificationsApi = {
  async getAll() {
    const res = await apiFetch('/notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markRead(id: string) {
    const res = await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
};

// ==================== PROFILE API ====================

export const profileApi = {
  async get() {
    const res = await apiFetch('/profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async update(data: { name?: string; avatar?: string; bio?: string; email?: string; newPassword?: string; currentPassword?: string }) {

    const res = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async deleteAccount() {
    const res = await apiFetch('/profile', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    accessToken = null;
  },
};
