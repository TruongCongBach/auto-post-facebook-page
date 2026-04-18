import { config } from './config.js';
import { logger } from './logger.js';
import { truncate } from './utils.js';

function buildPrompt(product) {
  const shortDescription = truncate(product.short_description || '', 1200);
  const description = truncate(product.description || '', 3200);

  return [
    'Ban la nguoi viet content Facebook bang tieng Viet cho fanpage ban noi that va san pham gia dung.',
    '',
    'Nhiem vu:',
    'Viet DUY NHAT phan noi dung chinh cua bai dang Facebook cho san pham ben duoi, theo phong cach dang tay tu nhien, co bo cuc dep mat va de doc.',
    '',
    'Muc tieu:',
    'Tao bai viet tu nhien, giong nguoi that, khong may moc, khong sao rong, khong spam. Bai viet phai du chi tiet de dang len fanpage, nhung van gon va de doc.',
    '',
    'Yeu cau chung:',
    '- Ngon ngu: tieng Viet.',
    '- Giong dieu: gan gui, tu nhien, than thien, dang tin.',
    '- Do dai muc tieu: khoang 300-800 ky tu.',
    '- Khong de cap gia.',
    '- Khong dung van phong quang cao lo lieu.',
    '- Khong lap tu, khong lap cau quen thuoc giua cac bai.',
    '- Uu tien loi ich thuc te va cam giac su dung hon la liet ke tinh nang.',
    '- Khong chen link, khong chen dia chi, khong chen hashtag, khong them so dien thoai.',
    '- Co the dung symbol trang tri vua phai nhu: ✨ 🌿 🪵 💎 📌 ✔ de bai viet dep va de nhin.',
    '- Trinh bay thanh tung doan ngan hoac cac dong ngan co xuong dong ro rang, giong bai dang mau cua fanpage.',
    '- Chi tra ve noi dung bai viet, khong giai thich.',
    '',
    'Hay tu chon 1 trong 3 kieu noi dung sau va viet sao cho phu hop nhat voi thong tin san pham:',
    '1. Bai ban hang mem:',
    '- Mo dau bang 1 dong hook thu hut, co the dung symbol.',
    '- Neu 2-4 loi ich noi bat va mo ta ngan gon, de hinh dung.',
    '- Co the chia thanh cac nhom nhu chat lieu, thiet ke, cong nang, diem noi bat.',
    '- Ket bai bang CTA nhe nhu inbox de xem them thong tin, hinh thuc tu van nhe nha.',
    '',
    '2. Bai tang tuong tac:',
    '- Mo dau bang van de quen thuoc, cau hoi gan gui hoac tinh huong de dong cam.',
    '- Chia se 2-4 y ngan huu ich nhu meo nho, loi thuong gap, loi khuyen don gian lien quan den san pham hoac cach bo tri khong gian.',
    '- Khong ban truc tiep.',
    '- Ket bang 1 cau hoi hoac loi moi tuong tac nhe, tu nhien.',
    '',
    '3. Bai trai nghiem thuc te:',
    '- Viet ngan, chan that, nhu ghi nhan trai nghiem cua khach hoac tinh huong su dung thuc te.',
    '- Co the nhac den giao hang, lap dat, su dung trong khong gian that.',
    '- Giong dieu don gian, dang tin, khong quang cao qua muc.',
    '',
    'Luu y them:',
    '- Neu mo ta san pham con chung chung, hay suy luan hop ly de viet tu nhien nhung khong bia thong tin qua cu the.',
    '- Moi bai phai co cam giac khac nhau ve cach mo dau va cach ket cau.',
    '- Neu thong tin san pham kha day du, hay viet chi tiet hon mot chut thay vi qua ngan.',
    '- Neu co thong tin ve chat lieu, kich thuoc, cong nang, mau sac, kieu dang thi uu tien dua vao bai viet mot cach tu nhien.',
    '',
    'Thong tin san pham:',
    `- Ten san pham: ${product.name}`,
    `- Tom tat ngan: ${shortDescription || 'Khong co'}`,
    `- Mo ta chi tiet: ${description || 'Khong co'}`,
    '',
    'Chi tra ve noi dung bai viet.'
  ].join('\n');
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini returned empty content');
  }

  return text;
}

export async function generateProductCopy(product) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(product) }]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 220
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Gemini API failed with status ${response.status}`;
    throw new Error(message);
  }

  return extractText(payload);
}

export function buildFallbackCopy(product) {
  const variants = [
    [
      `✨ ${String(product.name || '').toUpperCase()} – ĐẸP MẮT, CHẮC CHẮN, DỄ PHỐI TRONG NHIỀU KHÔNG GIAN ✨`,
      '',
      `Một món nội thất đẹp không chỉ phục vụ nhu cầu sử dụng mà còn giúp không gian gọn gàng và có điểm nhấn hơn. Mẫu ${product.name} này mang cảm giác hài hòa, dễ nhìn và dễ bày trí trong nhiều kiểu không gian khác nhau.`,
      '',
      '🌿 Điểm nổi bật',
      '✔ Tổng thể thiết kế cân đối, dễ kết hợp với nhiều phong cách nội thất',
      '✔ Cảm giác chắc chắn, sử dụng ổn định và bền đẹp theo thời gian',
      '✔ Vừa hữu ích trong sinh hoạt hằng ngày vừa tăng tính thẩm mỹ cho không gian',
      '',
      '🪵 Công năng tiện dụng',
      '✔ Dễ sắp xếp gọn gàng, giúp khu vực trung tâm trong nhà trông đẹp hơn',
      '✔ Phù hợp để bày trí trong phòng khách, phòng sinh hoạt hoặc không gian cần điểm nhấn',
      '✔ Dễ ứng dụng lâu dài, nhìn vẫn gọn và hài hòa',
      '',
      '💎 Nếu anh chị đang tìm một mẫu nội thất dễ dùng, bền đẹp và dễ phối tổng thể, đây là lựa chọn rất đáng tham khảo.'
    ].join('\n'),
    [
      `✨ ${String(product.name || '').toUpperCase()} – LỰA CHỌN ĐẸP VÀ THỰC DỤNG CHO KHÔNG GIAN SỐNG ✨`,
      '',
      `${product.name} không chỉ giúp hoàn thiện công năng sử dụng mà còn tạo cảm giác gọn gàng, ấm cúng và dễ nhìn hơn cho tổng thể căn phòng. Mẫu này phù hợp với người muốn ưu tiên sự bền đẹp và tính thẩm mỹ trong quá trình sử dụng lâu dài.`,
      '',
      '🌿 Ưu điểm dễ để ý',
      '✔ Kiểu dáng dễ nhìn, dễ kết hợp với nhiều cách bày trí',
      '✔ Tổng thể chắc chắn, tạo cảm giác yên tâm khi sử dụng',
      '✔ Càng đặt vào không gian thật càng thấy rõ giá trị thẩm mỹ',
      '',
      '🪵 Phù hợp sử dụng',
      '✔ Nhà phố, căn hộ, phòng khách hoặc khu vực sinh hoạt chung',
      '✔ Dễ kết hợp với các món nội thất sẵn có mà vẫn giữ được sự hài hòa',
      '✔ Vừa làm đẹp không gian vừa phục vụ nhu cầu hằng ngày',
      '',
      '💎 Anh chị quan tâm mẫu này có thể inbox để xem thêm thông tin và hình ảnh thực tế.'
    ].join('\n')
  ];

  const index =
    Math.abs(String(product.id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) %
    variants.length;
  logger.warn('Using fallback copy because Gemini content is unavailable', {
    productId: product.id
  });
  return variants[index];
}
