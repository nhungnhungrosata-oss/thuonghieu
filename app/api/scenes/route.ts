import { NextResponse } from 'next/server';
import { createScenesFromScript } from '@/lib/scenes';

export async function POST(request: Request) {
  try {
    const { fullScript, numScenes } = await request.json();
    if (!fullScript || typeof fullScript !== 'string') {
      return NextResponse.json({ error: 'Vui lòng nhập nội dung kịch bản.' }, { status: 400 });
    }
    const scenes = createScenesFromScript(fullScript, Number(numScenes || 3));
    return NextResponse.json({ scenes });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Không tạo được phân cảnh.' }, { status: 500 });
  }
}
