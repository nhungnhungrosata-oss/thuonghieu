'use client';

import { useMemo, useRef, useState } from 'react';
import type { SceneDto } from '@/lib/scenes';

type Portrait = {
  previewUrl: string;
  mediaGenerationId: string;
  fileName: string;
};

type Processing = {
  isProcessing: boolean;
  statusText: string;
};

const expressions = [
  'Tư vấn nhẹ nhàng',
  'Mỉm cười thân thiện',
  'Chuyên gia nghiêm túc',
  'Giải thích tự nhiên',
  'Cảnh báo nhẹ nhàng',
  'Đồng cảm, gần gũi',
  'Tự tin, chuyên nghiệp',
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function readError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [fullScript, setFullScript] = useState('');
  const [numScenes, setNumScenes] = useState('3');
  const [region, setRegion] = useState('Bắc Việt Nam');
  const [expression, setExpression] = useState('Tư vấn nhẹ nhàng');
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [processing, setProcessing] = useState<Processing>({ isProcessing: false, statusText: '' });

  const canJoin = useMemo(() => scenes.filter(s => s.status === 'done' && s.mediaGenerationId).length >= 2, [scenes]);

  async function uploadPortrait(file: File) {
    setProcessing({ isProcessing: true, statusText: 'Đang upload ảnh lên UseAPI...' });
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    const previewUrl = URL.createObjectURL(file);
    setPortrait({ previewUrl, mediaGenerationId: data.mediaGenerationId, fileName: file.name });
    setProcessing({ isProcessing: false, statusText: 'Đã upload ảnh nhân vật thành công.' });
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadPortrait(file);
    } catch (error: any) {
      setProcessing({ isProcessing: false, statusText: '' });
      alert(error?.message || 'Upload ảnh thất bại.');
    } finally {
      event.target.value = '';
    }
  }

  async function createScenes() {
    if (!portrait) return alert('Vui lòng chọn ảnh nhân vật trước.');
    if (!fullScript.trim()) return alert('Vui lòng nhập nội dung kịch bản.');
    try {
      setProcessing({ isProcessing: true, statusText: 'Đang tạo phân cảnh và tối ưu lời thoại...' });
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullScript, numScenes: Number(numScenes) }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      setScenes(data.scenes);
      setProcessing({ isProcessing: false, statusText: 'Đã tạo phân cảnh thành công.' });
    } catch (error: any) {
      setProcessing({ isProcessing: false, statusText: '' });
      alert(error?.message || 'Không tạo được phân cảnh.');
    }
  }

  function updateScene(id: string, currentText: string) {
    setScenes(prev => prev.map(scene => {
      if (scene.id !== id) return scene;
      const maxLength = Math.max(scene.originalText.length + 40, 160);
      if (currentText.length > maxLength) return scene;
      return { ...scene, currentText };
    }));
  }

  async function pollJob(jobId: string, index: number) {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      await delay(5000);
      const response = await fetch(`/api/job/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await readError(response));
      const job = await response.json();
      if (job.status === 'failed') {
        throw new Error(job.error || 'UseAPI báo job video thất bại.');
      }
      if (job.status === 'completed') {
        const media = job.response?.media?.[0];
        if (!media?.videoUrl || !media?.mediaGenerationId) throw new Error('Job hoàn thành nhưng thiếu videoUrl/mediaGenerationId.');
        setScenes(prev => prev.map((scene, i) => i === index ? {
          ...scene,
          status: 'done',
          videoUrl: media.videoUrl,
          thumbnailUrl: media.thumbnailUrl,
          mediaGenerationId: media.mediaGenerationId,
        } : scene));
        return;
      }
      setProcessing({ isProcessing: true, statusText: `Đang chờ UseAPI xử lý cảnh ${index + 1}... (${job.status || 'created'})` });
    }
    throw new Error('Quá thời gian chờ job video.');
  }

  async function generateScene(index: number, retry = false) {
    if (!portrait) return alert('Vui lòng chọn ảnh nhân vật trước.');
    const scene = scenes[index];
    if (!scene?.currentText?.trim()) return alert('Lời thoại cảnh đang trống.');

    setScenes(prev => prev.map((s, i) => i === index ? { ...s, status: retry ? 'retrying' : 'generating', error: undefined } : s));
    setProcessing({ isProcessing: true, statusText: `Đang gửi cảnh ${index + 1} sang UseAPI...` });

    try {
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneText: scene.currentText,
          mediaGenerationId: portrait.mediaGenerationId,
          region,
          expression,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();

      if (data.status === 'completed' && data.media) {
        setScenes(prev => prev.map((s, i) => i === index ? {
          ...s,
          status: 'done',
          videoUrl: data.media.videoUrl,
          thumbnailUrl: data.media.thumbnailUrl,
          mediaGenerationId: data.media.mediaGenerationId,
        } : s));
      } else {
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, status: 'polling', jobId: data.jobId } : s));
        await pollJob(data.jobId, index);
      }
      setProcessing({ isProcessing: false, statusText: `Đã tạo xong video cảnh ${index + 1}.` });
    } catch (error: any) {
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, status: 'error', error: error?.message || 'Lỗi tạo video' } : s));
      setProcessing({ isProcessing: false, statusText: '' });
      throw error;
    }
  }

  async function generateAllVideos() {
    if (!portrait) return alert('Vui lòng chọn ảnh nhân vật trước.');
    if (!scenes.length) return alert('Vui lòng tạo phân cảnh trước.');
    for (let i = 0; i < scenes.length; i += 1) {
      const latest = scenes[i];
      if (latest.status === 'done') continue;
      try {
        await generateScene(i);
      } catch (error) {
        console.error(error);
      }
    }
    setProcessing({ isProcessing: false, statusText: 'Đã chạy xong toàn bộ cảnh. Cảnh lỗi có thể bấm Tạo lại.' });
  }

  async function joinVideos() {
    const ids = scenes.filter(s => s.status === 'done' && s.mediaGenerationId).map(s => s.mediaGenerationId as string);
    if (ids.length < 2) return alert('Cần ít nhất 2 cảnh đã tạo xong để ghép.');
    try {
      setProcessing({ isProcessing: true, statusText: 'Đang ghép video bằng UseAPI...' });
      const response = await fetch('/api/concat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaGenerationIds: ids }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      const base64 = data.encodedVideo;
      if (!base64) throw new Error('UseAPI không trả về encodedVideo.');
      const a = document.createElement('a');
      a.href = `data:video/mp4;base64,${base64}`;
      a.download = 'Video_Hoan_Chinh.mp4';
      a.click();
      setProcessing({ isProcessing: false, statusText: 'Đã ghép và tải video full.' });
    } catch (error: any) {
      setProcessing({ isProcessing: false, statusText: '' });
      alert(error?.message || 'Ghép video thất bại.');
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <section>
          <div className="label">Ảnh nhân vật</div>
          <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
          <button className="uploadBox" onClick={() => inputRef.current?.click()} type="button">
            {portrait ? <img src={portrait.previewUrl} alt="Ảnh nhân vật" /> : <span className="uploadHint">+ Chọn ảnh chân dung<br />PNG/JPEG/WebP, tối đa 20MB</span>}
          </button>
        </section>

        <section>
          <div className="label">Nội dung kịch bản</div>
          <textarea className="scriptArea" value={fullScript} onChange={e => setFullScript(e.target.value)} placeholder="Nhập nội dung chia sẻ hoặc kịch bản thô tại đây..." />
        </section>

        <section className="grid">
          <div>
            <div className="label">Số cảnh</div>
            <select value={numScenes} onChange={e => setNumScenes(e.target.value)}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} cảnh ({n * 8}s)</option>)}
            </select>
          </div>
          <div>
            <div className="label">Vùng miền</div>
            <select value={region} onChange={e => setRegion(e.target.value)}>
              <option>Bắc Việt Nam</option>
              <option>Trung Việt Nam</option>
              <option>Nam Việt Nam</option>
            </select>
          </div>
          <div>
            <div className="label">Biểu cảm</div>
            <select value={expression} onChange={e => setExpression(e.target.value)}>
              {expressions.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
        </section>

        <button className="btn primary" disabled={processing.isProcessing || !portrait || !fullScript.trim()} onClick={createScenes}>Phân cảnh & Tạo lời thoại</button>
        <div className="notice">App dùng UseAPI server-side: upload ảnh → tạo video 8 giây/cảnh → ghép video full. Không lộ USEAPI_TOKEN trên trình duyệt.</div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>Kịch bản video chia sẻ</h1>
            <p>Dạng một người nói trực tiếp, mỗi cảnh 8 giây, dùng ảnh nhân vật làm start frame.</p>
          </div>
          <div className="actions">
            {scenes.length > 0 && <button className="btn outline" disabled={processing.isProcessing} onClick={generateAllVideos}>Tạo tất cả video</button>}
            {canJoin && <button className="btn primary" disabled={processing.isProcessing} onClick={joinVideos}>Ghép & Tải video full</button>}
          </div>
        </header>

        <div className="list">
          {scenes.length === 0 ? (
            <div className="empty">
              <div className="emptyIcon">▦</div>
              <p>Nhập nội dung và bấm “Phân cảnh” để tạo lời thoại từng cảnh.</p>
            </div>
          ) : scenes.map((scene, idx) => (
            <article className="card" key={scene.id}>
              <div>
                <div className="preview">
                  {scene.videoUrl ? <video src={scene.videoUrl} loop muted autoPlay playsInline controls /> : portrait ? <img src={portrait.previewUrl} alt="preview" /> : null}
                  <div className="badge">{idx + 1}</div>
                  {(scene.status === 'generating' || scene.status === 'polling' || scene.status === 'retrying') && <div className="overlay"><div className="spin" /></div>}
                  {scene.status === 'done' && <div className="status ok">OK</div>}
                  {scene.status === 'error' && <div className="status err">Lỗi</div>}
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  {scene.status !== 'done' && <button className="btn outline small" disabled={processing.isProcessing} onClick={() => generateScene(idx).catch(err => alert(err?.message || 'Lỗi'))}>Tạo cảnh</button>}
                  {scene.status === 'error' && <button className="btn danger small" disabled={processing.isProcessing} onClick={() => generateScene(idx, true).catch(err => alert(err?.message || 'Lỗi'))}>Tạo lại</button>}
                  {scene.videoUrl && <a className="btn outline small" href={scene.videoUrl} download={`scene-${idx + 1}.mp4`} target="_blank">Tải cảnh</a>}
                </div>
              </div>

              <div className="cardMain">
                <div className="cardTop">
                  <strong>Lời thoại cảnh {idx + 1}</strong>
                  <span className="counter">{scene.currentText.length} ký tự</span>
                </div>
                <textarea className="sceneText" value={scene.currentText} disabled={processing.isProcessing} onChange={e => updateScene(scene.id, e.target.value)} />
                <div className="tip">Mẹo: giữ lời thoại khoảng 18–25 từ để khớp tự nhiên với 8 giây.</div>
                {scene.jobId && <div className="tip">Job ID: {scene.jobId}</div>}
                {scene.error && <div className="errorText">{scene.error}</div>}
              </div>
            </article>
          ))}
        </div>
      </main>

      {processing.statusText && <div className="toast">{processing.statusText}</div>}
    </div>
  );
}
