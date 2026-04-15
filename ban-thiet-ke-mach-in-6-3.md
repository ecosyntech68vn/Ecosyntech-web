# EcoSynTech PCB v6.3 Final – Thiết kế hoàn hảo (bản tóm tắt)

Kế hoạch mở rộng (expandable): Thiết kế để dễ bổ sung 2-4 relay và 2-4 cảm biến mà không cần thay đổi lớn.
- Sử dụng IO expanders (ví dụ MCP23017) qua I2C để tăng số GPIO mà không sửa đổi schematic gốc.
- Thêm header 5.08 mm cho expansion IO và header 7.62 mm cho nguồn/ tải tại cạnh board; các expansion module có thể kết nối để bổ sung relay và cảm biến.
- Thiết kế có 2–4 footprint dự phòng cho relay và 2–4 cảm biến ở IO expander hoặc ADS1115 mở rộng nếu cần thêm kênh ADC.
- Giữ nguyên netlist và phân vùng nguồn/digital, analog để tối ưu DFM/EMI khi mở rộng.

Kế hoạch chi tiết triển khai KiCad (tóm tắt)
- Schematic expansion: thêm MCP23017 (hoặc MCP23S17) để mở rộng GPIO; tạo các nets cho RELAY5_DRV..RELAY8_DRV và IO_EXP GPIO.
- PCB expansion: thêm footprints cho MCP23xx, expansion headers 5.08 mm và 7.62 mm ở cạnh board.
- Việc mở rộng sẽ không bắt buộc thay đổi các nets hiện có của ESP32 và ADS1115; chỉ thêm IO expansion và header ở các vị trí đã định rõ.

Ghi chú an toàn và thiết kế
- Đảm bảo phân vùng nguồn (12V/5V/3.3V) và ground (GND_STAR) vẫn duy trì khi thêm expansion.
- Duy trì khoảng cách và shielding để tránh nhiễu từ các relay khi lắp thêm.
- Confer conformal coating vùng exclude; cẩn trọng khi bố trí vùng hàn và module mở rộng ngoài trời.
