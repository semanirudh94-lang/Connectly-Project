import axiosInstance from "./axios";

export type ReportTargetType = "post" | "story" | "comment" | "user";

export async function reportTarget(
  targetType: ReportTargetType,
  targetId: string,
  description = "",
): Promise<void> {
  await axiosInstance.post("/api/reports", {
    targetType,
    targetId,
    reason: "other",
    description,
  });
}
