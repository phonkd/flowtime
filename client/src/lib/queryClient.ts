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
  method: string,
  url: string, 
  data?: any
): Promise<Response> {
  // Default options
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  };

  // Add body for non-GET requests with data
  if (method !== 'GET' && data) {
    if (data instanceof FormData) {
      // For FormData, don't set Content-Type as browser will set it with boundary
      options.body = data;
    } else {
      // For JSON data
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(data);
    }
  }

  console.log(`API Request: ${method} ${url}`, data ? 'With data' : 'No data');
  
  try {
    const res = await fetch(url, options);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Error: ${method} ${url}`, error);
    throw error;
  }
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
