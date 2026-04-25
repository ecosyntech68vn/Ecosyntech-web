# EcoSynTech FarmOS - Quick Start Guide
## Hướng dẫn Bắt đầu Nhanh

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Platform:** ESP32 IP67

---

## 1. SAO CHÉP TỪ HỘP

### Kiểm tra hộp
```
✓ PCB Controller (IP67)
✓ Cảm biến (theo gói đã mua)
✓ Nguồn 12V 2A
✓ Cáp kết nối
✓ Hướng dẫn nhanh (QR code)
✓ Thẻ bảo hành
```

### Gói của bạn có gì?

| Gói | Cảm biến |
|-----|----------|
| BASE | ST30 (1), Soil (1) |
| PRO | ST30 (2), DHT22 (1), BME280 (1), Soil (2), Light (1) |
| PRO MAX | Thêm: pH, EC, Rain |
| PREMIUM | Thêm: Wind, CO2 |

---

## 2. KẾT NỐI PHẦN CỨNG

### Bước 2.1: Đặt Controller
```
1. Chọn vị trí khô ráo, gần nguồn điện
2. Khoan 4 lỗ m3, bắt controller lên tường
3. Khoảng cách đến cảm biến: tối đa 10m
```

### Bước 2.2: Lắp cảm biến
```
ST30 (nhiệt độ nước):
├── Đặt gần nguồn nước
├── Không được ngập nước
└── Cắm vào Port 1 (TX1)

Soil Moisture (độ ẩm đất):
├── Cắm sâu 5-10cm vào đất
├── Cách gốc cây 5cm
└── Cắm vào Port 2 (TX2)
```

### Bước 2.3: Kết nối Relay cho máy bơm
```
RELAY 1 ( Máy bơm):
├── COM → Nguồn 220V máy bơm
├── NO → Máy bơm
├── NC → (không dùng)
└── Cắm dây chắc chắn
⚠️ LƯU Ý: Tắt điện trước khi đấu nối!
```

### Bước 2.4: Cắm nguồn
```
Adapter → 220V → Controller (12V DC)
Đèn PWR xanh sáng → Nguồn OK
```

---

## 3. CÀI ĐẶT APP

### Bước 3.1: Tải App
```
Android: Tìm "EcoSynTech" trên CH Play
iOS: Tìm "EcoSynTech" trên App Store
```

### Bước 3.2: Tạo tài khoản
```
1. Mở App → Đăng ký
2. Nhập SĐT → OTP
3. Tạo mật khẩu
4. Đăng nhập
```

### Bước 3.3: Thêm thiết bị
```
1. Quét QR code trên controller
   HOẶC nhập mã: [Mã thiết bị]
2. Đặt tên: "Vuon rau" / "Cay an qua"
3. Hoàn tất
```

---

## 4. THIẾT LẬP ĐẦU TIÊN

### Bước 4.1: Cài đặt ngưỡng
```
🌡️ Nhiệt độ:
├── Báo động > 35°C
└── Tưới khi > 30°C

💧 Độ ẩm đất:
├── Tưới khi < 40%
└── Ngừng khi > 70%

⏰ Thời gian tưới:
├── Bắt đầu: 17:00
├── Chạy: 15 phút
└── Lặp: Mỗi ngày
```

### Bước 4.2: Kết nối Zalo
```
1. Nhấn "Cảnh báo" → "Thêm Zalo"
2. Quét mã QR
3. Xác nhận
→ Nhận thông báo khi có vấn đề
```

---

## 5. SỬ DỤNG HÀNG NGÀY

### Xem dữ liệu
```
App → Dashboard
→ Nhiệt độ hiện tại
→ Độ ẩm đất
→ Lịch sử 24h
```

### Bật/tắt tưới thủ công
```
App → Relay → Bật / Tắt
→ Xác nhận trên Zalo
```

### Cài đặt tự động
```
App → Thiết lập → Tự động
→ Chọn ngưỡng
→ Lưu
```

---

## 6. XỬ LÝ SỰ CỐ

### Không kết nối được?
```
1. Kiểm tra Wifi có mạng không
2. Restart controller (rút nguồn, chờ 10s, cắm lại)
3. Reset: Giữ nút RESET 5 giây
```

### Cảm biến không đọc?
```
1. Kiểm tra cáp cắm chặt chưa
2. Thử cắm vào port khác
3. Liên hệ hỗ trợ: [SĐT/Zalo]
```

### Máy bơm không chạy?
```
1. Kiểm tra Relay bật chưa
2. Kiểm tra nguồn 220V
3. Kiểm tra dây đấu
```

---

## 7. THÔNG TIN HỖ TRỢ

| Kênh | Thông tin |
|------|-----------|
| 📞 Hotline | [Số điện thoại] |
| 💬 Zalo | [ID Zalo] |
| 🌐 Web | www.ecosyntech.vn |
| ⏰ Giờ hỗ trợ | 7:00 - 21:00 (T2-T7) |

---

## 8. CHECKLIST BẮT ĐẦU

```
□ Đã mở hộp, kiểm tra đủ linh kiện
□ Đã gắn controller lên tường
□ Đã lắp cảm biến
□ Đã kết nối relay → máy bơm
□ Đã cắm nguồn, đèn sáng
□ Đã tải App, đăng ký
□ Đã thêm thiết bị vào App
□ Đã cài đặt ngưỡng
□ Đã kết nối Zalo
□ Đã chạy thử tưới 1 lần
□ Đã gửi thông tin bảo hành
```

---

**Document:** Quick Start Guide V1.0
**Version:** 1.0
**Date:** 2026-04-25
**Support:** [Hotline/Zalo]