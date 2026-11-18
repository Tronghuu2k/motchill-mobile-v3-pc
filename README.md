# Rosi Cinema (v1.5.1)

Ứng dụng xem phim Android APK build tự động qua GitHub Actions (Capacitor 8 + `@capacitor/screen-orientation`).

## Nâng cấp v1.5.1 (Hiển thị danh sách phim & ảnh poster siêu nhanh)
- **Tải song song 2 CDN ảnh + tự ngắt link chậm sau 1.5s**: Không còn cảnh thẻ phim bị đen trống chờ CDN đầu tiên phản hồi.
- **Tải trước (Preload) danh mục & Cache thông minh**: Mở app lên tự nạp trước danh sách *Tất cả, Phim bộ, Phim lẻ, Hoạt hình* và lưu nhớ máy chủ CDN nhanh nhất trên mạng hiện tại.
- **Giữ nguyên toàn bộ tính năng v1.5.0**: Cuộn dọc mượt, xoay ngang chuẩn phần cứng APK, lời chào đầu trang, tự đổi nguồn phim sau ~2.8s, 4K Ultra.
