# Template Content

Thư mục này lưu các mẫu template nội dung để đăng bài Facebook.

Mục tiêu:
- Tách riêng phần ý tưởng content khỏi code.
- Dễ mở rộng thêm template mới mà không phải sửa prompt dài trực tiếp trong source.
- Chuẩn bị cho cơ chế random template không lặp lại, tương tự cách random product.

Gợi ý sử dụng sau này:
- Mỗi file `.md` đại diện cho 1 nhóm bài viết.
- Có thể đọc metadata ở đầu file để xác định `id`, `group`, `tone`, `use_case`.
- Khi tích hợp vào code:
  - chọn template phù hợp theo tên sản phẩm + mô tả
  - random trong tập template hợp lệ
  - lưu lịch sử `template_id` vào bảng log để tránh lặp quá gần

Danh sách template hiện có:
- `01-ban-hang-chuan.md`
- `02-chat-lieu-noi-bat.md`
- `03-cong-nang-tien-dung.md`
- `04-phong-cach-khong-gian.md`
- `05-trai-nghiem-thuc-te.md`
- `06-tuong-tac-nhe.md`
- `07-khuyen-mai-uu-dai.md`
