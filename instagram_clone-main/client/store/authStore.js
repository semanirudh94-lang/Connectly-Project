import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  login: ({ user, token }) => {
    console.log(user, token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    set({
      user: null,
      token: null,
    });
  },
  loadUser: () => {
    const token = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");
    if (token && user) {
      set({
        token,
        user: JSON.parse(user),
      });
    }
  },
  setUser: (user) => set({ user }),
}));
export default useAuthStore;
