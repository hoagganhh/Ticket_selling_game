# Nhiều tài khoản và lưu tiến trình trên Render

Bản sửa này tách tiến trình theo người chơi. Khách chưa đăng nhập có cookie riêng trên từng trình duyệt; không ai tự nhận bản lưu chung `save.json` của bản cũ. Đăng ký chuyển phần chơi thử của chính người đó vào tài khoản. Đăng nhập cùng tài khoản trên thiết bị khác sẽ lấy cùng tiến trình. Đăng xuất tạo một phiên khách mới. Reset, kho, nhân viên, phản hồi và bộ sưu tập đều chỉ thuộc người chơi hiện tại.

## 1. Chọn nơi lưu dữ liệu

**Khuyến nghị: PostgreSQL.** Backend tự sử dụng database khi có biến `DATABASE_URL` và tự tạo các bảng `hoa_tam_accounts`, `hoa_tam_players`, `hoa_tam_settings` khi khởi động. Không cần chạy SQL thủ công. Mỗi lần cập nhật tiến trình dùng transaction và khóa riêng hàng dữ liệu của người chơi, kể cả khi chạy nhiều instance.

Trong Render Dashboard, tạo Postgres cùng region với Web Service, rồi sao chép **Internal Database URL** vào biến `DATABASE_URL` của Web Service. Có thể dùng PostgreSQL khác; khi kết nối qua Internet, dùng URL có SSL theo hướng dẫn nhà cung cấp. Không gửi URL chứa mật khẩu vào chat hoặc commit vào GitHub.

Render Postgres Free hiện có thời hạn 30 ngày; hãy kiểm tra giới hạn/gói hiện hành trước khi dùng làm nơi lưu lâu dài. Không tự tạo tài nguyên trả phí nếu chưa muốn dùng gói đó.

Nguồn: [Tạo và kết nối Render Postgres](https://render.com/docs/postgresql-creating-connecting), [Giới hạn Free](https://render.com/docs/free).

**Nếu dùng Persistent Disk thay vì PostgreSQL:** đặt `GAME_DATA_DIR=/var/data/hoa-tam`, với `/var/data` là mount path thực tế của disk. Không đặt `DATABASE_URL` trong phương án này. Chế độ file chỉ dùng một Web Service instance, không chạy nhiều process ghi chung thư mục. Free Web Service không gắn được Persistent Disk.

**Nếu không cấu hình database hoặc disk:** mỗi người vẫn có tiến trình riêng, nhưng tài khoản/bản lưu có thể mất khi Render restart, spin down hoặc deploy lại. Không dùng GitHub để lưu dữ liệu người chơi. [Render Persistent Disks](https://render.com/docs/disks).

## 2. Biến môi trường và lệnh chạy

Trong Render Web Service → Environment:

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | Internal Database URL của PostgreSQL đã chọn |
| `SESSION_SECRET` | Chuỗi bí mật ngẫu nhiên mới, ít nhất 32 ký tự; giữ nguyên qua các lần deploy |

Render có thể tự sinh giá trị bí mật. Khi cần tự tạo trên máy, chạy `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, rồi dán kết quả vào Environment. Không đưa kết quả vào mã nguồn. Đổi secret sẽ đăng xuất các phiên cũ; tài khoản và bản lưu trong database vẫn còn. Nếu không đặt `SESSION_SECRET`, backend tự lưu một khóa trong PostgreSQL hoặc file dữ liệu; không sử dụng `session.key` của bản cũ.

Nếu Root Directory của Web Service là thư mục gốc repo:

- Build Command: `npm ci --omit=dev`
- Start Command: `npm start`
- Health Check Path: `/healthz`

Nếu Root Directory đang là `backend`, có thể giữ nguyên: thư mục này cũng có `package.json`, lockfile và dependency PostgreSQL. Chọn build `npm ci --omit=dev`, start `npm start`.

## 3. Giữ tiến trình trước khi đổi cách lưu

Trước khi deploy, sao lưu **thư mục dữ liệu của server đang chạy** nếu muốn giữ tài khoản/tiến trình hiện có. Bản lưu trong laptop/GitHub có thể khác bản người chơi đã chơi trên Render. Dữ liệu cũ không tự chuyển sang PostgreSQL.

Nếu bản sao lưu có `accounts.json` và `profiles/<ID>.json`, có thể nhập một lần bằng `npm run migrate:accounts`. Chạy từ thư mục gốc repo, trong môi trường có `DATABASE_URL` của database đích và `LEGACY_DATA_DIR` trỏ tới thư mục bản sao lưu. Khi nhập từ laptop, dùng External Database URL có SSL; sau đó xóa biến nhạy cảm khỏi phiên shell. Công cụ không ghi đè tài khoản đã nhập, không đọc khóa phiên cũ và không đưa dữ liệu lên Git.

Bản `save.json` dùng chung ở phiên bản trước được giữ làm bản sao lưu, không gán tự động cho người truy cập đầu tiên. Nếu trước đây chỉ chơi ở chế độ khách, cần xác định tài khoản chủ sở hữu trước khi chuyển bản lưu chung đó; mọi khách mới bắt đầu từ đầu. Điều này ngăn bạn bè nhận lại tiến trình của chủ game.

## 4. Push bản sửa và triển khai

Từ thư mục repo, sau khi cấu hình nơi lưu và sao lưu dữ liệu cần giữ:

```powershell
npm ci
npm run check
npm test
git add .
git commit -m "Isolate player accounts and add persistent cloud saves"
git push origin main
```

Nếu Render liên kết branch `main` và bật Auto Deploy **On Commit**, push sẽ tự triển khai bản mới. Nếu tắt Auto Deploy, vào **Manual Deploy → Deploy latest commit**. Link game giữ nguyên. Đợi trạng thái Live rồi tải lại trang trên từng thiết bị. [Hướng dẫn deploy](https://render.com/docs/deploys).

Repo không theo dõi `backend/data/`, `.env*` hay runtime log nữa. Các tệp dữ liệu vốn có trong laptop được giữ nguyên. Vì khóa phiên cũ từng có trong repo, dùng secret mới ở Environment cho bản online; xóa tệp ở commit mới không xóa chúng khỏi lịch sử Git.

## 5. Kiểm tra hai người chơi

1. Mở game bằng trình duyệt bình thường và một cửa sổ ẩn danh/điện thoại khác. Chưa đăng nhập, cả hai bắt đầu mới và có dữ liệu riêng.
2. A đăng ký tài khoản A; B đăng ký tài khoản B. A nhập kho hoặc mở thẻ, B không thay đổi.
3. Mở thiết bị thứ ba, đăng nhập A: nhận đúng tiến trình A. Hai thiết bị dùng chung tài khoản A sẽ cùng chơi một bản lưu A.
4. A đăng xuất hoặc reset: tài khoản B vẫn giữ tiến trình. Tải lại trang và kiểm tra tiếp.
5. Restart/redeploy Web Service khi dùng database/disk đã cấu hình, rồi đăng nhập lại: dữ liệu vẫn còn. Đừng xóa database khi redeploy Web Service.

`npm test` dùng các tệp tạm và cổng thử tự đóng, không chạy server nền ở cổng 4173. Kiểm tra kết nối tới database Render thật cần thực hiện sau khi bạn cấu hình database cho Web Service.
