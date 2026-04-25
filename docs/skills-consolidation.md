# Skills Consolidation Plan

- Mục tiêu: Hợp nhất nguồn Skills và loại bỏ sự trùng lặp, đảm bảo một nguồn duy nhất làm chuẩn cho việc tra cứu và tải skill.
- Hiện trạng:
  - Có hai hồ sơ Skills phổ biến trên hệ thống này: `/root/.opencode/skills` và `/root/.claude/skills` (và xác định duplication giữa chúng).
  - Một số SKILL.md và metadata trùng lặp có thể gây nhầm lẫn và drift khi cập nhật.
- Đề xuất hành động:
  1) Chọn một nguồn chuẩn làm canonical, gợi ý: `/root/EcoSynTech-Claude-Code/skills` (nếu có), hoặc `/root/.opencode/skills` nếu repo đại chúng đang tham chiếu tới đó.
  2) Di chuyển/tái tổ chức các SKILL.md và các tài liệu liên quan sang nguồn canonical, bắt đầu từ các skill được sử dụng nhiều nhất hoặc được cập nhật gần đây.
  3) Viết script audit nhanh để tìm SKILL.md thiếu frontmatter hoặc có metadata sai, và tự động gợi ý sửa chữa.
  4) Thiết lập CI nhẹ: kiểm tra mỗi PR có update SKILL.md và metadata consistency (frontmatter, name/description).
  5) Tài liệu hóa luồng để cập nhật skills mới: dùng các SKILL.md được gắn frontmatter chuẩn và các resource (agents/, references/, assets/).
- Kế hoạch thực thi (ngắn gọn):
  - Tuần 1: Dò tìm trùng lặp, lựa chọn canonical source, tạo hướng dẫn di chuyển.
  - Tuần 2: Viết script audit và tích hợp vào workflow, bổ sung CI.
  - Tuần 3+: Di chuyển dữ liệu, rà soát và dọn dẹp, thông báo cho nhóm.

## Tiêu chí thành công
- Không còn SKILL.md trùng lặp giữa các nguồn; một nguồn chuẩn được dùng làm tham khảo duy nhất.
- Frontmatter SKILL.md đúng chuẩn: name và description.
- CI và PR flows báo cáo khi có SKILL.md mới hoặc thay đổi metadata.
- Documentation cập nhật đầy đủ và người dùng có thể dễ dàng thêm skill mới theo template chuẩn.

## Ghi chú
- Đây là kế hoạch tổ chức và đạo diễn; chi tiết triển khai sẽ đi cùng với các thay đổi patch và scripts cụ thể.
