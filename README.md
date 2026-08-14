# SoundPulse - Local Music Player 🎵

**SoundPulse** là ứng dụng nghe nhạc cá nhân đa nền tảng hiện đại, mượt mà và giàu tính năng được xây dựng bằng Electron, Web Audio API, HTML5 Canvas và CSDL IndexedDB.

![SoundPulse Music Player](https://img.shields.io/badge/Electron-28.3-00f0ff?style=for-the-badge&logo=electron)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-yellow?style=for-the-badge&logo=javascript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Tính Năng Nổi Bật

- 🎧 **Phát Nhạc Local Siêu Tốc**: Hỗ trợ đầy đủ các định dạng nhạc phổ biến (`.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`, `.aac`).
- 📁 **Tự Động Tạo Playlist Từ Thư Mục**: Nhấp "Chọn Thư Mục" từ máy tính, ứng dụng sẽ tự động gom nhóm bài hát và tạo ngay một Playlist với tên của thư mục đó!
- 🔂 **Chế Độ Lặp Bài Hát Linh Hoạt**:
  - `➡️` Phát theo danh sách
  - `🔁` Lặp lại tất cả
  - `🔂` **Chỉ lặp lại bài hát này (Repeat Single Track)** - Phát đi phát lại 1 bài liên tục kèm hiệu ứng Toast notification.
- 🎚️ **Bộ Điều Chỉnh Âm Thanh 10 Dải (10-Band Equalizer)**: Tùy chỉnh chi tiết dải tần từ 60Hz đến 16kHz cùng các bộ Preset sẵn có (Bass Boost, Pop, Rock, Jazz, Vocal, Electronic...).
- 📊 **Audio Visualizer Canvas 3D**: Sóng nhạc neon phản ứng theo nhịp nhạc với 4 chế độ hiển thị (Cột sóng Neon, Vòng tròn tần số, Oscilloscope, Cosmic Particles).
- 📋 **Đổi Kiểu Hiển Thị Grid / List View**: Đổi linh hoạt giữa chế độ Ô lưới (Grid) và Chế độ danh sách hàng ngang rút gọn (List).
- 💾 **Lưu Trữ CSDL Offline (IndexedDB)**: Tất cả bài hát, Playlist và danh sách Yêu thích đều được lưu trữ vĩnh viễn trên máy tính của bạn.
- 📱 **Sẵn Sàng Đóng Gói APK Android**: Tương thích hoàn toàn với Capacitor và PWA.

---

## 🚀 Khởi Động Dự Án

### 1. Cài đặt các thư viện phụ thuộc (Dependencies)
```bash
npm install
```

### 2. Chạy ứng dụng ở chế độ phát triển (Development)
```bash
npm start
```

### 3. Đóng gói ứng dụng cho Windows (.exe Installer)
```bash
npm run build:win
```

---

## 🛠️ Công Nghệ Sử Dụng

- **Core Framework**: [Electron](https://www.electronjs.org/)
- **Audio Engine**: HTML5 Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`)
- **Database**: Browser IndexedDB & LocalStorage
- **Icons & UI**: FontAwesome 6 Free, Glassmorphism CSS Design

---

## 📄 Giấy Phép (License)

Dự án phát hành dưới giấy phép [MIT License](LICENSE).
