import axiosInstance from "@/lib/axios";

export type ScheduledStatus =
  | "scheduled"
  | "published"
  | "cancelled"
  | "failed";

export interface ScheduledPost {
  _id: string;
  caption: string;
  location: string;
  media: { url: string; type: string; publicId?: string }[];
  visibility: "public" | "followers";
  status: ScheduledStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  publishAttempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface ScheduleCreateInput {
  media: { url: string; type: string; publicId?: string }[];
  caption?: string;
  location?: string;
  taggedUsers?: string[];
  visibility?: "public" | "followers";
  scheduledFor: string; // ISO date-time
}

export async function fetchMyScheduledPosts(
  status: ScheduledStatus | "all" = "all",
): Promise<ScheduledPost[]> {
  const res = await axiosInstance.get(
    `/api/posts/scheduled/me?status=${status}`,
  );
  return res.data.posts ?? [];
}

export async function createScheduledPost(
  input: ScheduleCreateInput,
): Promise<ScheduledPost> {
  const res = await axiosInstance.post("/api/posts/scheduled", input);
  return res.data.post;
}

export async function updateScheduledPost(
  id: string,
  body: Partial<ScheduleCreateInput>,
): Promise<ScheduledPost> {
  const res = await axiosInstance.put(`/api/posts/scheduled/${id}`, body);
  return res.data.post;
}

export async function cancelScheduledPost(
  id: string,
): Promise<ScheduledPost> {
  const res = await axiosInstance.delete(`/api/posts/scheduled/${id}`);
  return res.data.post;
}

// Uploads a single media file to Cloudinary via the server, returning the
// media object the scheduling API expects.
export async function uploadPostMedia(
  file: File,
): Promise<{ url: string; type: string; publicId?: string }> {
  const form = new FormData();
  form.append("media", file);
  const res = await axiosInstance.post("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.media;
}

