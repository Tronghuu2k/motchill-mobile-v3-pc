# Rosi Cinema (v1.5.0)

Ứng dụng xem phim Android APK build tự động qua GitHub Actions (Capacitor 8 + `@capacitor/screen-orientation`).

## Tính năng & Bản sửa lỗi v1.5.0
- **Cuộn dọc mượt trên Android WebView**: Cuộn trực tiếp trên tài liệu gốc (`html, body`), cấu hình `MainActivity.java` mở đầy đủ `VerticalScrollBar` và `DomStorage`.
- **Xoay ngang chuẩn phần cứng APK**: Tích hợp `@capacitor/screen-orientation` + `AndroidManifest.xml` (`configChanges` đầy đủ để không reload trang khi xoay ngang) + chế độ dự phòng xoay 90° tự động khi phát video.
- **Đầy đủ tính năng**: Lời chào + ảnh động vui nhộn khi mở app, tự đổi nguồn sau ~2.8s nếu luồng chậm, ưu tiên HLS, lưu tiến độ xem, chọn chất lượng 4K Ultra / 1080p / 720p / 480p.

## Cách build APK trên GitHub
1. Giải nén `rosi-cinema-v1.5.0-release.zip` và tải toàn bộ thư mục lên repository GitHub (nhánh `main`).
2. Vào tab **Actions** → chạy workflow **Build Rosi Cinema Android APK**.
3. Tải artifact **`Rosi-Cinema-v1.5.0-debug-apk`** và cài lên điện thoại Android.
