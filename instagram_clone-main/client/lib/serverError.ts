import { hasTranslation, type Language } from "@/lib/LanguageProvider";

type Translator = (key: string, vars?: Record<string, string | number>) => string;

// The API answers in English but always tags a response with a stable `code`.
// When we have a translation for that code we show it; otherwise we show the
// server's own message so nothing is ever blank.
export function apiMessage(
  data: any,
  language: Language,
  t: Translator,
  fallback: string,
): string {
  const code = data?.code;

  if (code) {
    const key = `errors.${code}`;
    if (hasTranslation(language, key)) {
      const channel =
        data?.channel === "email"
          ? t("errors.channelEmail")
          : data?.channel === "sms"
            ? t("errors.channelSms")
            : (data?.channel ?? "");
      return t(key, {
        wait: data?.retryAfter ?? "",
        count: data?.attemptsLeft ?? "",
        max: data?.max ?? "",
        channel,
      });
    }
  }

  return data?.message || fallback;
}

export function serverMessage(
  error: any,
  language: Language,
  t: Translator,
  fallback: string,
): string {
  return apiMessage(error?.response?.data, language, t, fallback);
}
