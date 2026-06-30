import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UseAPI Flow Video App',
  description: 'Tạo video AI nhiều cảnh từ ảnh nhân vật bằng UseAPI Google Flow',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
