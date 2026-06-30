import { NextResponse } from 'next/server';
import { apiUrl, parseUseApiResponse, useApiHeaders } from '@/lib/useapi';

export const runtime = 'nodejs';

function buildPrompt(input: { sceneText: string; region: string; expression: string }) {
  return `A professional cinematic vertical portrait video using the uploaded start image as the exact first frame.
STRICT IDENTITY RULES:
1. Keep the person's face, facial features, hairstyle, age, skin tone, clothing, and background IDENTICAL to the uploaded reference image.
2. Static camera, no scene change, no new objects, no text overlay, no watermark.
3. Only natural micro facial movement and mouth movement while speaking.
4. Spoken Vietnamese dialogue exactly: "${input.sceneText}".
5. Accent / regional tone: ${input.region}. Do not mix accents.
6. Expression and delivery: ${input.expression}. Natural, human, clear, friendly.
7. Vertical 9:16 social video, realistic lighting, clean audio, 8 seconds.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sceneText, mediaGenerationId, region, expression } = body;
    if (!sceneText || !mediaGenerationId) {
      return NextResponse.json({ error: 'Thiếu lời thoại hoặc mediaGenerationId ảnh.' }, { status: 400 });
    }

    const model = process.env.USEAPI_MODEL || 'veo-3.1-lite';
    const response = await fetch(apiUrl('/videos'), {
      method: 'POST',
      headers: useApiHeaders('application/json'),
      body: JSON.stringify({
        prompt: buildPrompt({ sceneText, region: region || 'Bắc Việt Nam', expression: expression || 'Tư vấn nhẹ nhàng' }),
        model,
        aspectRatio: 'portrait',
        duration: 8,
        count: 1,
        startImage: mediaGenerationId,
        async: true,
        captchaRetry: 5,
      }),
    });

    const data = await parseUseApiResponse(response);
    const jobId = data.jobid || data.jobId;
    if (!jobId) {
      // Some accounts may return sync 200 even when async is false/ignored.
      const media = data.media?.[0];
      if (media?.videoUrl && media?.mediaGenerationId) {
        return NextResponse.json({ status: 'completed', media });
      }
      return NextResponse.json({ error: 'UseAPI không trả về jobId.', raw: data }, { status: 502 });
    }
    return NextResponse.json({ status: 'created', jobId, raw: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Tạo video thất bại.', details: error?.data }, { status: error?.status || 500 });
  }
}
