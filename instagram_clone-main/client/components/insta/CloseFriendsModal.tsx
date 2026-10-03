"use client";

import { useEffect, useState } from "react";
import { X, Star, UserPlus, UserCheck } from "lucide-react";
import {
  fetchCloseFriends,
  fetchFollowing,
  addCloseFriend,
  removeCloseFriend,
  CloseFriend,
} from "@/lib/closeFriends.service";
import { toast } from "../ui/toast";

interface Props {
  onClose: () => void;
}

type Tab = "list" | "add";

const CloseFriendsModal = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("list");
  const [friends, setFriends] = useState<CloseFriend[]>([]);
  const [following, setFollowing] = useState<CloseFriend[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cf, fw] = await Promise.all([
        fetchCloseFriends(),
        fetchFollowing(),
      ]);
      setFriends(cf);
      setFollowing(fw);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const friendIds = new Set(friends.map((f) => f._id));
  const candidates = following.filter((u) => !friendIds.has(u._id));

  const handleAdd = async (userId: string) => {
    try {
      await addCloseFriend(userId);
      setFriends((f) => [
        ...f,
        ...(following.filter((u) => u._id === userId) || []),
      ]);
      toast.add({ type: "success", title: "Added to close friends" });
    } catch (error) {
      toast.add({ type: "error", title: "Failed to add" });
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCloseFriend(userId);
      setFriends((f) => f.filter((x) => x._id !== userId));
      toast.add({ type: "success", title: "Removed" });
    } catch (error) {
      toast.add({ type: "error", title: "Failed to remove" });
    }
  };

  const Row = ({
    u,
    action,
  }: {
    u: CloseFriend;
    action: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 px-4 py-2">
      <img
        src={u.profilePicture}
        alt=""
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ig-text font-medium truncate">{u.username}</p>
        <p className="text-xs text-ig-muted truncate">{u.fullName}</p>
      </div>
      {action}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[170] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-ig-surface rounded-xl w-full max-w-[440px] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-[#0095f6]" />
            <h2 className="text-sm font-semibold text-ig-text">Close Friends</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ig-text hover:opacity-60 transition-opacity"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-ig-border shrink-0">
          {(["list", "add"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-ig-text text-ig-text"
                  : "border-transparent text-ig-muted hover:text-ig-text"
              }`}
            >
              {t === "list" ? `List (${friends.length})` : "Add people"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 py-1">
          {loading ? (
            <p className="text-sm text-ig-muted text-center py-10">Loading…</p>
          ) : tab === "list" ? (
            friends.length === 0 ? (
              <p className="text-sm text-ig-muted text-center py-10">
                No close friends yet. Add people to share close-friend stories.
              </p>
            ) : (
              friends.map((u) => (
                <Row
                  key={u._id}
                  u={u}
                  action={
                    <button
                      onClick={() => handleRemove(u._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors"
                    >
                      Remove
                    </button>
                  }
                />
              ))
            )
          ) : candidates.length === 0 ? (
            <p className="text-sm text-ig-muted text-center py-10">
              Everyone you follow is already a close friend.
            </p>
          ) : (
            candidates.map((u) => (
              <Row
                key={u._id}
                u={u}
                action={
                  <button
                    onClick={() => handleAdd(u._id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0095f6] rounded-lg hover:bg-[#1877f2] transition-colors"
                  >
                    <UserPlus size={13} /> Add
                  </button>
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CloseFriendsModal;
