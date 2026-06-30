# UseAPI Flow Video App

App tạo video AI nhiều cảnh từ một ảnh nhân vật, dùng UseAPI Google Flow API.

## Chức năng

- Upload ảnh nhân vật lên UseAPI (`POST /google-flow/assets`).
- Nhập nội dung/kịch bản thô.
- Chọn số cảnh 1–8, mỗi cảnh 8 giây.
- Chọn giọng vùng miền: Bắc / Trung / Nam Việt Nam.
- Chọn biểu cảm.
- Tạo lời thoại từng cảnh.
- Tạo từng cảnh hoặc tạo tất cả video.
- Tạo lại cảnh lỗi.
- Tải từng cảnh.
- Ghép video full bằng UseAPI (`POST /google-flow/videos/concatenate`).

## Cài đặt local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở: `http://localhost:3000`

## Biến môi trường

```env
USEAPI_TOKEN=user:xxxxxxxxxxxxxxxxxxxxxxxx
USEAPI_EMAIL=your-flow-account@gmail.com
USEAPI_MODEL=veo-3.1-lite
```

`USEAPI_TOKEN` là bắt buộc và phải để ở server/Vercel Environment Variables, không đưa vào code frontend.

`USEAPI_EMAIL` nên là Gmail Google Flow đã add thành công trong UseAPI. Nếu có nhiều account và muốn UseAPI tự chọn account khỏe nhất, có thể bỏ trống biến này.

## Deploy Vercel

1. Đẩy source lên GitHub.
2. Import project vào Vercel.
3. Thêm Environment Variables:
   - `USEAPI_TOKEN`
   - `USEAPI_EMAIL`
   - `USEAPI_MODEL`
4. Deploy.

## Lưu ý vận hành

- Video được tạo async để tránh timeout khi deploy serverless.
- App poll `/api/job/[jobId]` mỗi 5 giây cho đến khi UseAPI trả trạng thái `completed` hoặc `failed`.
- Ảnh upload tối đa 20MB, định dạng PNG/JPEG/WebP.
- Video đầu ra là 9:16 portrait, mỗi cảnh 8 giây.
- Nếu bị lỗi captcha/quota, kiểm tra captcha provider, quota Google Flow hoặc đổi model.

## File quan trọng

- `app/page.tsx`: giao diện app.
- `app/api/upload/route.ts`: upload ảnh sang UseAPI.
- `app/api/video/route.ts`: tạo video async.
- `app/api/job/[jobId]/route.ts`: poll job.
- `app/api/concat/route.ts`: ghép video.
- `lib/scenes.ts`: chia lời thoại thành các cảnh.
- `lib/useapi.ts`: helper gọi UseAPI.
