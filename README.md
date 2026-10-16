# Hỏa Tâm · Box Office

Game quản lý quầy vé concert trên trình duyệt điện thoại. Đây là bản mô phỏng cá nhân, không kết nối cổng bán vé hoặc thanh toán thật.

## Chạy game

Yêu cầu Node.js 18 trở lên. Không cần cài thêm package.

```powershell
cd C:\Users\Admin\Documents\Codex\2026-09-30\t\outputs\hoa-tam-box-office
npm start
```

Bạn cũng có thể chạy `npm start` ngay trong thư mục `backend`. Cửa sổ PowerShell sẽ in địa chỉ `http://localhost:4173/` và các địa chỉ `http://<IPv4>:4173/` để mở trên điện thoại cùng Wi-Fi. **Dùng `http://`, không dùng `https://`** vì server nội bộ này không cấu hình HTTPS. Giữ cửa sổ PowerShell mở khi chơi. Nếu Windows Firewall hỏi, cho phép Node.js trên mạng riêng. Địa chỉ IPv4 có thể đổi khi chuyển Wi-Fi, hãy dùng địa chỉ mới được in sau mỗi lần chạy.

### Chạy nền khi đăng nhập Windows

Nếu muốn backend tự chạy khi đăng nhập và tự mở lại sau khi bị lỗi, chạy **một lần** trong PowerShell từ thư mục game:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\install_autostart.ps1
```

Lệnh tạo shortcut `Hoa Tam Box Office.lnk` trong thư mục Startup của tài khoản Windows hiện tại và mở tiến trình theo dõi ở chế độ ẩn. Nó không mở bản sao nếu cổng 4173 đang được dùng. Nhật ký nằm trong `runtime/`. Muốn bỏ tự chạy, xóa shortcut đó khỏi thư mục Startup. Backend chỉ hoạt động khi laptop đang bật, đã đăng nhập, không ở chế độ ngủ và có mạng. Địa chỉ `192.168.x.x` do Wi-Fi cấp sẽ thay đổi khi chuyển mạng; giải pháp này không cố định IP. Để một người bạn ở mạng khác truy cập bằng cùng địa chỉ, cần thêm Tailscale hoặc một đường hầm có tên cố định.

Game tự lưu tiến độ khách vào `backend/data/save.json`. Mở **Cài đặt** (hình bánh răng) để bật/tắt âm thanh, lưu ngay, lưu và thoát, chơi lại, đăng nhập hoặc đăng xuất. Có thể tạo tài khoản trên máy chủ này để có tiến trình riêng; khi đăng ký, game sao chép tiến trình khách hiện tại. Tài khoản và tiến trình nằm trên chính máy chạy server, không đồng bộ giữa các máy. Vì kết nối Wi-Fi nội bộ dùng HTTP, hãy đặt mật khẩu riêng cho game, không dùng lại mật khẩu quan trọng. **Chơi lại từ đầu** xóa toàn bộ tiến trình game của phiên đang dùng: ca bán, tiền, kho, nhân viên, bộ sưu tập anh tài, lượt mở thẻ và huy hiệu. Tài khoản đăng nhập vẫn còn.

**Lưu và thoát game** tạm dừng ca, lưu tiến trình và hiện màn rời game. Trình duyệt không thể tự đóng tab trên iPhone; bạn đóng tab sau khi thấy màn này. Lần sau mở lại, chọn **Tiếp tục chơi**.

Nút **Tạm dừng** giữ nguyên đồng hồ, độ kiên nhẫn của khách, sự cố và tiền phạt. Màn nghỉ có **Tiếp tục chơi** và **Kết thúc ngày bán**. Kết thúc ngày sẽ đóng quầy ngay, giải tán hàng chờ và chuyển sang kết quả; vé và merchandise đã bán vẫn bị trừ, không được tự bổ sung khi sang ngày mới. Ghé Kho để nhập lại hàng. Khi chuyển ứng dụng, đóng trang hoặc khởi động lại server, ca bán vẫn tiếp tục tính theo thời gian thực; hãy nhấn **Tạm dừng** nếu cần nghỉ.

## Vòng chơi

1. Mỗi đợt có 5 ngày mở bán. Mỗi ngày dài **5 phút thực**; **1 giây thực = 5 giây game**. Một phiên bán tương ứng 25 phút trên đồng hồ game, từ 18:00 đến 18:25. Đồng hồ quầy hiển thị cả giờ game và thời gian thực còn lại. Xác minh và xử lý thanh toán không rút ngắn ngày; khi hết vé có thể vào Kho để nhập thêm.
2. Chọn khách chibi trong hàng chờ, kiểm tra khu vé và số lượng họ đặt. Lúc đầu, khách là người nhà và bạn bè hư cấu với 12 kiểu chibi dễ thương. Anh tài chỉ xuất hiện trong hàng sau khi đã được mở khóa ở bộ sưu tập.
3. Dùng **Xác minh** để phát hiện bot chen vào phiên, mã trùng hoặc giao dịch chưa thanh toán.
4. Xử lý thanh toán lỗi, chặn yêu cầu không hợp lệ, rồi chạm trực tiếp vào **ô vé** đúng khu. Vé bay từ ô ra giữa màn hình, dừng để đọc tên khu, giá và số lượng, rồi bay tới khách. Nút bấm và lúc giao vé có hiệu ứng âm thanh khi âm thanh đang bật.
5. Thuê nhân viên kiểm vé, marketing và bảo vệ trong mục **Nhân viên**. Điều phối bảo vệ khi có sự cố hư cấu trong concert.
6. Sau ca, nộp quỹ thuế vé mô phỏng 5%. Giữ uy tín, duy trì combo và mua nâng cấp giữa các ca.
7. Hoàn thành nhiệm vụ phục vụ khách mỗi ca để nhận thưởng. Đơn vé vàng phục vụ nhanh có tip.
8. Xem **Góp ý** để đọc nhận xét mô phỏng từ các anh tài và trả lời với vai trò admin của quầy.
9. Ghé **Kho** để nhập thêm 5 hoặc 10 vé mỗi khu, chi phí bằng 15% giá vé. Nhập lightstick, áo concert và banner theo kiện 5 món; trưng bày hàng còn tồn để tăng sức hút. Khách có thể đặt thêm vật phẩm: xác minh, bán vật phẩm rồi giao vé. Có thể nhập kho trong lúc tạm dừng.
10. **Uy tín dưới 50:** bị trừ 100.000đ mỗi 10 giây thực đang bán, tối đa bằng ngân sách còn lại. Tạm dừng sẽ dừng tiền phạt; khi uy tín trở lại từ 50, bộ đếm phạt được xóa. **Uy tín bằng 0:** quầy đóng cửa, chỉ có thể chơi lại từ ngày 1. Luật được hiển thị ở màn mở đầu, hướng dẫn và cảnh báo trong quầy.
11. Nếu khu khách yêu cầu không còn đủ số vé họ muốn, khách tự rời hàng chờ. Việc hết vé không trừ uy tín. Khi toàn bộ kho vé hết, không có khách mới; nhập vé để tiếp tục đón khách.
12. Mục **Anh tài** khởi đầu với 34 thẻ bí ẩn, không hiện chân dung hay chibi của người chưa sở hữu. Kết thúc mỗi ca, bạn nhận một lượt chọn thẻ và tự chạm vào bất kỳ ô còn dấu hỏi để hé lộ **một anh tài ngẫu nhiên chưa có**. Lượt chưa dùng được giữ qua các ca. Thẻ đã mở cho xem avatar và chibi toàn thân; anh tài đó có thể đến mua vé. Hết 5 ngày, chọn **Chơi đợt tiếp theo** để tiếp tục sưu tầm mà vẫn giữ ngân sách, kho và nhân viên. Khi sở hữu đủ 34 người, huy hiệu **Gai Con** dùng hình logo game được mở. Lệnh **Chơi lại từ đầu** cũng xóa bộ sưu tập và huy hiệu.

Quầy vé có nhân vật chibi toàn thân chuyển động. Sau khi giao dịch thành công, tấm vé hiện đầy đủ tên khu, giá và số lượng, dừng ở giữa màn hình để đọc rồi bay đến khách trong khoảng 3,8 giây. Hộp thư góp ý là một phần của trò chơi cá nhân: nhận xét được tạo theo kết quả phục vụ và câu trả lời được lưu trong tiến độ, không gửi tin nhắn cho nghệ sĩ hay khách thật.

Quầy bán được bố trí theo chiều cao màn hình (`100dvh`) và chừa vùng an toàn cho thanh trạng thái iPhone: hàng chờ ngang, yêu cầu khách và nút xử lý cố định phía trên, 16 vé trong lưới 4×4 phía dưới. Trên màn hình thấp hoặc khi nhiều cảnh báo cùng xuất hiện, chỉ bảng vé cuộn để giữ chữ đủ lớn; đơn khách luôn nằm trong màn hình. Có bố cục riêng khi xoay ngang điện thoại. Các trang Sơ đồ, Kho và Anh tài vẫn cuộn bình thường. Bảng giá trong Sơ đồ dùng hình tấm vé có cuống, đường xé, tên khu, giá và số vé còn lại; tên và giá được căn giữa.

MC Trần Ngọc có chibi avatar và toàn thân trong `frontend/assets/hosts/`, vest đen, cà vạt kẻ và micro. Thẻ host nằm riêng trong mục Anh tài, không tính vào danh sách 34 người. Tạo lại bằng `python tools/generate_host_chibi.py`.

Mục **Sơ đồ** dùng ảnh concert bạn vừa gửi. Chạm khu màu để xem giá và số vé còn lại. Không có nút phóng to/thu nhỏ. Hai bên cùng tên được gộp thành một loại vé trong game. Giá 16 khu được nhập từ sơ đồ; số lượng vé, tiền, thuế, xác suất sự cố và thời gian đều là thiết kế mô phỏng. Bot và mã trùng là sự cố hư cấu của phiên đặt vé, không mô tả hành vi của nghệ sĩ. Dàn 34 anh tài lấy tên từ [danh sách do VTV công bố](https://vtv.vn/anh-trai-vuot-ngan-chong-gai-2026-luat-choi-doi-dau-duoc-day-len-cao-trao-100260622214738312.htm).

Game có bản nhạc nền không lời được tạo riêng từ các âm tổng hợp trong `tools/generate_background_music.py`, phát lặp suốt khi chơi. Bốn hiệu ứng WAV cho nhấn nút, giao vé, thành công và báo lỗi được tổng hợp trong `tools/generate_sfx.py`, không dùng bản ghi hay sample của bên thứ ba. Mở **Cài đặt → Âm thanh** để bật/tắt nhạc nền và hiệu ứng. Trình duyệt điện thoại có thể chỉ cho nhạc bắt đầu sau lần chạm đầu tiên. Nút **▶** mở MV **Hỏa Tâm** trên YouTube từ giây 10 và tạm dừng nhạc nền; đóng MV để nhạc nền phát tiếp. MV cần Internet; nếu trình duyệt chặn tự phát, chạm Play trên video. Không thể bảo đảm hệ thống nhận diện bản quyền bên ngoài sẽ không báo nhầm.

## Cấu trúc

```text
frontend/          Giao diện, hiệu ứng, ảnh và màn chơi
  index.html
  styles.css
  app.js
  assets/          Chân dung, ảnh khách mời, bảng ánh xạ ảnh và nhạc nền
backend/           Luật chơi, API và dữ liệu lưu
  server.js
  game.js
  accounts.js
  data/save.json   Tự tạo khi chạy
uiux/              Luồng chơi, cấu trúc màn hình, màu sắc
```

API nội bộ: `GET /api/state` lấy trạng thái; `GET /api/session` xem phiên tài khoản; `POST /api/auth` đăng ký, đăng nhập hoặc đăng xuất; `POST /api/action` gửi `{ "type": "start" }`, `scan`, `retryPayment`, `sellZone`, `reject`, `selectCustomer`, `unlockArtist`, `saveNow`, `exitGame`, `replyFeedback`, `hireStaff`, `dispatchSecurity`, `remitTax`, `upgrade`, `pause`, `resume`, `endDay`, `nextCampaign`, `restockTickets`, `restockMerch`, `displayMerch`, `sellMerch` hoặc `reset`. `exit` được giữ làm tên tương thích cho `endDay`. Mọi điểm số và vé tồn được tính phía backend. `npm run check` kiểm tra cú pháp; `npm test` kiểm tra luật chơi, bộ sưu tập 34 người và huy hiệu, lưu tiến độ, tài khoản, nhập kho, phản hồi HTTP cho nhạc và các nhánh phát âm thanh iOS bằng mô phỏng. Các bài kiểm tra dùng tệp lưu riêng và không thay đổi tiến độ người chơi.

Trên iPhone/Safari, chạm màn hình một lần để cho phép phát nhạc nền, rồi kiểm tra **Cài đặt → Âm thanh: Bật**. Game dùng chế độ phiên âm thanh `playback` khi Safari hỗ trợ; phiên bản iOS cũ dùng trình phát âm thanh của trình duyệt. Máy chủ hỗ trợ tải từng phần tệp WAV (HTTP byte range). Trạng thái cạnh nút tạm dừng hiển thị đang tải, đang phát hoặc cần thử lại. Kiểm tra âm thanh nghe được cần thực hiện trực tiếp trên điện thoại.

## Ảnh và bước mở rộng

Đã tích hợp đủ **34 ảnh chân dung** bạn vừa gửi vào `frontend/assets/artists/` và ánh xạ trong `portraits.json`. **34 avatar chibi SVG** trong `frontend/assets/chibi/` và **34 nhân vật toàn thân** trong `frontend/assets/chibi-full/` được vẽ theo tóc, trang phục và phụ kiện nổi bật của từng ảnh. Màn **Anh tài** mặc định hiển thị chibi sau khi mở thẻ và có nút chuyển sang ảnh gốc. Có thể chỉnh màu và đặc điểm trong `tools/generate_chibi.py`, rồi chạy `python tools/generate_chibi.py` để tạo lại hai bộ SVG. Ảnh MC Trần Ngọc là thẻ khách mời riêng, không tính trong 34 anh tài. File `Ho_Dong_Quang.jpg` được ghép với tên hiển thị **Hồ Đông Quan** theo danh sách bạn gửi; tên hiển thị **It’s Charles.** dùng ảnh `Charles.jpg`.

Ảnh gốc được căn riêng theo từng khuôn mặt trong `frontend/assets/portrait-frames.json`, cắt hiển thị trong vòng tròn và tăng độ sáng khi thẻ được mở. Thẻ chưa sở hữu chỉ hiện dấu hỏi. Khách thường có 12 kiểu chibi SVG riêng, vẽ lại theo ảnh tham chiếu trong `frontend/assets/guests/`; các hình có thể lặp lại trong hàng chờ. Mục **Anh tài** luôn giữ đúng 34 người. Chạy `tools/generate_guests.py` hoặc `tools/generate_portrait_frames.py` để tạo lại dữ liệu tương ứng. Tiến độ sáng thẻ của bản cũ là xem trước, nên lần nâng cấp này bắt đầu bộ sưu tập mới từ 0; doanh thu, kho và ca bán đã lưu vẫn được giữ.

Ảnh sơ đồ mới đã được tích hợp tại `frontend/assets/concert-map-reference.png`. Game dùng giao diện đỏ cam theo cảm hứng từ ảnh và 34 chibi vẽ bằng SVG; các hình này là phiên bản minh họa của trò chơi.

Ảnh logo bạn gửi được lưu tại `frontend/assets/logo-concert.png` và xuất hiện ở thanh đầu trang, màn mở đầu cùng biểu tượng tab trình duyệt.

Đây là bản chơi cá nhân chạy trên mạng nội bộ. Nếu muốn đưa lên Internet hoặc biến thành app Android/iPhone cài từ store, cần thêm bước đóng gói/triển khai và kiểm tra quyền sử dụng hình ảnh, thương hiệu, âm nhạc.
