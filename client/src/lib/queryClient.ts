import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`🌐 API Request: ${method} ${url}`);
  console.log('📦 Request data:', data);
  
  const requestHeaders = data ? { "Content-Type": "application/json" } : {};
  console.log('📋 Request headers:', requestHeaders);
  
  const requestBody = data ? JSON.stringify(data) : undefined;
  console.log('🔄 Request body:', requestBody);
  
  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: "include",
    });

    console.log(`📡 Response status: ${res.status} ${res.statusText}`);
    console.log('📄 Response headers:', Object.fromEntries(res.headers.entries()));
    
    // Don't consume the response body yet, just check status
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API Error ${res.status}:`, errorText);
      throw new Error(`${res.status}: ${errorText}`);
    }
    
    console.log('✅ API request successful');
    return res;
  } catch (error) {
    console.error('💥 API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
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
