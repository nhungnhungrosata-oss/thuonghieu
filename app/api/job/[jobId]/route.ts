import { NextResponse } from 'next/server';
import { apiUrl, parseUseApiResponse, useApiHeaders } from '@/lib/useapi';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    if (!jobId) return NextResponse.json({ error: 'Thiếu jobId.' }, { status: 400 });

    const response = await fetch(apiUrl(`/jobs/${encodeURIComponent(jobId)}`), {
      headers: useApiHeaders(),
      cache: 'no-store',
    });
    const data = await parseUseApiResponse(response);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Không đọc được trạng thái job.', details: error?.data }, { status: error?.status || 500 });
  }
}
