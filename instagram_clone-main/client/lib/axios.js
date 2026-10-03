import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.BACKEND_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// When the access token is expired/invalid the API returns 401. Clear the dead
// session and send the user to login instead of showing a broken dashboard.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isAuthCall = error?.config?.url?.includes("/api/auth/login");
    if (status === 401 && !isAuthCall) {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      if (path !== "/login" && path !== "/signup") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
