"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/insta/Sidebar";
import MobileNav from "@/components/insta/MobileNav";
import SubscriptionSection from "@/components/insta/SubscriptionSection";
import ScheduledPostsSection from "@/components/insta/ScheduledPostsSection";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { LANGUAGES, useLanguage, type Language } from "@/lib/LanguageProvider";
import {
  fetchLanguage,
  requestLanguageOtp,
  resendLanguageOtp,
  verifyLanguageOtp,
} from "@/lib/language.service";
import useAuthStore from "@/store/authStore";

const OTP_LEN = 6;

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [hasPhone, setHasPhone] = useState(false);
  const [selected, setSelected] = useState<Language | null>(null);
  const [stage, setStage] = useState<"idle" | "otp">("idle");
  const [channel, setChannel] = useState<"email" | "sms">("sms");
  const [target, setTarget] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetchLanguage()
      .then((info) => {
        setHasPhone(info.hasPhone);
        setSelected(info.language as Language);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const channelNote = (lang: Language) =>
    lang === "fr" ? t("settings.channelNote.fr") : t("settings.channelNote.sms");

  async function startVerification(lang: Language) {
    setError("");
    setBusy(true);
    try {
      const res = await requestLanguageOtp(lang);
      setChannel(res.channel);
      setTarget(res.target);
      setCooldown(res.resendAfter ?? 30);
      setDigits(Array(OTP_LEN).fill(""));
      setStage("otp");
      toast.add({ type: "success", title: t("settings.codeSent") });
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong";
      setError(msg);
      if (err?.response?.status === 400 && /mobile number/i.test(msg)) {
        toast.add({ type: "error", title: t("settings.addPhoneFirst") });
      } else {
        toast.add({ type: "error", title: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!selected || cooldown > 0) return;
    setBusy(true);
    try {
      const res = await resendLanguageOtp(selected);
      setCooldown(res.resendAfter ?? 30);
      setDigits(Array(OTP_LEN).fill(""));
      toast.add({ type: "success", title: t("settings.codeSent") });
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend");
    } finally {
      setBusy(false);
    }
  }

  function onDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((v, i) => (i === index ? "" : v)));
      return;
    }
    // Allow pasting a full code into any box.
    if (clean.length > 1) {
      const next = Array(OTP_LEN).fill("");
      clean.slice(0, OTP_LEN).split("").forEach((c, i) => (next[i] = c));
      setDigits(next);
      inputsRef.current[Math.min(clean.length, OTP_LEN - 1)]?.focus();
      return;
    }
    setDigits((d) => d.map((v, i) => (i === index ? clean : v)));
    if (index < OTP_LEN - 1) inputsRef.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!selected) return;
    const otp = digits.join("");
    if (otp.length !== OTP_LEN) {
      setError(t("settings.enterCode"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await verifyLanguageOtp(selected, otp);
      setLanguage(res.language);
      if (user) {
        const updated = { ...user, language: res.language };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
      }
      toast.add({ type: "success", title: t("settings.verified") });
      setStage("idle");
      setDigits(Array(OTP_LEN).fill(""));
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || "Verification failed";
      setError(msg);
      if (status === 429) {
        toast.add({ type: "error", title: t("settings.locked") });
        setStage("idle");
      }
      setDigits(Array(OTP_LEN).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setStage("idle");
    setSelected(language);
    setDigits(Array(OTP_LEN).fill(""));
    setError("");
  }

  return (
    <div className="bg-ig-surface md:bg-ig-ig min-h-screen">
      <Sidebar />
      <div className="md:ml-[72px] xl:ml-[244px]">
        <div className="max-w-[640px] mx-auto px-4 py-8 pb-24 md:pb-8">
          <h1 className="text-xl font-semibold text-ig-text mb-6">
            {t("settings.title")}
          </h1>

          <section className="bg-ig-surface border border-ig-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-ig-text">
              {t("settings.language")}
            </h2>
            <p className="text-sm text-ig-muted mt-1 mb-5">
              {t("settings.languageDesc")}
            </p>

            <div className="flex flex-col gap-2">
              {LANGUAGES.map(({ code, flag, labelKey }) => {
                const isCurrent = code === language;
                const isSelected = code === selected;
                return (
                  <button
                    key={code}
                    disabled={busy || isCurrent}
                    onClick={() => {
                      setSelected(code);
                      if (!isCurrent) startVerification(code);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-colors text-left disabled:opacity-60 ${
                      isSelected
                        ? "border-ig-text bg-ig-hover"
                        : "border-ig-border hover:bg-ig-hover"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg leading-none">{flag}</span>
                      <span className="text-sm text-ig-text">
                        {t(labelKey)}
                      </span>
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-ig-muted">
                        {t("settings.currentLanguage")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selected && selected !== language && stage === "idle" && (
              <p className="text-xs text-ig-muted mt-4">
                {channelNote(selected)}
                {selected !== "fr" && !hasPhone && (
                  <span className="block mt-1 text-[#ed4956]">
                    {t("settings.addPhoneFirst")}
                  </span>
                )}
              </p>
            )}
          </section>

          {stage === "otp" && selected && (
            <section className="bg-ig-surface border border-ig-border rounded-xl p-5 mt-4">
              <h2 className="text-base font-semibold text-ig-text">
                {t("settings.otpTitle")}
              </h2>
              <p className="text-sm text-ig-muted mt-1 mb-1">
                {channel === "email"
                  ? t("settings.otpSentEmail")
                  : t("settings.otpSentSms")}
              </p>
              {target && (
                <p className="text-sm text-ig-text font-medium mb-5">
                  {target}
                </p>
              )}

              <div className="flex gap-2 mb-4">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => onDigitChange(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    inputMode="numeric"
                    maxLength={OTP_LEN}
                    aria-label={`${t("settings.enterCode")} ${i + 1}`}
                    className="w-11 h-13 flex-1 text-center text-xl font-semibold rounded-lg border border-ig-border bg-transparent text-ig-text focus:outline-none focus:border-ig-text"
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-[#ed4956] mb-3">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleVerify} disabled={busy}>
                  {busy ? t("settings.verifying") : t("common.verify")}
                </Button>
                <Button variant="ghost" onClick={cancel} disabled={busy}>
                  {t("common.cancel")}
                </Button>
              </div>

              <div className="mt-4">
                {cooldown > 0 ? (
                  <span className="text-xs text-ig-muted">
                    {t("settings.resendIn", { s: cooldown })}
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={busy}
                    className="text-xs text-ig-text underline disabled:opacity-50"
                  >
                    {t("common.resend")}
                  </button>
                )}
              </div>
            </section>
          )}

          <SubscriptionSection />

          <ScheduledPostsSection />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
