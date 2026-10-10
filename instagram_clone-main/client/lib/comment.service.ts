import axiosInstance from "./axios";

export interface CommentAuthor {
  _id: string;
  username: string;
  fullName?: string;
  profilePicture?: string;
  isVerified?: boolean;
}

export interface PostComment {
  _id: string;
  text: string;
  createdAt: string;
  user: CommentAuthor;
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const res = await axiosInstance.get(`/api/comments/${postId}`);
  return res.data.comments || [];
}

export async function addComment(
  postId: string,
  text: string,
): Promise<PostComment> {
  const res = await axiosInstance.post(`/api/comments/${postId}`, { text });
  return res.data.comment;
}

export async function removeComment(commentId: string): Promise<void> {
  await axiosInstance.delete(`/api/comments/${commentId}`);
}
