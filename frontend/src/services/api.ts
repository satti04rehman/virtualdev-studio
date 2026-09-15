const BASE_URL = 'http://localhost:8000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('vdev_token');
}

function setToken(token: string): void {
  localStorage.setItem('vdev_token', token);
}

function clearToken(): void {
  localStorage.removeItem('vdev_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || errorData?.message || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  setToken,
  clearToken,
  getToken,

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || 'Login failed');
    }

    const data = await response.json();
    setToken(data.access_token);
    return data;
  },

  async register(email: string, password: string, fullName: string, username: string) {
    const data = await request<{ id: string; email: string; username: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        username,
      }),
    });
    return data;
  },

  async getProjects() {
    return request<{ items: any[]; total: number }>('/projects');
  },

  async createProject(project: {
    name: string;
    description: string;
    target_users: string;
    platform: string;
    tech_stack: string[];
    complexity: string;
  }) {
    return request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  async getProject(id: string) {
    return request<any>(`/projects/${id}`);
  },

  async getProjectStages(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/stages`);
  },

  async getRequirements(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/requirements`);
  },

  async getResearch(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/research`);
  },

  async getArchitecture(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/architecture`);
  },

  async getTasks(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/tasks`);
  },

  async getAgents() {
    return request<{ items: any[] }>('/agents');
  },

  async getApprovals(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/approvals`);
  },

  async decideApproval(approvalId: string, decision: 'approved' | 'rejected', note?: string) {
    return request<any>(`/approvals/${approvalId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status: decision, decision_note: note }),
    });
  },

  async getDocuments(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/documents`);
  },

  async getDiagrams(projectId: string) {
    return request<{ items: any[] }>(`/projects/${projectId}/diagrams`);
  },

  async startOrchestration(projectId: string) {
    return request<any>(`/projects/${projectId}/orchestrate`, {
      method: 'POST',
    });
  },

  async getDashboardStats() {
    return request<any>('/dashboard/stats');
  },

  async getRecentActivity() {
    return request<{ items: any[] }>('/dashboard/activity');
  },

  async getCurrentUser() {
    return request<any>('/auth/me');
  },
};

export default api;
