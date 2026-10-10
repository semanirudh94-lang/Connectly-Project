"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { searchUsers, type TaggableUser } from "@/lib/auth.service";

interface TagUsersInputProps {
  selected: TaggableUser[];
  onChange: (users: TaggableUser[]) => void;
  max?: number;
}

// Multi-select username picker used by the create-post and schedule forms.
export default function TagUsersInput({
  selected,
  onChange,
  max = 20,
}: TagUsersInputProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaggableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const found = await searchUsers(query.trim());
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  const add = (user: TaggableUser) => {
    if (selected.some((s) => s._id === user._id) || selected.length >= max) return;
    onChange([...selected, user]);
    setQuery("");
    setResults([]);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-ig-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("post.tagPlaceholder")}
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-ig-border bg-transparent text-ig-text placeholder:text-ig-muted focus:outline-none focus:border-ig-text"
        />
        {searching && <Loader2 size={15} className="animate-spin text-ig-muted" />}
      </div>

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-ig-muted mt-2">{t("post.tagNoResults")}</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 border border-ig-border rounded-lg divide-y divide-ig-border overflow-hidden">
          {results.map((u) => (
            <li key={u._id}>
              <button
                type="button"
                onClick={() => add(u)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-ig-hover"
              >
                {u.profilePicture ? (
                  <img
                    src={u.profilePicture}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-ig-hover" />
                )}
                <span className="text-sm text-ig-text">@{u.username}</span>
                {u.fullName && (
                  <span className="text-xs text-ig-muted">{u.fullName}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((u) => (
            <span
              key={u._id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0095f6]/15 text-[#0095f6] text-xs font-semibold"
            >
              @{u.username}
              <button
                type="button"
                aria-label={t("post.tagRemove")}
                onClick={() => onChange(selected.filter((s) => s._id !== u._id))}
                className="hover:opacity-60"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
