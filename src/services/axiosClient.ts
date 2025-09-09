// Simple Axios Client - Direct API Integration
import axios from "axios";

// Get API URL from environment variable or fallback
const getOptimalApiUrl = () => {
  const isHttps = window.location.protocol === "https:";
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const envApiUrl = import.meta.env.VITE_API_URL;

  // If the frontend is served over HTTPS but the configured API URL is HTTP,
  // prefer the same-origin relative proxy to avoid browser mixed-content blocks.
  if (envApiUrl) {
    try {
      const lower = String(envApiUrl).toLowerCase();
      if (isHttps && lower.startsWith("http://")) {
        console.warn(
          "🔒 Detected HTTPS origin but API URL is HTTP; using same-origin proxy to avoid mixed content"
        );
        return "/anansiai";
      }
      return envApiUrl;
    } catch (e) {
      console.warn("⚠️ Invalid VITE_API_URL, falling back to same-origin proxy", e);
      return "/anansiai";
    }
  }

  return "/anansiai";
};

const API_BASE_URL = getOptimalApiUrl();

// Debug: Log the URL being used
console.log("🔧 API Base URL:", API_BASE_URL);
console.log("🔧 Protocol Selection:", {
  currentProtocol: window.location.protocol,
  selectedApiUrl: API_BASE_URL,
  reason: "HTTP forced for development - API server doesn't support HTTPS",
});

// Create axios instance with base configuration
export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // increase default timeout to 45s
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add request interceptor for auth tokens and debugging
axiosClient.interceptors.request.use(
  (config) => {
    // Check multiple possible token keys
    const token = localStorage.getItem("anansi_token") ||
                  localStorage.getItem("authToken") ||
                  localStorage.getItem("auth_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔐 Using auth token for request");
    } else {
      console.warn("⚠️ No auth token found - API may return 401 Unauthorized");
    }

    // Debug: Log every request URL to confirm correct endpoint
    console.log("🌐 Making API request to:", config.baseURL + config.url);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enhanced logging for easier debugging
    try {
      const resp = error.response;
      const req = error.config || {};
      const fullUrl = (req.baseURL || API_BASE_URL) + (req.url || "");
      const method = (req.method || "GET").toUpperCase();
      const status = resp?.status;
      console.error("API Error:", {
        message: error.message,
        method,
        url: fullUrl,
        status,
        responseData: resp?.data,
      });

      // If 404, provide an explicit hint that the endpoint might be missing
      if (status === 404) {
        console.error(`404 Not Found for ${method} ${fullUrl} - the backend may not expose this endpoint.`);
      }
    } catch (e) {
      console.error("Error while logging API error:", e);
    }

    const config = error.config || {};
    config.__retryCount = config.__retryCount || 0;

    // Simple retry on timeout/network up to 2 times with backoff
    const isTimeout = error.code === "ECONNABORTED" && String(error.message).includes("timeout");
    const isNetwork = error.code === "ERR_NETWORK" || error.message === "Network Error";
    if ((isTimeout || isNetwork) && config.__retryCount < 2) {
      config.__retryCount += 1;
      const delay = 500 * Math.pow(2, config.__retryCount);
      await new Promise((r) => setTimeout(r, delay));
      return axiosClient.request(config);
    }

    if (isTimeout) {
      console.error("⏰ Request Timeout - API server is responding slowly");
      console.error("• Server:", API_BASE_URL);
    } else if (isNetwork) {
      console.error("🚫 Network Error - likely HTTPS/cors/proxy issue");
      console.error("• Trying to connect to:", API_BASE_URL);
    }

    return Promise.reject(error);
  },
);

// Connection test function to help diagnose issues
export const testApiConnection = async () => {
  const testUrl = `${axiosClient.defaults.baseURL}/api/Institutions`;

  console.log("🔍 Testing API connectivity...");

  try {
    console.log("🧪 Testing API:", testUrl);
    const response = await axios.get(testUrl, {
      timeout: 8000,
      headers: { Accept: "application/json" },
    });
    if (response.status >= 200 && response.status < 300) {
      console.log("✅ API connection successful via proxy");
      return { success: true, url: testUrl, data: response.data };
    }
  } catch (error: any) {
    console.log("❌ API test failed:", error.message);
  }

  console.log("❌ API test failed - backend may be down");
  return { success: false };
};

export default axiosClient;
