# Ảnh trong game

Đã tích hợp 34 ảnh chân dung bạn gửi trong `artists/`, với ánh xạ tương ứng ở `portraits.json`. Bộ 34 nhân vật chibi trong `chibi/` được vẽ thành SVG và dùng cho các anh tài ghé quầy; chỉnh mẫu tại `tools/generate_chibi.py`. Ảnh `MC_Tran_Ngoc.jpg` là thẻ khách mời riêng. `concert-map-reference.png` là sơ đồ concert tương tác và `logo-concert.png` là logo bạn gửi, dùng ở thanh đầu trang và màn mở đầu.

Giao diện còn hỗ trợ các ảnh bổ sung sau nếu bạn đặt tại đây:

- `cover.jpg`: poster dùng ở màn mở bán / kết ca.
- `cast.jpg`: ảnh nhóm 34 anh tài ở màn thẻ nhân vật.

Để thay chân dung, đặt file mới trong `artists/` rồi sửa đường dẫn tương ứng trong `portraits.json`, ví dụ:

```json
{ "01": "assets/artists/Dai_Nghia.jpg", "02": "assets/artists/Dung_DT.jpg" }
```

Ảnh gốc trong hội thoại chỉ nên dùng khi bạn có quyền sử dụng cho dự án. Game không tự tải ảnh từ bên thứ ba.
