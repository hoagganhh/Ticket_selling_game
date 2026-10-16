# UI/UX · Hỏa Tâm Box Office

## Trục trải nghiệm

Người chơi là nhân viên điều hành một đợt mở bán concert. Cảm giác chính là áp lực hàng chờ tăng dần, lựa chọn nhanh nhưng có kiểm tra, rồi được thưởng khi xử lý một chuỗi giao dịch đúng. Một ca ngắn 90 giây phù hợp chơi trên điện thoại.

## Các màn

| Màn | Mục tiêu | Tương tác |
| --- | --- | --- |
| Mở bán / giữa ca | Hiểu bối cảnh, xem kết quả, mua nâng cấp | Bắt đầu ca, mua 3 loại nâng cấp |
| Quầy vé | Xử lý đơn của từng anh tài chibi | Chọn nhân vật, xác minh, xử lý thanh toán, chọn khu, phát hành hoặc chặn yêu cầu lỗi |
| Sơ đồ | So sánh 16 khu | Xem giá, số vé tồn, chọn khu |
| Anh tài | Theo dõi 34 nhân vật và một khách mời | Mở sáng thẻ sau từng ca, xem chân dung thật và avatar chibi |
| Nhật ký | Xem hiệu suất | Xem doanh thu, vé, sự cố và bắt đầu lại |

## Trạng thái quan trọng

- **Đơn hợp lệ:** xác minh ra mã hợp lệ, chọn đúng khu và phát hành.
- **Bot chen vào phiên / mã trùng:** xác minh có cảnh báo; chặn yêu cầu tăng uy tín. Sự cố thuộc phiên đặt vé, không phải hành vi của anh tài.
- **Thanh toán lỗi:** xác minh, xử lý lại, rồi mới phát hành.
- **Sai khu / không đủ vé:** giữ khách, báo lỗi cụ thể và cho sửa lựa chọn.
- **Khách bỏ hàng:** thanh kiên nhẫn cạn, uy tín giảm.
- **Hết ca:** mở thẻ anh tài và cho mua nâng cấp trước ca sau.

## Hệ thống thị giác

- Nền than `#140a10`, panel `#21131b`, cam `#f77739`, vàng `#ffca6b`.
- Màu 16 khu lấy gần theo chú giải ảnh sơ đồ, dùng nhất quán trong bản đồ và yêu cầu khách.
- Chữ hiển thị đậm, số lớn ở HUD; nội dung hành động dùng kích thước dễ đọc trên điện thoại.
- Hiệu ứng gồm phát sáng, thanh thời gian, thanh kiên nhẫn, toast phản hồi và giấy màu khi chốt vé. Âm thanh tùy chọn, mặc định tắt. `prefers-reduced-motion` giảm chuyển động.
- Mỗi anh tài có một avatar chibi SVG nhẹ, dựa trên tóc, màu trang phục và phụ kiện trong ảnh tham chiếu. Hàng chờ và phiếu khách dùng chibi; thẻ bộ sưu tập ghép chibi với chân dung thật.

## Cấu trúc điện thoại

Thanh trên cùng > HUD 4 chỉ số > hàng chờ cuộn ngang > phiếu khách đang chọn > hành động > thanh điều hướng cố định ở đáy. Sơ đồ dùng lưới 3 cột ở màn nhỏ. Các nút hành động cao tối thiểu khoảng 41px; vùng bấm thẻ khách lớn hơn 70px.

## Nguồn nội dung

Poster, sơ đồ và ảnh nhóm do người dùng gửi là tham chiếu thiết kế; file gốc của ba ảnh này chưa đóng gói được. 34 ảnh chân dung ở lượt gửi tiếp theo đã được gắn vào nhân vật. Tên 34 anh tài đối chiếu với [VTV](https://vtv.vn/anh-trai-vuot-ngan-chong-gai-2026-luat-choi-doi-dau-duoc-day-len-cao-trao-100260622214738312.htm). MC Trần Ngọc là thẻ khách mời ngoài đội hình 34. Đơn đặt vé của ê-kíp, sự cố phiên, tỷ lệ và vé tồn là hư cấu phục vụ gameplay.
