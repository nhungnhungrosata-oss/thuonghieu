import { NextResponse } from 'next/server';
import { apiUrl, parseUseApiResponse, useApiHeaders } from '@/lib/useapi';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { mediaGenerationIds } = await request.json();
    if (!Array.isArray(mediaGenerationIds) || mediaGenerationIds.length < 2) {
      return NextResponse.json({ error: 'Cần ít nhất 2 video đã hoàn thành để ghép.' }, { status: 400 });
    }

    const response = await fetch(apiUrl('/videos/concatenate'), {
      method: 'POST',
      headers: useApiHeaders('application/json'),
      body: JSON.stringify({
        media: mediaGenerationIds.map((mediaGenerationId: string, index: number) => ({
          mediaGenerationId,
          ...(index > 0 ? { trimStart: 0.2 } : {}),
        })),
      }),
    });
    const data = await parseUseApiResponse(response);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ghép video thất bại.', details: error?.data }, { status: error?.status || 500 });
  }
}
