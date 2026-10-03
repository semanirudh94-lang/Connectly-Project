"use client";

import ProfileView from "@/components/insta/ProfileView";
import axiosInstance from "@/lib/axios";
import { currentUser, getUserByUsername } from "@/lib/mock-data";
import useAuthStore from "@/store/authStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const params = useParams();

  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const [user, setUser] = useState<any>(null);
  const curuser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchuser = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/auth/${username}`);
        setUser(res.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchuser();
  }, [username]);
  // const user = getUserByUsername(username || "");
  if (loading) {
    return <div className="flex justify-center py-10">Loading profile...</div>;
  }
  if (!user) {
    return <div>User not found</div>;
  }

  const isOwn = user.user._id === curuser?._id;

  return <ProfileView user={user} isOwnProfile={isOwn} />;
}
