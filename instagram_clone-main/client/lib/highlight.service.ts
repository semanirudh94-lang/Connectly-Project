import axiosInstance from "./axios";
import { StoryMedia, StoryPrivacy } from "./story.service";

export interface HighlightStory {
  _id: string;
  media: StoryMedia;
  privacy: StoryPrivacy;
  createdAt: string;
}

export interface Highlight {
  _id: string;
  name: string;
  cover: string;
  stories: HighlightStory[];
}

export interface HighlightDetail {
  _id: string;
  name: string;
  cover: string;
  user: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    isVerified?: boolean;
  };
  stories: HighlightStory[];
}

export const fetchHighlights = async (username: string): Promise<Highlight[]> => {
  const res = await axiosInstance.get(`/api/highlights/user/${username}`);
  return res.data.highlights ?? [];
};

export const fetchHighlightDetail = async (
  id: string,
): Promise<HighlightDetail> => {
  const res = await axiosInstance.get(`/api/highlights/${id}`);
  return res.data.highlight;
};

export const createHighlight = async (
  name: string,
  cover: string,
  storyIds: string[],
) => {
  const res = await axiosInstance.post("/api/highlights", {
    name,
    cover,
    storyIds,
  });
  return res.data.highlight;
};

export const addToHighlight = async (id: string, storyIds: string[]) => {
  const res = await axiosInstance.post(`/api/highlights/${id}/stories`, {
    storyIds,
  });
  return res.data.highlight;
};

export const removeFromHighlight = async (id: string, storyId: string) => {
  const res = await axiosInstance.delete(
    `/api/highlights/${id}/stories/${storyId}`,
  );
  return res.data.highlight;
};

export const deleteHighlight = async (id: string) => {
  const res = await axiosInstance.delete(`/api/highlights/${id}`);
  return res.data;
};
