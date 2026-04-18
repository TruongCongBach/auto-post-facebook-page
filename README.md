# Auto Post Facebook Page

Worker Node.js nhe de doc san pham tu Supabase, dung Gemini tao noi dung tieng Viet, va dang len Facebook Page bang Graph API.

## Tinh nang

- Uu tien random trong 10 san pham chua tung dang Facebook cu nhat.
- Khi da dang het mot vong, tu dong random trong 10 san pham da dang lau nhat.
- Bo qua san pham khong co anh.
- Uu tien dang 3-4 anh; neu chi co 1 anh thi dang dang photo post.
- Khong hien gia trong noi dung bai dang.
- Noi dung chinh duoc Gemini tao tu dong, co fallback template neu Gemini loi hoac het quota.
- Moi lan dang deu luu lich su vao `facebook_post_history`.
- Co random delay giua cac bai va gioi han so bai moi gio.
- Lich dang theo 2 slot moi ngay, random nhe trong khung gio vang va chi dang 1 bai moi slot.
- Khoa khoang cach toi thieu 6 tieng giua 2 bai dang thanh cong.

## Cau truc

- `src/index.js`: scheduler loop va graceful shutdown.
- `src/run-once.js`: chay 1 chu ky de test nhanh.
- `src/worker.js`: chon san pham, tao content, dang Facebook, ghi lich su.
- `src/supabase.js`: doc/cap nhat `products` va `facebook_post_history`.
- `src/gemini.js`: goi Gemini API va fallback content.
- `src/facebook.js`: xu ly 1 anh va nhieu anh qua Graph API.
- `src/content.js`: ghep noi dung AI voi link san pham va dia chi cua hang.
- `sql/20260418_add_facebook_post_tracking.sql`: migration them `posted_face_at` va bang lich su.

## Schema hien tai

`products` dang duoc dung voi cac cot:

- `id`
- `name`
- `description`
- `short_description`
- `default_image`
- `media`
- `url`
- `created_at`
- `updated_at`
- `posted_face_at` (moi them)

Bang moi `facebook_post_history` dung de luu:

- `product_id`
- `facebook_post_id`
- `status`
- `message`
- `images`
- `posted_at`
- `created_at`
- `error_message`

## Cai dat

```bash
npm install
cp .env.example .env
```

Cap nhat `.env`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SERVICE_ROLE=
SUPABASE_ANON_KEY=
PAGE_ID=
PAGE_ACCESS_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-lite
STORE_ADDRESS=
BASE_PRODUCT_URL=https://yourdomain.com/product
GRAPH_API_VERSION=v22.0
POST_BATCH_SIZE=3
PRODUCT_FETCH_MULTIPLIER=5
SCHEDULER_INTERVAL_MS=180000
MIN_POST_DELAY_MS=10000
MAX_POST_DELAY_MS=30000
MAX_POSTS_PER_HOUR=10
MAX_IMAGES_PER_POST=4
DRY_RUN=false
```

## Chay worker

Chay lien tuc:

```bash
npm start
```

Chay 1 lan:

```bash
npm run start:once
```

Test ma khong dang that:

```bash
DRY_RUN=true POST_BATCH_SIZE=1 npm run start:once
```

`npm run start:once` duoc giu che do `force` de test thu cong bat ky luc nao, khong bi chan boi lich dang.

## Hanh vi chon bai

1. Worker chi dang khi roi vao slot hop le cua ngay hien tai:
   - Thu 2 den Thu 6: `11:45-12:15` va `19:30-20:30`
   - Thu 7: `09:45-10:15` va `19:45-20:15`
   - Chu nhat: `08:45-09:15` va `19:45-20:15`
2. Moi slot se co 1 thoi diem dang duoc random on dinh theo ngay, khong lap lai y chang giua cac ngay.
3. Neu slot hien tai da co bai dang thanh cong hoac bai gan nhat chua cach du 6 tieng, worker bo qua chu ky.
4. Khi den dung slot, worker lay toi da 10 san pham `posted_face_at is null`, sap xep `created_at asc`, roi random 1 san pham de dang.
5. Neu khong con san pham moi, worker lay 10 san pham co `posted_face_at` cu nhat roi random 1 san pham de quay vong.
6. San pham khong co anh se bi bo qua.
7. Sau khi dang thanh cong:
   - cap nhat `products.posted_face_at`
   - ghi 1 dong `posted` vao `facebook_post_history`
8. Neu dang loi:
   - ghi 1 dong `failed` vao `facebook_post_history`

## Format bai dang

Gemini chi tao phan noi dung chinh. Worker se tu dong noi them:

```text
{AI_CONTENT}

👉 Xem chi tiet san pham tai:
{product_url}

📍 Xem truc tiep tai:
{STORE_ADDRESS}

📩 Inbox de duoc tu van nhanh!
```

## Luu y van hanh

- `url` trong bang `products` duoc xem la slug; neu da la URL day du thi worker se dung nguyen gia tri do.
- Dung `SUPABASE_SERVICE_ROLE_KEY` cho backend worker de co quyen ghi `posted_face_at` va `facebook_post_history`.
- Neu Gemini khong san sang, he thong van dang duoc nhung se dung fallback copy.
- Neu Facebook tra ve loi quyen han, can kiem tra Page permissions, app mode va Page access token.
