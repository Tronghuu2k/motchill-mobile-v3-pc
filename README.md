# Rosi Cinema (v1.5.2)

Ứng dụng xem phim Android APK build tự động qua GitHub Actions (Capacitor 8 + `@capacitor/screen-orientation` + `CapacitorHttp`).

## Nâng cấp v1.5.2 (Sửa triệt để "Lỗi kết nối" trên APK & tải phim siêu nhanh)
- **Bật `CapacitorHttp` native Android (`OkHttp`)**: Gọi API qua tầng mạng gốc của Android, không bị WebView chặn CORS/TLS hay treo kết nối.
- **Tự động chuyển sang máy chủ dự phòng (`ophim1.com`)** khi `phimapi.com` bị nghẽn hoặc chặn trên nhà mạng di động, kèm tự động thử lại và nút **Thử kết nối lại**.
- **Giữ nguyên toàn bộ tính năng trước đó**: Tải ảnh song song 2 CDN, preload danh mục, cuộn dọc mượt, xoay ngang chuẩn phần cứng APK, 4K Ultra.
