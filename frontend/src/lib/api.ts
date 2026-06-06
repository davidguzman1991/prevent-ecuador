export const getApiBaseUrl = () => {
  const configuredApiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : "");

  if (!configuredApiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  if (typeof window !== "undefined") {
    try {
      const configuredUrl = new URL(configuredApiBaseUrl);
      const currentUrl = new URL(window.location.origin);
      const isPreventPreview =
        currentUrl.hostname.endsWith(".vercel.app") &&
        currentUrl.hostname.startsWith("prevent-ecuador-");
      const isPreventProductionApi = configuredUrl.hostname === "prevent-ecuador.vercel.app";

      if (isPreventPreview && isPreventProductionApi) {
        return currentUrl.origin;
      }
    } catch {
      return configuredApiBaseUrl;
    }
  }

  return configuredApiBaseUrl;
};

export function getJsonRequestHeaders(accessToken?: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}
