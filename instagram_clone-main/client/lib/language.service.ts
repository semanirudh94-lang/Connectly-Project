import axiosInstance from "@/lib/axios";
import type { Language } from "@/lib/LanguageProvider";

export interface LanguageInfo {
  language: Language;
  hasEmail: boolean;
  hasPhone: boolean;
}

export interface OtpRequestResult {
  channel: "email" | "sms";
  target: string;
  expiresIn: number;
  resendAfter: number;
  message?: string;
}

export async function fetchLanguage(): Promise<LanguageInfo> {
  const res = await axiosInstance.get("/api/language");
  return res.data;
}

export async function requestLanguageOtp(
  language: Language,
): Promise<OtpRequestResult> {
  const res = await axiosInstance.post("/api/language/otp", { language });
  return res.data;
}

export async function resendLanguageOtp(
  language: Language,
): Promise<OtpRequestResult> {
  const res = await axiosInstance.post("/api/language/otp/resend", { language });
  return res.data;
}

export async function verifyLanguageOtp(
  language: Language,
  otp: string,
): Promise<{ language: Language }> {
  const res = await axiosInstance.post("/api/language/verify", { language, otp });
  return res.data;
}
