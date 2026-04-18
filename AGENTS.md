# AGENTS.md

## Muc tieu

Tai lieu nay giup agent va lap trinh vien lam viec nhat quan trong repo `auto-post-facebook-page`.
Du an la mot worker Node.js doc san pham tu Supabase, tao noi dung bai dang bang Gemini, va dang len Facebook Page qua Graph API.

## Nguyen tac lam viec

- Luon trao doi ngan gon de thong nhat van de, pham vi, va cach xu ly truoc khi sua code.
- Khong commit neu chua co yeu cau ro rang tu nguoi dung.
- Uu tien sua dung goc loi, tranh va cham khong lien quan.
- Neu gap du lieu mo ho, phai doc code va tai lieu san co truoc khi hoi them.
- Truoc khi sua code, can xac dinh ro: loi nam o nghiep vu, scheduler, integration, hay cau hinh moi truong.

## Tong quan codebase

- `src/index.js`: vong lap scheduler chay lien tuc, xu ly shutdown.
- `src/run-once.js`: chay 1 chu ky de test nhanh.
- `src/worker.js`: dieu phoi chon san pham, tao content, dang bai, va ghi lich su.
- `src/supabase.js`: truy van `products` va `facebook_post_history`.
- `src/gemini.js`: tao noi dung tu Gemini, co fallback khi loi.
- `src/facebook.js`: dang bai 1 anh hoac nhieu anh qua Graph API.
- `src/content.js`: ghep noi dung cuoi cung voi link san pham va dia chi cua hang.
- `src/schedule.js`: xu ly slot dang bai va rang buoc thoi gian.
- `src/config.js`: doc va validate bien moi truong.
- `sql/20260418_add_facebook_post_tracking.sql`: migration cho `posted_face_at` va lich su dang bai.

## Lenh quan trong

- Cai dat: `npm install`
- Chay worker lien tuc: `npm start`
- Chay 1 lan de test: `npm run start:once`
- Chay watch mode: `npm run dev`
- Kiem tra syntax entrypoint: `npm run check`
- Test dang gia lap: `DRY_RUN=true POST_BATCH_SIZE=1 npm run start:once`

## Bien moi truong can chu y

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAGE_ID`
- `PAGE_ACCESS_TOKEN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `STORE_ADDRESS`
- `BASE_PRODUCT_URL`
- `GRAPH_API_VERSION`
- `POST_BATCH_SIZE`
- `PRODUCT_FETCH_MULTIPLIER`
- `SCHEDULER_INTERVAL_MS`
- `MIN_POST_DELAY_MS`
- `MAX_POST_DELAY_MS`
- `MAX_POSTS_PER_HOUR`
- `MAX_IMAGES_PER_POST`
- `DRY_RUN`

## Quy trinh xu ly task va bug

1. Xac dinh trieu chung cu the:
   - Khong chay scheduler
   - Khong chon duoc san pham
   - Gemini loi hoac tao content kem
   - Facebook dang that bai
   - Ghi lich su Supabase sai
   - Sai logic slot thoi gian
2. Doc nhanh cac file lien quan den van de thay vi sua ngay.
3. Kiem tra anh huong nghiep vu:
   - Co dang sai san pham khong
   - Co dang vuot slot hoac vuot tan suat khong
   - Co ghi lich su sai trang thai khong
4. Thong nhat cach sua voi nguoi dung neu thay doi logic nghiep vu.
5. Moi bat dau sua code.
6. Sau khi sua, chay cach verify nho nhat phu hop:
   - `npm run check`
   - `npm run start:once`
   - `DRY_RUN=true ... npm run start:once`

## Checklist debug theo nhom loi

### 1. Worker khong dang bai

- Kiem tra `DRY_RUN`, `POST_BATCH_SIZE`, `SCHEDULER_INTERVAL_MS`.
- Kiem tra logic slot trong `src/schedule.js`.
- Kiem tra bai dang thanh cong gan nhat co vi pham khoang cach 6 tieng khong.
- Kiem tra da co bai dang thanh cong trong slot hien tai chua.

### 2. Khong lay duoc san pham

- Kiem tra ket noi Supabase va quyen cua service role key.
- Xac minh bang `products` co du lieu, co `posted_face_at`, `default_image` hoac `media`.
- Kiem tra logic random trong nhom 10 san pham cu nhat/chua dang.
- Xem san pham bi bo qua vi thieu anh hay url.

### 3. Gemini loi hoac content khong dat

- Kiem tra `GEMINI_API_KEY` va `GEMINI_MODEL`.
- Xac dinh he thong da roi vao fallback content hay chua.
- Neu content sai nghiep vu, uu tien sua prompt/fallback o `src/gemini.js` va `src/content.js`.

### 4. Facebook API loi

- Kiem tra `PAGE_ID`, `PAGE_ACCESS_TOKEN`, `GRAPH_API_VERSION`.
- Xac minh page permission, app mode, va token con han.
- Kiem tra dang 1 anh hay nhieu anh de khoanh vung loi trong `src/facebook.js`.
- Neu co loi upload anh, xac minh lai URL anh va kha nang truy cap cong khai.

### 5. Luu lich su sai

- Kiem tra insert vao `facebook_post_history`.
- Kiem tra update `products.posted_face_at` chi xay ra sau khi dang thanh cong.
- Phan biet ro `posted`, `failed`, thong diep loi, va `facebook_post_id`.

## Nguyen tac sua code

- Giu code gon, de doc, va theo dung kieu module ESM hien tai.
- Khong dua vao logic an; dat ten ham/const phan anh dung nghiep vu.
- Neu them config moi, phai cap nhat `src/config.js`, `.env.example`, va README neu can.
- Neu sua hanh vi chon bai dang, phai xem anh huong toi scheduler, history, va khoang cach 6 tieng.
- Neu sua tich hop ben ngoai, phai giu fallback an toan de worker khong dung hoan toan khi mot dich vu loi.

## Khi nao can hoi nguoi dung truoc

- Muon thay doi logic nghiep vu chon san pham hoac lich dang.
- Muon doi format bai dang hoac prompt tao noi dung.
- Muon them bien moi truong moi.
- Muon sua schema SQL hoac du lieu Supabase.
- Muon commit, deploy, hoac chay lenh co tac dong ngoai moi truong local.

## Quy tac commit

- Chi commit khi nguoi dung yeu cau ro rang.
- Khong gom thay doi khong lien quan vao cung mot commit.
- Truoc khi commit, tom tat ro thay doi da lam va cach da verify.

## Ghi chu van hanh

- `url` trong `products` co the la slug hoac full URL.
- Worker uu tien bai chua dang; het vong moi quay lai bai cu nhat.
- San pham khong co anh phai bo qua.
- Uu tien 3-4 anh, neu chi co 1 anh thi dang photo post.
- He thong van co the dang bai bang fallback content neu Gemini khong kha dung.
