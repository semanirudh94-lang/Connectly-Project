"use client";

import { useEffect, useState } from "react";
import { X, Monitor, Smartphone, Tablet, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import {
  fetchLoginHistory,
  type LoginHistoryEntry,
} from "@/lib/auth.service";

function DeviceIcon({ type }: { type: string }) {
  if (type === "Mobile") return <Smartphone size={16} />;
  if (type === "Tablet") return <Tablet size={16} />;
  return <Monitor size={16} />;
}

export default function LoginHistoryModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistory()
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const statusColor = (s: string) =>
    s === "success" ? "text-green-600" : "text-[#ed4956]";

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl w-full max-w-[480px] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <h2 className="text-sm font-semibold text-ig-text">
            {t("loginHistory.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="text-sm text-ig-muted text-center py-10">
              {t("common.loading")}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-ig-muted text-center py-10">
              {t("loginHistory.empty")}
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r._id}
                className="flex items-start gap-3 px-4 py-3 border-b border-ig-border last:border-b-0"
              >
                <span className="mt-0.5 text-ig-muted shrink-0">
                  <DeviceIcon type={r.deviceType} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ig-text truncate">
                      {r.browser} · {r.os}
                    </span>
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 ${statusColor(r.status)}`}
                    >
                      {r.status === "success" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {t(`loginHistory.status.${r.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-ig-muted mt-0.5 truncate">
                    {t("loginHistory.device")}: {t(`loginHistory.deviceType.${r.deviceType}`)}{" "}
                    · {t("loginHistory.ip")}: {r.ip || "—"}
                  </p>
                  <p className="text-xs text-ig-muted mt-0.5">{fmt(r.loginAt)}</p>
                  {r.failureReason && (
                    <p className="text-[11px] text-[#ed4956] mt-0.5">
                      {r.failureReason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
