// Admin API utilities for fetching dynamic data

const API_BASE_URL = "http://localhost:8000/admin"; // In production, this should be an env variable or relative

export const fetchAdminStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) throw new Error("Failed to fetch admin stats");
  return response.json();
};

export const fetchAdminAnalytics = async () => {
  const response = await fetch(`${API_BASE_URL}/analytics`);
  if (!response.ok) throw new Error("Failed to fetch analytics");
  return response.json();
};

export const fetchUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/users`);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
};

export const fetchQuestions = async () => {
  const response = await fetch(`${API_BASE_URL}/questions`);
  if (!response.ok) throw new Error("Failed to fetch questions");
  return response.json();
};

export const createQuestion = async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create question");
  return response.json();
};

export const updateQuestion = async (id: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update question");
  return response.json();
};

export const deleteQuestion = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete question");
  return response.json();
};

export const toggleQuestion = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/questions/${id}/toggle`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to toggle question");
  return response.json();
};

export const fetchTemplates = async () => {
  const response = await fetch(`${API_BASE_URL}/templates`);
  if (!response.ok) throw new Error("Failed to fetch templates");
  return response.json();
};

export const createTemplate = async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create template");
  return response.json();
};

export const updateTemplate = async (id: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update template");
  return response.json();
};

export const deleteTemplate = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete template");
  return response.json();
};

export const fetchReports = async () => {
  const response = await fetch(`${API_BASE_URL}/reports`);
  if (!response.ok) throw new Error("Failed to fetch reports");
  return response.json();
};

export const fetchLiveInterviews = async () => {
  const response = await fetch(`${API_BASE_URL}/live`);
  if (!response.ok) throw new Error("Failed to fetch live interviews");
  return response.json();
};

export const fetchLiveSessionDetails = async (sessionId: string) => {
  const response = await fetch(`${API_BASE_URL}/live/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch live session details");
  return response.json();
};

export const fetchSystemHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error("Failed to fetch system health");
  return response.json();
};

export const fetchDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/dashboard`);
  if (!response.ok) throw new Error("Failed to fetch dashboard data");
  return response.json();
};

export const fetchAnalytics = async (filters: any = {}) => {
  const query = new URLSearchParams(filters).toString();
  
  const [overviewRes, interviewsRes, rolesRes, skillsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/analytics/overview?${query}`),
    fetch(`${API_BASE_URL}/analytics/interviews?${query}`),
    fetch(`${API_BASE_URL}/analytics/roles?${query}`),
    fetch(`${API_BASE_URL}/analytics/skills?${query}`)
  ]);
  
  if (!overviewRes.ok || !interviewsRes.ok || !rolesRes.ok || !skillsRes.ok) {
    throw new Error("Failed to fetch analytics");
  }
  
  const overview = await overviewRes.json();
  const interviews = await interviewsRes.json();
  const roles = await rolesRes.json();
  const skills = await skillsRes.json();
  
  return {
    ...overview,
    interviewsPerDay: interviews,
    rolesDistribution: roles,
    weakSkills: skills
  };
};

export const fetchHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error("Failed to fetch system health");
  return response.json();
};

export const fetchSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings`);
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
};

export const updateSettings = async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update settings");
  return response.json();
};
