"use client";

import MobileNav from "@/components/insta/MobileNav";
import Sidebar from "@/components/insta/Sidebar";
import axiosInstance from "@/lib/axios";
import {
  Conversation,
  currentUser,
  DMessage,
  formatMessageTime,
  mockConversations,
} from "@/lib/mock-data";
import { socket } from "@/lib/socket";
import useAuthStore from "@/store/authStore";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Edit,
  Heart,
  ImageIcon,
  Info,
  Mic,
  Phone,
  Search,
  Send,
  Smile,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const page = () => {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [message, setMessages] = useState<any[]>([]);
  // const [activeConvId, setActiveConvId] = useState<string>(
  //   mockConversations[0]._id,
  // );
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    initialize();
  }, []);
  const initialize = async () => {
    try {
      setLoading(true);

      const followRes = await axiosInstance.get("/api/follow/following");

      const ids = followRes.data.users.map((u: any) => u._id);

      const convRes = await axiosInstance.post("/api/conversation", {
        receiverId: ids,
      });

      setConversations(convRes.data.conversations);

      if (convRes.data.conversations.length) {
        openConversation(convRes.data.conversations[0]);
      }
    } finally {
      setLoading(false);
    }
  };
  const openConversation = async (conversation: any) => {
    if (activeConversation) {
      socket.emit("leave-conversation", activeConversation._id);
    }

    socket.emit("join-conversation", conversation._id);

    setActiveConversation(conversation);
    setShowChat(true);

    const res = await axiosInstance.get(
      `/api/conversation/${conversation._id}/messages`,
    );

    setMessages(res.data.messages);

    await axiosInstance.put(`/api/conversation/${conversation._id}/seen`);
  };
  useEffect(() => {
    const receiveMessage = (message: any) => {
      if (message.conversation !== activeConversation?._id) return;

      setMessages((prev) => [...prev, message]);
    };

    socket.on("receive-message", receiveMessage);

    return () => {
      socket.off("receive-message", receiveMessage);
    };
  }, [activeConversation]);
  useEffect(() => {
    const seenHandler = ({ conversationId }: any) => {
      if (conversationId !== activeConversation?._id) return;

      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          isSeen: true,
        })),
      );
    };

    socket.on("messages-seen", seenHandler);

    return () => {
      socket.off("messages-seen", seenHandler);
    };
  }, [activeConversation]);

  const filtered = conversations.filter((c: any) => {
    const other = c.participants.find((p: any) => p._id !== user._id);
    return (
      other.username.toLowerCase().includes(search.toLowerCase()) ||
      other.fullName.toLowerCase().includes(search.toLowerCase())
    );
  });
  // const filtered = mockConversations.filter(
  //   (c) =>
  //     c.participant.username.toLowerCase().includes(search.toLowerCase()) ||
  //     c.participant.fullName.toLowerCase().includes(search.toLowerCase()),
  // );

  const totalUnread = 0;

  return (
    <div className="bg-ig-surface min-h-screen">
      <Sidebar />

      <div
        className="md:pl-[72px] xl:pl-[244px] pb-[50px] md:pb-0"
        style={{ height: "100dvh" }}
      >
        <div className="h-full flex border-x border-ig-border mx-auto max-w-[935px]">
          {/* ── Left: Conversation list ── */}
          <div
            className={`w-full md:w-[350px] xl:w-[397px] shrink-0 flex flex-col border-r border-ig-border h-full ${showChat ? "hidden md:flex" : "flex"}`}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-base font-bold text-ig-text">
                  {user?.username}
                </h1>
                <div className="flex items-center gap-2">
                  <button className="text-ig-text hover:opacity-60 transition-opacity">
                    <Video size={22} strokeWidth={1.5} />
                  </button>
                  <button className="text-ig-text hover:opacity-60 transition-opacity">
                    <Edit size={22} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {/* Search */}
              <div className="flex items-center bg-ig-hover rounded-lg px-3 py-2 gap-2">
                <Search size={16} className="text-ig-muted shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent text-sm text-ig-text placeholder:text-ig-muted outline-none"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-ig-border shrink-0">
              <button className="flex-1 py-2 text-sm font-semibold text-ig-text border-b-2 border-ig-text">
                Messages
                {totalUnread > 0 && (
                  <span className="ml-2 bg-[#ed4956] text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </button>
              <button className="flex-1 py-2 text-sm text-ig-muted hover:text-ig-text transition-colors">
                Requests
              </button>
            </div>
            {/* Ḷists */}
            <div>
              {filtered.length === 0 ? (
                <div>
                  <Search /> <p>No results found</p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <ConversationItem
                    key={conv._id}
                    conversation={conv}
                    currentUserId={user?._id}
                    active={conv._id === activeConversation?._id}
                    onClick={() => openConversation(conv)}
                  />
                ))
              )}
            </div>
          </div>
          <div
            className={`flex-1 flex flex-col h-full min-w-0 ${showChat ? "flex" : "hidden md:flex"}`}
          >
            {activeConversation ? (
              <ChatPanel
                conv={activeConversation}
                messages={message}
                user={user}
                setMessages={setMessages}
                onBack={() => setShowChat(false)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                <div className="w-20 h-20 rounded-full border-2 border-ig-text flex items-center justify-center">
                  <Send size={32} strokeWidth={1} className="text-ig-text" />
                </div>
                <h2 className="text-xl font-light text-ig-text">
                  Your messages
                </h2>
                <p className="text-sm text-ig-muted max-w-[280px]">
                  Send private photos and messages to a friend or group.
                </p>
                <button className="px-4 py-2 bg-[#0095f6] text-white text-sm font-semibold rounded-lg hover:bg-[#1877f2] transition-colors">
                  Send message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
};
function ChatPanel({ conv, messages, user, setMessages, onBack }: any) {
  const participant = conv.participants.find((p: any) => p._id !== user._id);
  const [rewriting, setrewriting] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  useEffect(() => {
    socket.on("typing", () => {
      setTyping(true);
    });

    socket.on("stop-typing", () => {
      setTyping(false);
    });

    return () => {
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, []);
  const rewriteMessage = async (tone: string) => {
    if (!input.trim()) return;
    try {
      setrewriting(true);
      const res = await axiosInstance.post("/api/ai/rewrite", {
        message: input,
        tone,
      });
      setInput(res.data.message);
    } catch (error) {
      console.log(error);
    } finally {
      setrewriting(false);
    }
  };
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);
  const send = async () => {
    const text = input.trim();

    if (!text) return;

    try {
      setInput("");

      await axiosInstance.post(`/api/conversation/${conv._id}/message`, {
        text: input,
      });

      // Socket will append it automatically
    } catch (err) {
      console.log(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  const groupedMessages: { date: string; msgs: DMessage[] }[] = [];
  messages.forEach((msg: any) => {
    const d = new Date(msg.createdAt).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  });
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border bg-ig-surface shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 text-ig-text hover:opacity-60"
            >
              <ChevronLeft size={24} strokeWidth={1.5} />
            </button>
          )}
          <Link
            href={`/profile/${participant.username}`}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <img
                src={participant.profilePicture}
                alt={participant.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ig-text leading-tight">
                {participant.username}
              </p>
              <p className="text-xs text-green-500">Active now</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-ig-text hover:opacity-60 transition-opacity">
            <Phone size={22} strokeWidth={1.5} />
          </button>
          <button className="text-ig-text hover:opacity-60 transition-opacity">
            <Video size={22} strokeWidth={1.5} />
          </button>
          <button className="text-ig-text hover:opacity-60 transition-opacity">
            <Info size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 scrollbar-hide">
        {/* Profile card at top */}
        <div className="flex flex-col items-center gap-2 py-6 mb-2">
          <img
            src={participant.profilePicture}
            alt={participant.username}
            className="w-20 h-20 rounded-full object-cover"
          />
          <p className="text-base font-semibold text-ig-text">
            {participant.username}
          </p>
          <p className="text-sm text-ig-muted">{participant.fullName}</p>
          <Link
            href={`/profile/${participant.username}`}
            className="mt-1 px-4 py-1.5 text-sm font-semibold text-ig-text bg-ig-hover rounded-lg hover:bg-ig-border transition-colors"
          >
            View profile
          </Link>
        </div>

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date} className="flex flex-col gap-2">
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-ig-border" />
              <span className="text-xs text-ig-muted">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <div className="flex-1 h-px bg-ig-border" />
            </div>
            {msgs.map((msg) => (
              <MessageBubble
                key={msg._id}
                msg={msg}
                user={user}
                participant={participant}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-end gap-2">
            <img
              src={participant.profilePicture}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <div className="bg-ig-hover rounded-3xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-ig-border px-4 py-3 flex items-center gap-3 bg-ig-surface shrink-0">
        <button className="text-[#0095f6] hover:opacity-70 transition-opacity shrink-0">
          <Smile size={22} />
        </button>
        <div className="relative" ref={aiMenuRef}>
          <button
            type="button"
            onClick={() => setShowAiMenu((prev) => !prev)}
            disabled={rewriting}
            className="text-purple-500 hover:text-purple-600 transition p-1 rounded-full hover:bg-gray-100"
          >
            <Sparkles size={20} className={rewriting ? "animate-spin" : ""} />
          </button>

          {showAiMenu && (
            <div className="absolute bottom-10 left-0 z-50 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b px-3 py-2 text-xs font-semibold text-gray-500">
                Rewrite with AI
              </div>

              {[
                { tone: "friendly", icon: "😊", label: "Friendly" },
                { tone: "casual", icon: "😎", label: "Casual" },
                { tone: "professional", icon: "💼", label: "Professional" },
                { tone: "funny", icon: "😂", label: "Funny" },
                { tone: "romantic", icon: "❤️", label: "Romantic" },
              ].map((item) => (
                <button
                  key={item.tone}
                  type="button"
                  disabled={rewriting}
                  onClick={async () => {
                    setShowAiMenu(false);
                    await rewriteMessage(item.tone);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center bg-ig-hover rounded-full px-4 py-2 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);

              socket.emit("typing", {
                conversationId: conv._id,
                userId: user._id,
              });

              if (typingRef.current) {
                clearTimeout(typingRef.current);
              }

              typingRef.current = setTimeout(() => {
                socket.emit("stop-typing", {
                  conversationId: conv._id,
                  userId: user._id,
                });
              }, 1000);
            }}
            onKeyDown={handleKeyDown}
            disabled={rewriting}
            placeholder={rewriting ? "AI is rewriting..." : "Message..."}
            className="flex-1 bg-transparent text-sm text-ig-text placeholder:text-ig-muted outline-none"
          />
          {input.trim() ? (
            <button
              onClick={send}
              className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] shrink-0"
            >
              Send
            </button>
          ) : (
            <button className="text-[#0095f6] hover:opacity-70 shrink-0">
              <Mic size={18} />
            </button>
          )}
        </div>
        {!input.trim() && (
          <>
            <button className="text-ig-text hover:opacity-60 shrink-0">
              <ImageIcon size={22} strokeWidth={1.5} />
            </button>
            <button className="text-ig-text hover:opacity-60 shrink-0">
              <Heart size={22} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  user,
  participant,
}: {
  msg: any;
  user: any;
  participant: any;
}) {
  const isMe = msg.sender._id === user._id;
  const [reaction, setReaction] = useState(msg.reactionEmoji ?? "");
  const emojis = ["❤️", "😂", "😮", "😢", "😡", "👍"];
  return (
    <div
      className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
    >
      {!isMe && (
        <img
          src={participant?.profilePicture}
          alt={participant?.username}
          className="w-7 h-7 rounded-full object-cover shrink-0 mb-0.5"
        />
      )}

      <div className="relative max-w-[70%]">
        <div
          className={`px-4 py-2.5 rounded-3xl text-sm leading-snug cursor-pointer ${
            isMe
              ? "bg-[#0095f6] text-white rounded-br-md"
              : "bg-ig-hover text-ig-text rounded-bl-md"
          }`}
          onDoubleClick={() => {
            setReaction("❤️");
          }}
        >
          {msg.text}
        </div>

        {/* Reaction */}
        {reaction && (
          <button
            onClick={() => setReaction("")}
            className={`absolute -bottom-3 text-sm ${isMe ? "left-2" : "right-2"}`}
          >
            {reaction}
          </button>
        )}

        {/* Hover reaction picker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-ig-surface rounded-full shadow-md border border-ig-border px-2 py-1 z-10 ${
            isMe ? "right-full mr-2" : "left-full ml-2"
          }`}
        >
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => setReaction(reaction === e ? "" : e)}
              className="hover:scale-125 transition-transform text-base"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Read receipt */}
      {isMe && (
        <span className="text-[10px] text-ig-muted mb-1 self-end">
          {msg.isSeen ? (
            <CheckCheck size={13} className="text-[#0095f6]" />
          ) : (
            <Check size={13} className="text-ig-muted" />
          )}
        </span>
      )}
    </div>
  );
}
function ConversationItem({
  conversation,
  currentUserId,
  active,
  onClick,
}: any) {
  const participant = conversation.participants.find(
    (p: any) => p._id !== currentUserId,
  );

  const last = conversation.lastMessage;

  const isMe = last?.sender?._id?.toString() === currentUserId.toString();
  const preview = last
    ? `${isMe ? "You: " : ""}${last.text}`
    : "Start chatting";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-ig-hover transition-colors text-left ${
        active ? "bg-ig-hover" : ""
      }`}
    >
      <div className="relative shrink-0">
        <img
          src={participant.profilePicture}
          alt={participant.username}
          className="w-14 h-14 rounded-full object-cover"
        />
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm text-ig-text truncate ${conversation.unread > 0 ? "font-semibold" : ""}`}
          >
            {participant.username}
          </span>
          <span className="text-xs text-ig-muted shrink-0">
            {formatMessageTime(last?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-sm truncate ${conversation.unread > 0 ? "text-ig-text font-medium" : "text-ig-muted"}`}
          >
            {preview}
          </p>
          {conversation.unread > 0 && (
            <span className="shrink-0 w-5 h-5 bg-[#0095f6] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
export default page;
