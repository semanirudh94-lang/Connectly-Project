import axiosInstance from "./axios";

export type StoryPrivacy = "public" | "followers" | "close_friends";

export interface StoryMedia {
  url: string;
  type: "image" | "video";
  publicId?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface FeedStory {
  _id: string;
  media: StoryMedia;
  privacy: StoryPrivacy;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  isOwn: boolean;
}

export interface StoryGroup {
  user: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified?: boolean;
  };
  stories: FeedStory[];
}

// Upload a single media file (image or video) to the server, which streams it
// to Cloudinary. Returns the stored media descriptor.
export const uploadStoryMedia = async (file: File): Promise<StoryMedia> => {
  const form = new FormData();
  form.append("media", file);
  // Do NOT set Content-Type manually — the browser must generate the
  // multipart boundary itself, otherwise multer cannot parse the file.
  const res = await axiosInstance.post("/api/upload", form);
  return res.data.media;
};

export const createStory = async (
  media: StoryMedia[],
  privacy: StoryPrivacy,
) => {
  const res = await axiosInstance.post("/api/stories", { media, privacy });
  return res.data;
};

export const fetchStoryFeed = async (): Promise<StoryGroup[]> => {
  const res = await axiosInstance.get("/api/stories/feed");
  return res.data.groups ?? [];
};

export const recordStoryView = async (
  storyId: string,
  completed = false,
  lastItemIndex = 0,
) => {
  const res = await axiosInstance.post(`/api/stories/${storyId}/view`, {
    completed,
    lastItemIndex,
  });
  return res.data;
};

export const reactToStory = async (storyId: string, emoji: string) => {
  const res = await axiosInstance.post(`/api/stories/${storyId}/reaction`, {
    emoji,
  });
  return res.data;
};

export const replyToStory = async (storyId: string, text: string) => {
  const res = await axiosInstance.post(`/api/stories/${storyId}/reply`, {
    text,
  });
  return res.data;
};

export const deleteStory = async (storyId: string) => {
  const res = await axiosInstance.delete(`/api/stories/${storyId}`);
  return res.data;
};

export interface ArchiveStory {
  _id: string;
  media: StoryMedia;
  privacy: StoryPrivacy;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  isArchived: boolean;
  highlight: string | null;
}

export const fetchArchive = async (): Promise<ArchiveStory[]> => {
  const res = await axiosInstance.get("/api/stories/archive");
  return res.data.stories ?? [];
};
