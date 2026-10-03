import axiosInstance from "./axios";

export interface CloseFriend {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
  isVerified?: boolean;
}

export const fetchCloseFriends = async (): Promise<CloseFriend[]> => {
  const res = await axiosInstance.get("/api/close-friends");
  return res.data.closeFriends ?? [];
};

export const addCloseFriend = async (userId: string) => {
  const res = await axiosInstance.post(`/api/close-friends/${userId}`);
  return res.data;
};

export const removeCloseFriend = async (userId: string) => {
  const res = await axiosInstance.delete(`/api/close-friends/${userId}`);
  return res.data;
};

// Candidates to add: people you follow.
export const fetchFollowing = async (): Promise<CloseFriend[]> => {
  const res = await axiosInstance.get("/api/follow/following");
  return res.data.users ?? [];
};
