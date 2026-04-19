# DATA SECURITY, AUDIT & COMPLIANCE SPEC – EcoSynTech FarmOS PRO

## Mục lục
1. [Mục tiêu](#91-mục-tiêu)
2. [Nguyên tắc bảo mật](#92-nguyên-tắc-bảo-mật)
3. [Phân loại dữ liệu](#93-phân-loại-dữ-liệu)
4. [Security architecture](#94-security-architecture)
5. [Authentication](#95-authentication)
6. [Authorization](#96-authorization)
7. [Data encryption](#97-data-encryption)
8. [Password & credential policy](#98-password--credential-policy)
9. [Secure API policy](#99-secure-api-policy)
10. [Input validation & data integrity](#910-input-validation--data-integrity)
11. [Audit log design](#911-audit-log-design)
12. [Event integrity & tamper resistance](#912-event-integrity--tamper-resistance)
13. [Data retention & lifecycle](#913-data-retention--lifecycle)
14. [Data minimization](#914-data-minimization)
15. [Privacy & user data protection](#915-privacy--user-data-protection)
16. [Incident response](#916-incident-response)
17. [Security monitoring](#917-security-monitoring)
18. [Compliance readiness](#918-compliance-readiness)
19. [Access review](#919-access-review)
20. [Export control](#920-export-control)
21. [Third-party & integration security](#921-third-party--integration-security)
22. [DevSecOps requirements](#922-devsecops-requirements)
23. [Backup security](#923-backup-security)
24. [Secure deletion](#924-secure-deletion)
25. [Security KPIs](#925-security-kpis)
26. [Role responsibilities](#926-role-responsibilities)
27. [Release gates](#927-release-gates-cho-bảo-mật)

---

## 9.1 Mục tiêu

Mục này quy định cách hệ thống bảo vệ:

| Loại dữ liệu | Mô tả |
|---------------|-------|
| Dữ liệu nông trại | Farm, area, crops, logs |
| Dữ liệu người dùng | Tài khoản, quyền, session |
| Dữ liệu thiết bị IoT | Telemetry, device config |
| Dữ liệu traceability | Batch, package, shipment |
| Dữ liệu AI | Models, recommendations |
| Lịch sử vận hành | Audit logs, events |

**4 yêu cầu cốt lõi:**

| Yêu cầu | Mô tả |
|---------|-------|
| **An toàn dữ liệu** | Mã hóa, bảo vệ khỏi truy cập trái phép |
| **Kiểm soát truy cập** | RBAC/ABAC, least privilege |
| **Truy vết đầy đủ** | Audit log đầy đủ, có thể điều tra |
| **Sẵn sàng kiểm toán** | Compliance, mở rộng thương mại |

---

## 9.2 Nguyên tắc bảo mật

| Nguyên tắc | Mô tả | Áp dụng |
|-----------|-------|--------|
| **Least privilege** | Quyền tối thiểu cần thiết | User, device, service |
| **Defense in depth** | Nhiều lớp bảo vệ | Auth → Authz → Encrypt → Audit |
| **Zero trust nội bộ** | Không tin request nội bộ mặc định | API calls, service-to-service |
| **Secure by default** | Tính năng mới phải an toàn từ đầu | Feature development |
| **Auditability** | Mọi hành động phải truy vết được | Security monitoring |

---

## 9.3 Phân loại dữ liệu

| Cấp độ | Dữ liệu | Ví dụ | Bảo vệ |
|-------|---------|-------|--------|
| **Public** | Có thể công khai | Trang public trace, thông tin sản phẩm | Không cần mã hóa |
| **Internal** | Nội bộ vận hành | Dashboard, plan, task, logs | Auth + Audit |
| **Confidential** | Nhạy cảm | Tài khoản, API keys, chi phí | Encrypt + Audit + Access control |
| **Restricted** | Cực kỳ nhạy cảm | Mật khẩu, secrets, private keys | Encrypt + Audit + Limited access |

---

## 9.4 Security architecture

```
┌──────────────────────────────────────────��──────────────────────────┐
│                  User / Device / Service                        │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION                            │
│  • Username/Password                                      │
│  • JWT Token                                             │
│  • API Key                                              │
│  • Device Certificate                                   │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│               AUTHORIZATION (RBAC/ABAC)                     │
│  • Role-based                                           │
│  • Attribute-based (farm_id, org_id, tenant_id)             │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│           VALIDATION & RATE LIMITING                         │
│  • Input validation                                     │
│  • Rate limit                                         │
│  • Request throttling                                  │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│         APPLICATION SECURITY CONTROLS                      │
│  • SQL injection prevention                              │
│  • XSS protection                                     │
│  • CSRF tokens                                       │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│          ENCRYPTION IN TRANSIT + AT REST                    │
│  • TLS/HTTPS                                          │
│  • Database encryption                               │
│  • Field-level encryption                            │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│                    AUDIT LOG                             │
│  • Activity logging                                   │
│  • Security events                                   │
│  • Compliance records                               │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│              MONITORING + ALERTING                         │
│  • Real-time monitoring                                │
│  • Anomaly detection                                  │
│  • Alert escalation                                │
└────────────────────────┬──────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────────────────┐
│                 BACKUP + RECOVERY                         │
│  • Encrypted backups                                  │
│  • Disaster recovery                               │
│  • Restore testing                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 9.5 Authentication

### A. Người dùng

| Phương thức | Mô tả |
|-------------|-------|
| Email/Password | Đăng nhập cơ bản |
| JWT Access Token | 15 phút, short-lived |
| Refresh Token | 7 ngày, để refresh |
| Session Timeout | 30 phút không hoạt động |
| MFA (Optional) | Cho tài khoản quan trọng |

### B. Thiết bị IoT

| Yêu cầu | Mô tả |
|-----------|-------|
| Device ID | Định danh riêng |
| Device Token | Credential riêng |
| Revoke Capability | Cơ chế thu hồi |

### C. Service-to-service

| Phương thức | Mô tả |
|-------------|-------|
| Shared Secret | Cho nội bộ |
| Short-lived Token | Token có expiry |
| Certificate | Service identity |

### D. Session policy

| Quy tắc | Giá trị |
|----------|--------|
| Access token expiry | 15 phút |
| Refresh token expiry | 7 ngày |
| Session timeout | 30 phút |
| Max concurrent sessions | 3 |

---

## 9.6 Authorization

### RBAC + ABAC Model

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHORIZATION                           │
├─────────────────────────────────────────────────────────────┤
│  RBAC (Role-based)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Super Admin → Full system access                    │   │
│  │ Org Owner    → Organization scope               │   │
│  │ Farm Manager → Farm scope                     │   │
│  │ Technician → Device/IoT scope               │   │
│  │ Worker     → Task/log scope                   │   │
│  │ Viewer     → Read-only                       │   │
│  └────────────────────��─��──────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ABAC (Attribute-based)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ farm_id, org_id, tenant_id                        │   │
│  │ device_id, area_id                              │   │
│  │ time-based, location-based                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Quy tắc bắt buộc

Mọi API phải kiểm tra:

| Kiểm tra | Mô tả |
|---------|-------|
| Quyền người dùng | Role có đủ quyền không |
| Tenant scope | Thuộc tenant nào |
| Farm scope | Thuộc farm nào |
| Object ownership | Sở hữu object không |

---

## 9.7 Data encryption

| Loại | Phương thức | Áp dụng |
|------|------------|---------|
| **In transit** | TLS 1.3 | All HTTP, MQTT |
| **At rest** | AES-256 | Database, storage |
| **Field-level** | AES-256 | Secrets, tokens |
| **Key management** | HashiCorp Vault/AWS Secrets | Keys,Rotate |

---

## 9.8 Password & credential policy

| Loại | Chính sách |
|------|------------|
| **Mật khẩu** | ≥8 ký tự, không cho phép yếu, hash bcrypt/argon2 |
| **API keys** | Sinh riêng per tenant, có scope, có expiry |
| **Device credentials** | Mỗi device một identity, không chung key |

---

## 9.9 Secure API policy

### Bắt buộc cho mọi endpoint

| Yêu cầu | Mô tả |
|---------|-------|
| Input validation | Kiểm tra kiểu, độ dài, format |
| Rate limiting | Giới hạn request |
| Injection prevention | Chống SQL, XSS |
| Broken access control | Kiểm tra quyền |
| Security events | Log security |
| Error response | Không lộ chi tiết |

### Rate limiting rules

| Endpoint | Limit |
|----------|-------|
| Login | 5/phút |
| OTP/MFA | 3/phút |
| Public verify | 10/phút |
| Device ingest | 1000/phút |
| Export | 5/phút |
| AI endpoints | 30/phút |

---

## 9.10 Input validation & data integrity

### Validation rules

| Loại | Quy tắc |
|------|---------|
| **Kiểu** | Đúng kiểu dữ liệu |
| **Độ dài** | Trong phạm vi cho phép |
| **Format** | Đúng format (email, phone…) |
| **Phạm vi** | Trong giá trị hợp lệ |
| **Logic** | Quan hệ dữ liệu hợp lệ |

### Idempotency

| API type | Yêu cầu |
|---------|----------|
| IoT ingest | Idempotency key |
| Batch create | Unique constraint |
| Traceability events | Event chain |

---

## 9.11 Audit log design

### Bắt buộc ghi audit

| Hành động | Ghi log |
|-----------|--------|
| Login/logout | ✅ |
| Tạo/sửa/xóa farm | ✅ |
| Tạo/sửa asset | ✅ |
| Tạo log | ✅ |
| Tạo plan/task | ✅ |
| Cập nhật device | ✅ |
| Đổi rule | ✅ |
| Tạo batch/package/shipment | ✅ |
| Duyệt AI recommendation | ✅ |
| Thay đổi quyền | ✅ |
| Export dữ liệu | ✅ |
| Thay đổi config | ✅ |

### Audit log format

```json
{
  "actor_id": "user-001",
  "actor_type": "user",
  "org_id": "org-001",
  "action": "CREATE",
  "entity_type": "batch",
  "entity_id": "tb-batch-001",
  "before": null,
  "after": { "product_name": "Rau muống", "quantity": 500 },
  "timestamp": "2024-04-25T14:30:00Z",
  "ip": "192.168.1.100",
  "device_info": "Mozilla/5.0...",
  "request_id": "req-abc123",
  "outcome": "SUCCESS"
}
```

### Quy tắc audit

| Quy tắc | Mô tả |
|----------|-------|
| Append-only | Không sửa, chỉ thêm event mới |
| Immutable | Hạn chế sửa/xóa |
| Integrity | Hash chain cho chuỗi quan trọng |

---

## 9.12 Event integrity & tamper resistance

### Cơ chế bảo vệ

| Cơ chế | Áp dụng |
|--------|---------|
| **Append-only log** | Audit trail, traceability |
| **Hash chain** | Chuỗi sự kiện liên tiếp |
| **Signed events** | Nghiệp vụ nhạy cảm |
| **Integrity check** | Xác minh định kỳ |

---

## 9.13 Data retention & lifecycle

### Chính sách retention

| Loại dữ liệu | Retention | Archive | Xóa |
|-------------|-----------|---------|-----|
| Logs vận hành | 90 ngày | 12 tháng | Sau 12 tháng |
| Telemetry | 30 ngày | 6 tháng | Sau 6 tháng |
| Task history | 12 tháng | 24 tháng | Sau 24 tháng |
| Alerts | 12 tháng | 24 tháng | Sau 24 tháng |
| Audit logs | 24 tháng | 60 tháng | Legal hold |
| Traceability | 36 tháng | 84 tháng | Legal hold |
| Quality checks | 36 tháng | 84 tháng | Legal hold |
| Incident history | 60 tháng | 120 tháng | Legal hold |

---

## 9.14 Data minimization

| Nguyên tắc | Mô tả |
|-----------|-------|
| Thu thập cần thiết | Chỉ dữ liệu cần cho vận hành |
| Không thừa | Không lưu thông tin không cần |
| Public trace | Chỉ dữ liệu được phép |

### Public trace data

| Cho phép | Không cho phép |
|----------|---------------|
| Product name | Internal IDs |
| Farm name | Sensitive metadata |
| Harvest date | Owner personal info |
| Quality grade | Device config |
| Origin area | Audit details |

---

## 9.15 Privacy & user data protection

| Yêu cầu | Mô tả |
|-----------|-------|
| Thông báo thu thập | Data collection notice |
| Quản lý hồ sơ | Profile management |
| Đổi mật khẩu | Password change |
| Xóa/Vô hiệu tài khoản | Account delete/disable |

### Location data

| Quản lý | Mô tả |
|---------|-------|
| Kiểm soát quyền xem | Chỉ user được phép |
| Không public toàn bộ | Hạn chế exposed |

### Image data

| Quản lý | Mô tả |
|---------|-------|
| Quyền truy cập | Access control |
| Metadata | farm_id, log_id, batch_id |

---

## 9.16 Incident response

### Loại sự cố

| Severity | Loại sự cố | Phản hồi |
|----------|-----------|----------|
| **Critical** | Lộ mật khẩu/token | Ngay lập tức |
| **Critical** | Device giả mạo | Ngay lập tức |
| **High** | Truy cập trái phép | Trong 1h |
| **High** | Dữ liệu sai | Trong 4h |
| **Medium** | Mất tính toàn vẹn | Trong 24h |
| **Low** | Backup lỗi | Trong 48h |

### Quy trình phản ứng

```
1. Phát hiện (Detect)
      ↓
2. Phân loại (Classify)
      ↓
3. Cô lập (Isolate)
      ↓
4. Khóa quyền (Lock)
      ↓
5. Điều tra (Investigate)
      ↓
6. Khôi phục (Restore)
      ↓
7. Báo cáo (Report)
      ↓
8. Rút kinh nghiệm (Learn)
```

---

## 9.17 Security monitoring

### Theo dõi

| Loại | Mô tả |
|------|-------|
| Login bất thường | Failed attempts, unusual location |
| Request rate | Spike, unusual patterns |
| Truy cập trái quyền | Unauthorized access |
| Thay đổi config | Sensitive changes |
| Device bất thường | Unusual telemetry |
| Public trace | Excessive scanning |
| AI endpoint | Spam, abuse |

### Alert levels

| Level | Hành động |
|-------|----------|
| **Medium** | Email + In-app |
| **High** | Email + Slack + In-app |
| **Critical** | SMS + Email + Call |

---

## 9.18 Compliance readiness

### Sẵn sàng cho

| Loại kiểm tra | Mô tả |
|--------------|-------|
| Kiểm tra nội bộ | Internal audit |
| Kiểm toán khách hàng | Enterprise customer audit |
| Kiểm tra an toàn dữ liệu | Data safety audit |
| Kiểm tra traceability | Traceability audit |
| Kiểm tra vận hành | Operations audit |
| Kiểm tra thay đổi | Change management |

### Tài liệu cần có

| Tài liệu | Mô tả |
|----------|-------|
| Security policy | Chính sách bảo mật |
| Backup policy | Chính sách backup |
| Retention policy | Chính sách retention |
| Role matrix | Ma trận quyền |
| Audit procedure | Quy trình audit |
| Incident response | Quy trình phản ứng |
| Change management | Quản lý thay đổi |

---

## 9.19 Access review

### Định kỳ

| Tần suất | Nội dung |
|---------|----------|
| Hàng tháng | Tài khoản không hoạt động |
| Hàng quý | Quyền cao |
| Hàng quý | Thiết bị không dùng |
| Hàng quý | API keys |
| Hàng quý | Role tổng quan |

### Nguyên tắc

| Quy tắc | Hành động |
|---------|----------|
| Không hoạt động | Vô hiệu hóa |
| Quyền cao | Duyệt lại |
| Token cũ | Rotate/Revoke |
| Thiết bị cũ | Deactivate |

---

## 9.20 Export control

### Chính sách export

| Loại export | Yêu cầu |
|-------------|----------|
| PDF/Excel | Log đầy đủ |
| Watermark | Mã truy vết |
| Quyền export | Giới hạn |
| Nhạy cảm | Cần phê duyệt |

### Mã hóa file export

| Loại | Bảo vệ |
|------|--------|
| Báo cáo nhạy cảm | Password protection |
| Gửi qua kênh riêng | Secure channel |
| Object storage | Temporary access |

---

## 9.21 Third-party & integration security

### Tích hợp

| Dịch vụ | Credential |
|--------|------------|
| Weather API | API key riêng |
| SMS/Email | API key riêng |
| Payment | API key riêng |
| AI API | API key riêng |
| External logistics | API key riêng |
| Device gateway | Certificate |

### Yêu cầu

| Yêu cầu | Mô tả |
|---------|-------|
| Credential riêng | Mỗi tích hợp riêng |
| Scope giới hạn | Đúng mức cần |
| Logging | Metadata request/response |
| Circuit breaker | Retry + fallback |
| Fallback | Khi dịch vụ lỗi |

---

## 9.22 DevSecOps requirements

### CI Pipeline security checks

| Check | Mô tả |
|-------|-------|
| Dependency vuln | npm audit, snyk |
| Secrets scan | Trufflehog, gitleaks |
| Lint security | Security lint rules |
| SAST | Static analysis |
| Container scan | Clair, trivy |

### PR checklist

| Item | Required |
|------|----------|
| Input validation | ✅ |
| Permission check | ✅ |
| Audit log | ✅ |
| Secrets leak | ✅ |
| Data migration | ✅ |

---

## 9.23 Backup security

### Yêu cầu backup

| Yêu cầu | Mô tả |
|---------|-------|
| Mã hóa | AES-256 |
| Giới hạn quyền | Access control |
| Kiểm soát truy cập | Limited access |
| Restore test | Định kỳ |
| Không công khai | Private storage |

### Alert rules

| Rule | Hành động |
|------|----------|
| Backup lỗi | Email + SMS |
| Restore fail | Email + Alert |

---

## 9.24 Secure deletion

### Quy tắc xóa

| Loại | Quy tắc |
|------|---------|
| Theo chính sách | Retention policy |
| Không compliance | Legal hold |
| Ghi log | Audit log |
| Trong backup | Vòng đời tương ứng |

---

## 9.25 Security KPIs

| KPI | Target | Mô tả |
|-----|--------|-------|
| Số sự cố bảo mật | 0 | Critical incidents |
| Truy cập trái quyền | <5/tháng | Blocked unauthorized |
| Token rotation | >95% | Đúng hạn |
| Audit log đầy đủ | 100% | Complete logs |
| Phát hiện sự cố | <15 phút | MTTD |
| Cô lập sự cố | <30 phút | MTTI |
| Khôi phục dịch vụ | <4 giờ | MTTR |

---

## 9.26 Role responsibilities

| Role | Trách nhiệm |
|------|-------------|
| **Super Admin** | Cấu hình bảo mật, policy, duyệt sự cố nghiêm trọng |
| **Org Owner** | Duyệt quyền cao, compliance tổ chức |
| **Farm Manager** | User trong farm, audit farm |
| **Technician** | Device + security thiết bị |
| **Security/Admin** | Giám sát log, alert, backup, incident |

---

## 9.27 Release gates cho bảo mật

### Release criteria

| Gate | Required |
|------|----------|
| Permission errors | ✅ Không có |
| Secrets hardcode | ✅ Không có |
| Audit log | ✅ Hoạt động |
| Backup test | ✅ Pass |
| Migration test | ✅ Pass |
| Security smoke | ✅ Pass |

---

## Kết luận

Mục 9 biến EcoSynTech FarmOS PRO từ **một hệ thống có tính năng** thành **một hệ thống có thể kiểm soát, kiểm toán và thương mại hóa nghiêm túc**.

### Cốt lõi

| Yếu tố | Mô tả |
|---------|-------|
| Bảo vệ dữ liệu | Mã hóa, access control |
| Kiểm soát quyền | RBAC/ABAC, least privilege |
| Ghi vết đầy đủ | Audit log toàn bộ |
| Chuẩn kiểm toán | Compliance-ready |
| Giảm rủi ro | Defense in depth |

---

## Xem thêm

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [UIUX.md](./UIUX.md)
- [API.md](./API.md)
- [.github/workflows/](./.github/workflows/)
- [src/middleware/auth.js](./src/middleware/auth.js)
- [src/config/database.js](./src/config/database.js)