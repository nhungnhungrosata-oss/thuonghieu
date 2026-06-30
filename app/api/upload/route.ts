import { NextResponse } from 'next/server';
import { apiUrl, parseUseApiResponse, pickMediaGenerationId, useApiHeaders } from '@/lib/useapi';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Thiếu file ảnh.' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Chỉ hỗ trợ PNG, JPEG hoặc WebP.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ảnh tối đa 20MB.' }, { status: 400 });
    }

    const email = process.env.USEAPI_EMAIL;
    const endpoint = email ? apiUrl(`/assets/${encodeURIComponent(email)}`) : apiUrl('/assets');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: useApiHeaders(file.type),
      body: Buffer.from(await file.arrayBuffer()),
    });
    const data = await parseUseApiResponse(response);
    const mediaGenerationId = pickMediaGenerationId(data);
    if (!mediaGenerationId) {
      return NextResponse.json({ error: 'UseAPI không trả về mediaGenerationId.', raw: data }, { status: 502 });
    }

    return NextResponse.json({ mediaGenerationId, raw: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload ảnh thất bại.', details: error?.data }, { status: error?.status || 500 });
  }
}
