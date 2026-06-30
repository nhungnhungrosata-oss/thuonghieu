export interface SceneDto {
  id: string;
  originalText: string;
  currentText: string;
  status: 'idle' | 'generating' | 'polling' | 'done' | 'error' | 'retrying';
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaGenerationId?: string;
  jobId?: string;
  error?: string;
}

const CTA = 'Hãy lưu lại và theo dõi Trang để cập nhật thêm những kiến thức hữu ích mỗi ngày nhé.';

function clean(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim();
}

function splitSentences(input: string) {
  return clean(input)
    .split(/(?<=[.!?。！？])\s+|\n+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function trimToWords(text: string, max = 28) {
  const w = words(text);
  if (w.length <= max) return text.trim();
  return `${w.slice(0, max).join(' ').replace(/[,.!?;:]+$/, '')}.`;
}

function packIntoScenes(sentences: string[], count: number) {
  const raw = sentences.length ? sentences : ['Hôm nay mình chia sẻ một nội dung rất thực tế, dễ hiểu và có thể áp dụng ngay trong cuộc sống.'];
  const groups: string[][] = Array.from({ length: count }, () => []);
  raw.forEach((sentence, index) => {
    const bucket = Math.min(count - 1, Math.floor((index / raw.length) * count));
    groups[bucket].push(sentence);
  });
  return groups.map((group, i) => {
    const joined = group.join(' ') || raw[Math.min(i, raw.length - 1)] || raw[0];
    return trimToWords(joined, 26);
  });
}

export function createScenesFromScript(fullScript: string, count: number): SceneDto[] {
  const sceneCount = Math.max(1, Math.min(8, Number(count) || 3));
  const sentences = splitSentences(fullScript);
  const packed = packIntoScenes(sentences, sceneCount);

  const scenes = packed.map((text, index) => {
    let currentText = text;
    if (index === 0 && !/[?？]$/.test(currentText)) {
      currentText = trimToWords(`Bạn có biết không, ${currentText.charAt(0).toLowerCase()}${currentText.slice(1)}`, 26);
    }
    if (index === sceneCount - 1) {
      currentText = sceneCount === 1 ? trimToWords(`${currentText} ${CTA}`, 28) : trimToWords(CTA, 24);
    }
    return {
      id: `scene-${index + 1}`,
      originalText: currentText,
      currentText,
      status: 'idle' as const,
    };
  });

  return scenes;
}
