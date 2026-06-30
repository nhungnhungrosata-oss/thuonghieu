const BASE_URL = 'https://api.useapi.net/v1/google-flow';

export function requireUseApiToken() {
  const token = process.env.USEAPI_TOKEN;
  if (!token) {
    throw new Error('Thiếu biến môi trường USEAPI_TOKEN. Hãy thêm token dạng user:xxxx trong Vercel/Local.');
  }
  return token;
}

export function useApiHeaders(contentType?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireUseApiToken()}`,
  };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

export function apiUrl(path: string) {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function parseUseApiResponse(response: Response) {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `UseAPI HTTP ${response.status}`;
    const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

export function pickMediaGenerationId(uploadResponse: any): string | null {
  if (typeof uploadResponse?.mediaGenerationId === 'string') return uploadResponse.mediaGenerationId;
  if (typeof uploadResponse?.mediaGenerationId?.mediaGenerationId === 'string') return uploadResponse.mediaGenerationId.mediaGenerationId;
  if (typeof uploadResponse?.media?.[0]?.mediaGenerationId === 'string') return uploadResponse.media[0].mediaGenerationId;
  return null;
}
