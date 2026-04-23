# EcoSynTech FarmOS - STANDARD OPERATING PROCEDURES (SOP) INDEX
# Phiên bản: 6.0.0 | Ngày: 2026-04-22

---

## DANH MỤC SOP
Note: Document aligned with the latest ISA/ISO 27001 alignment and architecture updates. For future updates, reference DOCS_GUIDE.md.
Patch: Use the DOCS_GUIDE.md template for future SOP updates; ensure alignment across ISO GAP and Architecture docs.

### Series A: Security (Bảo mật)

| SOP Code | Title | Owner | Review Cycle |
|---------|-------|-------|---------------|
| **SOP-A-01** | Quản lý truy cập và xác thực | IT Admin | 3 tháng |
| **SOP-A-02** | An toàn vật lý | Security | 6 tháng |
| **SOP-A-03** | Quản lý mật khẩu | IT Admin | 3 tháng |
| **SOP-A-04** | Sao lưu và phục hồi | IT Admin | 1 tháng |
| **SOP-A-05** | Xử lý sự cố bảo mật | SOC | 1 tháng |
| **SOP-A-06** | Giám sát và ghi nhận | IT Admin | 1 tuần |
| **SOP-A-07** | Quản lý nhà cung cấp | Procurement | 6 tháng |
| **SOP-A-08** | Quản lý Key Rotation | IT Admin | 3 tháng |

### Series B: Operations (Vận hành)

| SOP Code | Title | Owner | Review Cycle |
|---------|-------|-------|---------------|
| **SOP-B-01** | Khởi động hệ thống | Operator | N/A |
| **SOP-B-02** | Tắt hệ thống an toàn | Operator | N/A |
| **SOP-B-03** | Giám sát hệ thống | Operator | 1 giờ |
| **SOP-B-04** | Xử lý cảnh báo | Operator | 15 phút |
| **SOP-B-05** | Cập nhật hệ thống | IT Admin | 3 tháng |

### Series C: Data (Dữ liệu)

| SOP Code | Title | Owner | Review Cycle |
|---------|-------|-------|---------------|
| **SOP-C-01** | Quản lý backup | IT Admin | 1 tuần |
| **SOP-C-02** | Khôi phục dữ liệu | IT Admin | Khi cần |
| **SOP-C-03** | Xuất/Nhập dữ liệu | Operator | Khi cần |
| **SOP-C-04** | Archive dữ liệu | IT Admin | 6 tháng |

### Series D: Support (Hỗ trợ)

| SOP Code | Title | Owner | Review Cycle |
|---------|-------|-------|---------------|
| **SOP-D-01** | Hỗ trợ người dùng | Support | Khi cần |
| **SOP-D-02** | Báo cáo sự cố | Support | 24 giờ |
| **SOP-D-03** | Đào tạo người dùng | HR | 6 tháng |

### Series E: AI Automation (AI Tự động - v6.0)

| SOP Code | Title | Owner | Review Cycle |
|---------|-------|-------|---------------|
| **SOP-E-01** | Quản lý SmartAutomationEngine | AI Ops | 1 tháng |
| **SOP-E-02** | Giám sát AI Agents | AI Ops | 1 giờ |
| **SOP-E-03** | Xử lý Predictive Alerts | AI Ops | 15 phút |

---

## QUY TRÌNH CHUNG

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  START ──▶ MONITOR ──▶ ISSUE ──▶ RESOLVE ──▶ IMPROVE      │
│    │           │          │           │           │         │
│    ▼           ▼          ▼           ▼           ▼         │
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│ │SOP-B-01│ │SOP-B-03│ │SOP-A-05│ │SOP-A-05│ │SOP-B-05│        │
│ └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## LIÊN KẾT SOP

### Khi khởi động
1. **SOP-B-01** → Kiểm tra hệ thống
2. **SOP-B-03** → Bắt đầu giám sát

### Khi có cảnh báo
1. **SOP-B-04** → Xử lý cảnh báo
2. **SOP-A-05** → Nếu là sự cố bảo mật

### Khi cần backup
1. **SOP-C-01** → Tạo backup
2. **SOP-C-04** → Archive nếu cần

---

## APPROVAL & VERSION

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 5.0.0 | 2026-04-20 | EcoSynTech | Initial release |

| Role | Name | Date | Signature |
|------|------|------|----------|
| Approved by | | 2026-04-20 | __________ |
| Reviewed by | | 2026-04-20 | __________ |

---

*Document Classification: Internal*
*Next Review: 2026-10-20*
