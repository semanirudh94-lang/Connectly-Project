"use client";
import ProfileView from "@/components/insta/ProfileView";
import axiosInstance from "@/lib/axios";
import { currentUser } from "@/lib/mock-data";
import { useLanguage } from "@/lib/LanguageProvider";
import useAuthStore from "@/store/authStore";
import React, { useEffect, useState } from "react";

const page = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const curuser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchuser = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/auth/${curuser?.username}`);
        setUser(res.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchuser();
  }, [curuser]);
  // const user = getUserByUsername(username || "");
  if (loading) {
    return <div className="flex justify-center py-10">{t("profile.loadingProfile")}</div>;
  }
  if (!user) {
    return <div>{t("profile.userNotFound")}</div>;
  }
  if (user) return <ProfileView user={user} isOwnProfile />;
  else return <>{t("common.loading")}</>;
};

export default page;
