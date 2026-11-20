import axios from "axios";

const api = axios.create({
  baseURL: "https://venipackermybackend.onrender.com/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// =====================================================
// REFRESH TOKEN CONTROL
// =====================================================

let isRefreshing = false;

let failedQueue = [];


// =====================================================
// PROCESS QUEUED REQUESTS
// =====================================================

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};


// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    // ================================================
    // ACCESS TOKEN EXPIRED
    // ================================================

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      // ==============================================
      // ANOTHER REFRESH REQUEST ALREADY RUNNING
      // ==============================================

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
          });
        })
          .then((token) => {
            originalRequest.headers.Authorization =
              `Bearer ${token}`;

            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;

      isRefreshing = true;

      try {
        // ============================================
        // CALL REFRESH API
        // ============================================

        const response = await api.post("/auth/refresh");

        const newAccessToken =
          response.data?.data?.accessToken ||
          response.data?.accessToken;

        if (!newAccessToken) {
          throw new Error(
            "Access token not received"
          );
        }

        // ============================================
        // SAVE NEW ACCESS TOKEN
        // ============================================

        localStorage.setItem(
          "accessToken",
          newAccessToken
        );

        // ============================================
        // RESOLVE WAITING REQUESTS
        // ============================================

        processQueue(
          null,
          newAccessToken
        );

        // ============================================
        // RETRY ORIGINAL REQUEST
        // ============================================

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return api(originalRequest);

      } catch (refreshError) {

        // ============================================
        // REFRESH TOKEN ALSO EXPIRED / INVALID
        // ============================================

        processQueue(
          refreshError,
          null
        );

        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "user"
        );

        // ============================================
        // REDIRECT TO LOGIN
        // ============================================

        window.location.href = "/login";

        return Promise.reject(
          refreshError
        );

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;