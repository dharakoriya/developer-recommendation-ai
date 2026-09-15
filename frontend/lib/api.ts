let rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}
if (!rawBaseUrl.endsWith('/api')) {
  rawBaseUrl = `${rawBaseUrl}/api`;
}
const API_BASE_URL = rawBaseUrl;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('devalign_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorDetail = 'An unexpected server error occurred.';
      try {
        const errorJson = await res.json();
        errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = res.statusText || errorDetail;
      }

      if (res.status === 401) {
        throw new ApiError('Session expired or unauthenticated. Please log in again.', 401, errorDetail);
      } else if (res.status === 403) {
        throw new ApiError('Access forbidden. You do not have permission to access this resource.', 403, errorDetail);
      } else if (res.status === 404) {
        throw new ApiError('Resource not found.', 404, errorDetail);
      } else if (res.status === 422) {
        throw new ApiError('Invalid request parameters.', 422, errorDetail);
      } else if (res.status >= 500) {
        throw new ApiError(`Internal Server Error (${res.status}). Please try again later.`, res.status, errorDetail);
      }

      throw new ApiError(errorDetail, res.status);
    }

    if (res.status === 240 || res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err.message || 'Unable to connect to DevAlign AI server. Please verify your backend is running.',
      0
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),

  put: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
