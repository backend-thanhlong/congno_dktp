# ⚠️ Cấu hình Supabase - Bắt buộc

Để sử dụng tính năng upload PDF cho hóa đơn, bạn cần cung cấp thông tin Supabase.

## Bước 1: Tạo file .env.local

Sao chép nội dung bên dưới vào file `.env.local` trong thư mục gốc dự án:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Bước 2: Lấy thông tin từ Supabase

1. Đăng nhập vào [supabase.com](https://supabase.com)
2. Chọn project của bạn (hoặc tạo mới)
3. Vào **Settings** → **API**
4. Sao chép:
   - **Project URL** → Thay vào `your_supabase_project_url`
   - **anon/public key** → Thay vào `your_supabase_anon_key`
   - **service_role key** (bấm "Copy" ở secret) → Thay vào `your_supabase_service_role_key`

## Bước 3: Tạo Storage Bucket

1. Trong Supabase Dashboard, vào **Storage**
2. Tạo bucket mới tên: `invoice-pdfs`
3. Chọn **Public bucket** (hoặc Private nếu muốn bảo mật cao hơn)
4. Bấm **Create bucket**

## Bước 4: Khởi động lại server

```bash
npm run dev
```

## ✅ Hoàn tất!

Sau khi cấu hình xong, bạn có thể:
- Upload file PDF khi tạo/sửa hóa đơn
- Xem và tải file PDF đã upload
- File được lưu trữ an toàn trên Supabase Storage
