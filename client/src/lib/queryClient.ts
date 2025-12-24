import { QueryClient, QueryFunction } from "@tanstack/react-query";

export interface ErrorDiagnosis {
  diagnosis: string;
  suggestedFix: string;
  severity: "low" | "medium" | "high" | "critical";
  possibleCauses: string[];
  errorLogId?: string;
}

let errorDiagnosisCallback: ((diagnosis: ErrorDiagnosis, originalError: string) => void) | null = null;

export function setErrorDiagnosisCallback(callback: (diagnosis: ErrorDiagnosis, originalError: string) => void) {
  errorDiagnosisCallback = callback;
}

export function clearErrorDiagnosisCallback() {
  errorDiagnosisCallback = null;
}

async function diagnoseError(
  url: string,
  method: string,
  statusCode: number,
  errorMessage: string
): Promise<ErrorDiagnosis | null> {
  try {
    // HIPAA COMPLIANCE: Never send request body data - it may contain PHI/PII
    const diagnosisRes = await fetch("/api/ai-issues/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: url,
        method: method,
        errorMessage: errorMessage,
        statusCode: statusCode,
      }),
    });

    if (diagnosisRes.ok) {
      return await diagnosisRes.json();
    }
  } catch (diagError) {
    console.error("Failed to get error diagnosis:", diagError);
  }
  return null;
}

async function throwIfResNotOk(res: Response, url: string, method: string) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const errorMessage = `${res.status}: ${text}`;
    
    if (res.status !== 401) {
      diagnoseError(url, method, res.status, text).then((diagnosis) => {
        if (diagnosis && errorDiagnosisCallback) {
          errorDiagnosisCallback(diagnosis, errorMessage);
        }
      });
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, url, method);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      const errorMessage = `${res.status}: ${text}`;
      
      if (res.status !== 401) {
        diagnoseError(url, "GET", res.status, text).then((diagnosis) => {
          if (diagnosis && errorDiagnosisCallback) {
            errorDiagnosisCallback(diagnosis, errorMessage);
          }
        });
      }
      
      throw new Error(errorMessage);
    }
    
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
