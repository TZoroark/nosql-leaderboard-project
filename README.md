# ĐỀ TÀI 05: HỆ THỐNG BẢNG XẾP HẠNG THỜI GIAN THỰC (REAL-TIME LEADERBOARD)
> **Môn học**: Cơ sở dữ liệu NoSQL  
> **Công nghệ lõi**: Redis (Sorted Sets + Hashes + Pub/Sub), Node.js, Express, Socket.IO

---

## 📌 1. Giới thiệu Đề tài & Bản chất NoSQL
Trong các hệ quản trị CSDL quan hệ (RDBMS như MySQL, SQL Server), bài toán bảng xếp hạng thường dùng:
```sql
SELECT user_id, score, RANK() OVER (ORDER BY score DESC) 
FROM players 
ORDER BY score DESC 
LIMIT 10;
```
Khi có **hàng chục ngàn người chơi cùng nộp điểm liên tục**, câu truy vấn trên sẽ gây nghẽn I/O đĩa cứng, lock bảng và khiến server bị tê liệt.

### 👉 Giải pháp NoSQL với Redis:
Hệ thống sử dụng **Redis** - một CSDL NoSQL dạng In-Memory Key-Value:
* **Cấu trúc Sorted Set (`ZSET`)**: Sử dụng thuật toán kết hợp giữa **Hash Table** và **Skip List (Danh sách nhảy)**.
* **Tốc độ $O(\log N)$**: Thêm điểm, cập nhật điểm, lấy thứ hạng của bất kỳ ai trong hàng triệu người chơi chỉ mất vài phần nghìn giây.
* **Thời gian thực**: Kết hợp với **WebSocket (Socket.IO)** để đẩy cập nhật xuống trình duyệt người dùng ngay tức khắc mà không cần F5.

---

## 🛠️ 2. Thiết kế CSDL Redis

| Cấu trúc Redis | Tên Key | Mục đích sử dụng | Lệnh thao tác chính |
| :--- | :--- | :--- | :--- |
| **Sorted Set (`ZSET`)** | `leaderboard:global` | Lưu bảng xếp hạng toàn thời gian (Member: `userId`, Score: `points`) | `ZADD`, `ZINCRBY`, `ZREVRANGE`, `ZREVRANK`, `ZSCORE` |
| **Sorted Set (`ZSET`)** | `leaderboard:daily:YYYY-MM-DD` | Bảng xếp hạng theo ngày, có thiết lập TTL tự hủy bằng `EXPIRE` | `ZINCRBY`, `EXPIRE` |
| **Hash (`HSET`)** | `user:{userId}` | Lưu hồ sơ người chơi (Tên, Avatar, Quốc tịch, Cấp độ) | `HSET`, `HGETALL` |
| **Hash (`HSET`)** | `user:account:{username}` | Lưu thông tin tài khoản đăng nhập (Username, Password, UserID) | `HSET`, `HGETALL`, `EXISTS` |
| **String (`SET EX`)** | `session:{token}` | **Redis Session Store**: Lưu phiên đăng nhập người dùng (TTL 24h = 86400s) | `SET ... EX 86400`, `GET`, `DEL` |

---

## 🚀 3. Hướng dẫn Chạy Ứng Dụng

### Bước 1: Khởi động Redis Server
Hệ thống đã được cài đặt Redis 8.x trên máy. Để bật Redis (nếu chưa chạy):
```powershell
redis-server --daemonize yes
```
Kiểm tra Redis hoạt động:
```powershell
redis-cli ping
# Kết quả trả về: PONG
```

### Bước 2: Chạy Web Application
Tại thư mục dự án (`c:\Users\quoca\OneDrive\Desktop\nosql`):
```powershell
npm start
```
Mở trình duyệt truy cập: **[http://localhost:3000](http://localhost:3000)**

---

## 🎮 4. Các Tính Năng Đã Tích Hợp Trên Web
1. **Live Leaderboard**: Bảng xếp hạng Top 10 cập nhật thời gian thực không cần tải lại trang.
2. **Podium Top 3**: Bục vinh quang dành cho Top 1 (Vàng), Top 2 (Bạc), Top 3 (Đồng) với hiệu ứng animation nổi bật.
3. **Phân loại chu kỳ**: Chuyển đổi giữa **All-Time (Toàn thời gian)** và **Daily (Hôm nay)**.
4. **Nộp điểm nhanh (ZINCRBY)**: Form cộng điểm lập tức cho người chơi, hàng trên bảng sẽ chớp sáng xanh (flash highlight) khi nhảy thứ hạng.
5. **Bot Giả Lập Tải (Auto Bot)**: Nút bật Bot tự động sinh điểm ngẫu nhiên mỗi 1.5 giây để biểu diễn bảng xếp hạng đảo lộn liên tục trước mặt giảng viên.
6. **Tra cứu lân cận (Neighbors / Around Me)**: Nhập ID người chơi để xem thứ hạng chính xác và 2 đối thủ đứng trên + 2 đối thủ đứng dưới.
7. **Redis Command Monitor**: Cửa sổ Terminal hiển thị trực tiếp các lệnh Redis NoSQL (`ZREVRANGE`, `ZINCRBY`, `HSET`,...) đang chạy ngầm trong server.
8. **Redis System Stats**: Đo đạc dung lượng RAM Redis tiêu thụ và tổng số key/player.

---

## 💡 5. Hướng Dẫn Kịch Bản Thuyết Trình Trước Giảng Viên

1. **Mở 2 cửa sổ trình duyệt song song**:
   * Cửa sổ 1 để ở chế độ hiển thị Bảng xếp hạng.
   * Cửa sổ 2 dùng để bấm nút nộp điểm hoặc bật chế độ Bot.
   * **Hiệu ứng**: Khi cửa sổ 2 bấm cộng điểm cho bạn (ID: 110), cửa sổ 1 lập tức nhảy hạng lên Top 1 mà không cần F5!
2. **Chỉ vào Redis Terminal trên web**:
   * Giải thích cho thầy cô thấy mỗi thao tác đều tương ứng với 1 lệnh NoSQL chuẩn mực của Redis (`ZINCRBY`, `ZREVRANK`, `HGETALL`).
3. **Giải thích câu hỏi về RAM / Mất điện**:
   * Trả lời về tính bền vững (Persistence) của Redis: Cơ chế **RDB (Snapshotting)** và **AOF (Append-Only File)** giúp dữ liệu không bị mất khi restart server.
