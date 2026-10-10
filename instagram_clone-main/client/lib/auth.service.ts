import axiosInstance from "@/lib/axios";

export interface LoginOtpStart {
  requiresOtp: true;
  challengeToken: string;
  target: string;
  expiresIn: number;
  resendAfter: number;
  message: string;
}

export interface LoginSuccess {
  success: true;
  user: any;
  accessToken: string;
  message?: string;
}

export interface LoginHistoryEntry {
  _id: string;
  browser: string;
  os: string;
  deviceType: string;
  ip: string;
  status: "success" | "failed" | "otp_failed" | "denied_window" | "pending";
  failureReason?: string;
  loginAt: string;
}

export async function verifyLoginOtp(
  challengeToken: string,
  otp: string,
): Promise<LoginSuccess> {
  const res = await axiosInstance.post("/api/auth/login/verify", {
    challengeToken,
    otp,
  });
  return res.data;
}

export async function resendLoginOtp(
  challengeToken: string,
): Promise<{ target: string; resendAfter: number; message: string }> {
  const res = await axiosInstance.post("/api/auth/login/resend", {
    challengeToken,
  });
  return res.data;
}

export async function fetchLoginHistory(): Promise<LoginHistoryEntry[]> {
  const res = await axiosInstance.get("/api/auth/login-history");
  return res.data.history ?? [];
}

export interface TaggableUser {
  _id: string;
  username: string;
  fullName?: string;
  profilePicture?: string;
}

// Username/fullName lookup used by the post tag picker.
export async function searchUsers(q: string): Promise<TaggableUser[]> {
  const res = await axiosInstance.get("/api/auth/search/users", {
    params: { q },
  });
  return res.data.users ?? [];
}
