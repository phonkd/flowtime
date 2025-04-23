import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  // Default options
  const defaultOptions: RequestInit = {
    method: 'GET',
    credentials: 'include',
  };

  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Handle JSON data (if not FormData)
  if (mergedOptions.body && !(mergedOptions.body instanceof FormData)) {
    mergedOptions.headers = {
      ...mergedOptions.headers,
      'Content-Type': 'application/json',
    };
    
    if (typeof mergedOptions.body !== 'string') {
      mergedOptions.body = JSON.stringify(mergedOptions.body);
    }
  }
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (mergedOptions.body instanceof FormData && mergedOptions.headers) {
    const headers = mergedOptions.headers as Record<string, string>;
    if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }
  }

  const res = await fetch(url, mergedOptions);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
