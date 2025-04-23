import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = '';
    
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const clonedRes = res.clone();
        const errorData = await clonedRes.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // Fallback to text if not JSON
        errorMessage = await res.text();
      }
    } catch (e) {
      // If JSON parsing fails, try to get text
      try {
        errorMessage = await res.text();
      } catch (textError) {
        // If all else fails, use statusText
        errorMessage = res.statusText;
      }
    }
    
    // Create a more descriptive error
    const statusText = res.status === 413 ? 'Payload Too Large (File size exceeds server limit)' : res.statusText;
    throw new Error(`Request failed: ${res.status} ${statusText} - ${errorMessage}`);
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
