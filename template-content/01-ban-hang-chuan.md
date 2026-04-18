# 01. Bán Hàng Chuẩn

## Metadata
- id: `template_ban_hang_chuan`
- group: `sales`
- tone: `tu nhien, than thien, dang tin`
- use_case: `template mac dinh cho da so san pham`

## Mục tiêu
Tạo bài đăng bán hàng mềm, dễ đọc, rõ bố cục, phù hợp đăng hình sản phẩm trên fanpage.

## Cấu trúc
1. Dòng hook mở đầu có symbol
2. 1 đoạn ngắn mô tả vai trò sản phẩm trong không gian
3. 1 block "Điểm nổi bật"
4. 1 block "Công năng tiện dụng"
5. 1 câu chốt mềm

## Prompt gợi ý
```text
Hay viet bai dang Facebook bang tieng Viet cho san pham sau theo phong cach ban hang mem.

Yeu cau:
- Do dai khoang 300-800 ky tu
- Giong dieu tu nhien, giong nguoi ban that
- Co xuong dong ro rang
- Co the dung symbol nhu: ✨ 🌿 🪵 💎 ✔
- Khong de cap gia
- Khong chen link, dia chi, hotline

Cau truc:
- Hook mo dau
- 1 doan mo ta ngan
- Block "Diem noi bat" voi 2-4 y
- Block "Cong nang tien dung" voi 2-4 y
- Cau chot mem moi inbox

Thong tin san pham:
- Ten: {name}
- Tom tat: {short_description}
- Mo ta chi tiet: {description}
```

## Fallback style
- Tiêu đề viết hoa tên sản phẩm
- 2 block rõ ràng
- Duy trì cách diễn đạt dễ đọc, gọn, có điểm nhấn

## Example Output
```text
✨ KỆ TIVI GỖ HƯƠNG ĐÁ – GỌN GÀNG, SANG VÀ RẤT DỄ PHỐI PHÒNG KHÁCH ✨

Một mẫu kệ tivi đẹp không chỉ để đặt tivi mà còn giúp không gian nhìn gọn và có điểm nhấn hơn. Mẫu kệ này phù hợp với nhiều kiểu phòng khách, từ nhà phố đến không gian nội thất gỗ truyền thống.

🌿 Điểm nổi bật
✔ Thiết kế cân đối, nhìn chắc chắn và dễ bài trí
✔ Chất liệu gỗ tạo cảm giác sang, dùng lâu vẫn đẹp
✔ Tổng thể gọn gàng nhưng vẫn đủ điểm nhấn cho khu vực trung tâm

🪵 Công năng tiện dụng
✔ Mặt kệ rộng, sắp xếp tivi và đồ trang trí thoải mái
✔ Có ngăn/khoang để đồ giúp khu vực sử dụng nhìn ngăn nắp hơn
✔ Phù hợp cho nhu cầu sử dụng hằng ngày và giữ không gian luôn gọn mắt

💎 Anh chị đang tìm một mẫu kệ vừa đẹp vừa thực dụng thì đây là lựa chọn rất đáng tham khảo.

👉 Xem chi tiết sản phẩm: Kệ tivi gỗ Hương đá
🔗 https://noithatbachthao.com/product/ke-tivi-go-huong-da

📍 Xem trực tiếp tại:
Châu Phong, Liên Hà, Đông Anh, Hà Nội, Vietnam
🗺️ Chỉ đường: https://maps.app.goo.gl/QmPFoh8CRequshQD8

📞 Hotline/Zalo: +84 34 737 3891
💬 Zalo: https://zalo.me/84347373891
📩 Inbox để được tư vấn nhanh!
```
