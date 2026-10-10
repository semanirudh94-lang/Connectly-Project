import axiosInstance from "@/lib/axios";

export interface AdminStats {
  users: { total: number; active: number; admins: number };
  posts: number;
  stories: number;
  comments: number;
  subscriptions: {
    active: number;
    byPlan: { bronze: number; silver: number; gold: number };
  };
  reports: {
    total: number;
    byStatus: {
      pending: number;
      reviewed: number;
      resolved: number;
      dismissed: number;
    };
  };
  engagement: {
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  from?: string;
  to?: string;
  [key: string]: string | number | undefined;
}

function qs(params: ListParams = {}): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── overview ──
export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await axiosInstance.get("/api/admin/stats");
  return res.data.stats;
}

// ── users ──
export async function listUsers(params?: ListParams): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/users${qs(params)}`);
  return res.data;
}
export async function createUser(body: any) {
  const res = await axiosInstance.post("/api/admin/users", body);
  return res.data.user;
}
export async function updateUser(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/users/${id}`, body);
  return res.data.user;
}
export async function deleteUser(id: string) {
  const res = await axiosInstance.delete(`/api/admin/users/${id}`);
  return res.data;
}

// ── posts ──
export async function listPosts(params?: ListParams): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/posts${qs(params)}`);
  return res.data;
}
export async function updatePost(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/posts/${id}`, body);
  return res.data.post;
}
export async function deletePost(id: string) {
  const res = await axiosInstance.delete(`/api/admin/posts/${id}`);
  return res.data;
}

// ── scheduled posts ──
export async function listScheduledPosts(
  params?: ListParams,
): Promise<Paginated<any>> {
  const res = await axiosInstance.get(
    `/api/admin/scheduled-posts${qs(params)}`,
  );
  return res.data;
}
export async function updateScheduledPost(id: string, body: any) {
  const res = await axiosInstance.put(
    `/api/admin/scheduled-posts/${id}`,
    body,
  );
  return res.data.post;
}
export async function cancelScheduledPost(id: string) {
  const res = await axiosInstance.delete(`/api/admin/scheduled-posts/${id}`);
  return res.data;
}

// ── scheduler failure log ──
export async function listPublishErrors(
  params?: ListParams,
): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/publish-errors${qs(params)}`);
  return res.data;
}

// ── stories ──
export async function listStories(params?: ListParams): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/stories${qs(params)}`);
  return res.data;
}
export async function updateStory(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/stories/${id}`, body);
  return res.data.story;
}
export async function deleteStory(id: string) {
  const res = await axiosInstance.delete(`/api/admin/stories/${id}`);
  return res.data;
}

// ── subscriptions ──
export async function listSubscriptions(
  params?: ListParams,
): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/subscriptions${qs(params)}`);
  return res.data;
}
export async function createSubscription(body: {
  user: string;
  plan: string;
  days?: number;
}) {
  const res = await axiosInstance.post("/api/admin/subscriptions", body);
  return res.data.subscription;
}
export async function updateSubscription(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/subscriptions/${id}`, body);
  return res.data.subscription;
}
export async function deleteSubscription(id: string) {
  const res = await axiosInstance.delete(`/api/admin/subscriptions/${id}`);
  return res.data;
}

// ── reports ──
export async function listReports(params?: ListParams): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/reports${qs(params)}`);
  return res.data;
}
export async function updateReport(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/reports/${id}`, body);
  return res.data.report;
}
export async function deleteReport(id: string) {
  const res = await axiosInstance.delete(`/api/admin/reports/${id}`);
  return res.data;
}

// ── comments ──
export async function listComments(params?: ListParams): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/comments${qs(params)}`);
  return res.data;
}
export async function updateComment(id: string, body: any) {
  const res = await axiosInstance.put(`/api/admin/comments/${id}`, body);
  return res.data.comment;
}
export async function deleteComment(id: string) {
  const res = await axiosInstance.delete(`/api/admin/comments/${id}`);
  return res.data;
}

// ── audit log ──
export async function listAuditLogs(
  params?: ListParams,
): Promise<Paginated<any>> {
  const res = await axiosInstance.get(`/api/admin/audit-logs${qs(params)}`);
  return res.data;
}
