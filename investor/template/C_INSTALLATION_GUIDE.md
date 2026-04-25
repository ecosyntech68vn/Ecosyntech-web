# EcoSynTech FarmOS - Installation Guide
## Hướng dẫn Lắp đặt Chi tiết (ISO 9001 Compliant)

**Firmware:** v9.2.0 | **Backend:** GAS V10 | **Platform:** ESP32 IP67

---

## 1. CHUẨN BỊ

### 1.1 Dụng cụ cần thiết
```
□ M drill (để bắt controller)
□ Máy khoan cầm tay
□ Tua vit các loại (Phillips, Flat)
□ Kìm
□ Dao cắt dây
□ Băng keo cách điện
□ Thước
□ Bút đánh dấu
□ Đồng hồ đo điện (nếu có)
```

### 1.2 Vật tư
```
□ PCB Controller (IP67)
□ Cảm biến (theo gói)
□ Nguồn 12V 2A
□ Dây điện 1.5mm² (tối đa 50m từ bơm)
□ Ống gen (bảo vệ dây ngoài trời)
□ Cáp ethernet (dự phòng)
□ Xi măng/keo dán (nếu cần)
```

### 1.3 Yêu cầu vị trí
```
□ Gần nguồn điện 220V (bán kính 3m)
□ Khô ráo, không ngập nước
□ Bóng râm (tránh mưa trực tiếp)
□ Tín hiệu Wifi tốt
□ Cách cảm biến tối đa 10m
```

---

## 2. LẮP ĐẶT CONTROLLER

### 2.1 Vị trí lý tưởng
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  TƯỜNG                          TRẦN             │
│  ┌──────────────┐                               │
│  │ CONTROLLER  │     ← Cao 1.4m - 1.6m         │
│  │    (IP67)   │                               │
│  └──────────────┘                               │
│                                                 │
│         Wifi 📶 ← Tín hiệu tốt                │
│                                                 │
│  220V ⚡ ← Nguồn điện gần đây                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Quy trình bắt controller
```
Bước 1: Đánh dấu
├── Đo chiều cao: 1.4m - 1.6m (mắt nhìn)
├── Đánh dấu 4 lỗ m3, khoảng cách 160x120mm
└── Dùng thước kiểm tra cân bằng

Bước 2: Khoan
├── Khoan 4 lỗ m3, sâu 30mm
├── Đục nhẹ nếu tường cứng
└── Thổi bụi, lau sạch

Bước 3: Bắt controller
├── Đặt controller lên, căn chỉnh
├── Bắt 4 vis m3x20
├── Siết vừa đủ (không xiết quá)
└── Kiểm tra không bị nghiêng
```

---

## 3. LẮP CẢM BIẾN

### 3.1 ST30 (Cảm biến nhiệt độ nước)
```
Vị trí: Gần đầu ra nguồn nước

1. Chọn nơi khô ráo, dễ quan sát
2. Cố định bằng băng keo hoặc đai
3. Cắm cáp vào PORT TX1 (ST30)
4. Kiểm tra: App → Xem nhiệt độ → Có dữ liệu?

⚠️ Không đặt trong vùng ngập nước!
```

### 3.2 Soil Moisture (Độ ẩm đất)
```
Vị trí: Giữa 2 gốc cây cần tưới

1. Đào lỗ sâu 5-8cm
2. Đặt cảm biến nghiêng 45°
3. Lấp đất, nén chặt
4. Cắm cáp vào PORT TX2 (Soil)
5. Kiểm tra: App → Xem độ ẩm → Có dữ liệu?

Lưu ý: Đặt cách gốc cây 5-10cm
```

### 3.3 DHT22 / BME280 (Nhiệt độ + Độ ẩm không khí)
```
Vị trí: Nơi thông thoáng, tránh nắng trực tiếp

1. Treo dưới mái che, cao 1.5m
2. Không được trong hộp kín
3. Cắm cáp vào PORT TX3 (DHT)
4. Kiểm tra: App → Xem nhiệt độ/độ ẩm

Khoảng cách đến controller: tối đa 5m
```

### 3.4 pH / EC Sensor (Nước)
```
Vị trí: Bể chứa hoặc đường ống ra

1. Khoan lỗ 20mm trên đường ống PVC
2. Lắp fitting đồng (đi kèm sensor)
3. Gắn sensor vào fitting
4. Dùng bao nilon bảo vệ đầu nối
5. Cắm cáp vào PORT ADS (Analog)

⚠️ Cần kỹ thuật viên hỗ trợ lắp đặt
```

---

## 4. KẾT NỐI MÁY BƠM (RELAY)

### 4.1 Sơ đồ đấu dây
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  NGUỒN 220V                                          │
│      ⚡                                               │
│      │                                                │
│      ├───[Cầu chì 10A]──┐                            │
│      │                  │                            │
│      ├─── CONTROLLER ───┤ RELAY COM                  │
│      │                  │                            │
│      │                  ├── NO ──┐                   │
│      │                  │       │                   │
│      │                  └── NC───┘                   │
│      │                          │                   │
│      │                          │                   │
│      └──────────────────────────┘                   │
│                                    │                   │
│                              MÁY BƠM                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 Quy trình đấu dây
```
⚠️ BẮT BUỘC: TẮT NGUỒN ĐIỆN TRƯỚC KHI ĐẤU NỐI!

Bước 1: Chuẩn bị dây
├── Chuẩn bị 3 dây: L (nóng), N (nguội), PE (nối đất)
├── Lột đầu dây 10mm
└── Chuẩn bị đầu nối terminal

Bước 2: Kết nối Relay
├── Mở nắp relay trên controller
├── Dây L → RELAY COM (cầu chì đã gắn)
├── Dây N → RELAY NO (đường ra máy bơm)
├── Dây PE → Nối đất vỏ máy bơm
└── Siết chặt các đầu nối

Bước 3: Kiểm tra
├── Dùng đồng hồ đo thông mạch
├── L (vào) → RELAY COM = có điện ✓
├── RELAY NO → Máy bơm = có điện khi bật ✓
└── PE → Vỏ máy bơm = nối đất ✓

Bước 4: Đóng nắp relay
├── Căng dây không bị căng
├── Đóng nắp, siết chặt
└── Đảm bảo IP67 (gasket khớp)
```

### 4.3 Test relay
```
Bước 1: Bật nguồn 220V
Bước 2: App → Relay → Bật ON
         → Nghe tiếng "tắc" relay
         → Máy bơm chạy ✓
Bước 3: App → Relay → Tắt OFF
         → Máy bơm dừng ✓
Bước 4: Nếu không chạy → Xem mục 6. XỬ LÝ SỰ CỐ
```

---

## 5. CHẠY TEST

### 5.1 Test cảm biến
```
App → Dashboard
□ ST30: Nhiệt độ hiển thị? → ✓/✗
□ Soil: % độ ẩm? → ✓/✗
□ DHT22: Nhiệt độ + Độ ẩm? → ✓/✗
□ BME280: Thêm áp suất? → ✓/✗
□ pH: Giá trị pH? → ✓/✗
□ EC: ms/cm? → ✓/✗
```

### 5.2 Test relay
```
App → Relay Control
□ Bật Relay 1 → Máy bơm chạy? → ✓/✗
□ Tắt Relay 1 → Máy bơm dừng? → ✓/✗
□ Đèn LED relay sáng xanh? → ✓/✗
```

### 5.3 Test cảnh báo
```
App → Cài đặt → Cảnh báo
□ Thử ngưỡng nhiệt cao → Zalo nhận thông báo? → ✓/✗
□ Thử ngưỡng độ ẩm thấp → Zalo nhận thông báo? → ✓/✗
```

---

## 6. XỬ LÝ SỰ CỐ

| Sự cố | Nguyên nhân | Xử lý |
|-------|-----------|--------|
| Không kết nối Wifi | Sai mật khẩu | Reset controller, đăng nhập lại |
| Cảm biến không đọc | Cáp lỏng | Cắm lại cáp, kiểm tra cổng |
| Relay không chạy | Chưa cấp nguồn | Kiểm tra nguồn 12V, LED PWR |
| Máy bơm không chạy | Máy bơm hỏng | Test trực tiếp với công tắc |
| Báo lỗi Wifi yếu | Khoảng cách xa | Di chuyển controller gần hơn |

---

## 7. NGHIỆM THU

### Checklist nghiệm thu
```
□ Controller gắn chắc chắn, không nghiêng
□ Tất cả cảm biến đọc dữ liệu tốt
□ Relay điều khiển máy bơm bình thường
□ App kết nối ổn định
□ Cảnh báo Zalo hoạt động
□ Khách hàng biết sử dụng cơ bản
□ Dọn dẹp công trường
□ Chụp ảnh trước/sau
□ Gửi thông tin bảo hành về công ty
```

### Biên bản nghiệm thu
```
Ngày lắp: ____/____/2026
Khách hàng: _______________________
Địa chỉ: _______________________
Điện thoại: _______________________
Thiết bị: _______________________
Số serial: _______________________
Kết quả: □ Đạt  □ Không đạt
Chữ ký khách: _______________
Kỹ thuật viên: _______________
```

---

## 8. BÀN GIAO

### Thông tin bàn giao
```
□ Hướng dẫn sử dụng cơ bản
□ Tài khoản App
□ Mật khẩu Wifi (nếu cần)
□ Số serial thiết bị
□ Thông tin bảo hành
□ Liên hệ hỗ trợ
□ Biên bản nghiệm thu
```

### Thông tin bảo hành
```
Thời hạn: 12 tháng (IP67)
Điều kiện: Lắp đặt đúng quy trình
Bảo hành: Thay mới nếu lỗi nhà sản xuất
Không bảo hành: Ngập nước, va đập, tự ý sửa
```

---

**Document:** Installation Guide V1.0
**Version:** 1.0
**Date:** 2026-04-25
**ISO Compliance:** Designed per ISO 9001:2015