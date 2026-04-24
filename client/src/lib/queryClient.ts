import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string; message?: string };
      if (j?.error) detail = j.error;
      else if (j?.message) detail = j.message;
    } catch {
      /* not JSON */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey parts, handling objects as query params
    let url = "";
    let queryParams: Record<string, string> = {};
    
    for (const part of queryKey) {
      if (typeof part === "string") {
        // String parts are joined to form the URL path
        if (url && !url.endsWith("/") && !part.startsWith("/")) {
          url += "/";
        }
        url += part;
      } else if (part !== null && part !== undefined && typeof part === "object") {
        // Object parts become query parameters
        for (const [key, value] of Object.entries(part)) {
          if (value !== null && value !== undefined && value !== "") {
            queryParams[key] = String(value);
          }
        }
      }
    }
    
    // Append query params if any
    const paramString = new URLSearchParams(queryParams).toString();
    if (paramString) {
      url += (url.includes("?") ? "&" : "?") + paramString;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
