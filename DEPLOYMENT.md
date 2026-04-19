# DEPLOYMENT & DEVOPS SPEC – EcoSynTech FarmOS PRO

## Mục lục
1. [Mục tiêu](#71-mục-tiêu)
2. [Nguyên tắc triển khai](#72-nguyên-tắc-triển-khai)
3. [Môi trường triển khai](#73-môi-trường-triển-khai)
4. [Kiến trúc triển khai](#74-kiến-trúc-triển-khai)
5. [Container strategy](#75-container-strategy)
6. [CI/CD pipeline](#76-cicd-pipeline)
7. [Deployment strategy](#77-deployment-strategy)
8. [Database migration policy](#78-database-migration-policy)
9. [Configuration management](#79-configuration-management)
10. [Secrets management](#710-secrets-management)
11. [Observability](#711-observability)
12. [Alerting](#712-alerting)
13. [Backup & Disaster Recovery](#713-backup--disaster-recovery)
14. [Security hardening](#714-security-hardening)
15. [Scalability policy](#715-scalability-policy)
16. [Job scheduling](#716-job-scheduling--background-processing)
17. [Release management](#717-release-management)
18. [Rollback plan](#718-rollback-plan)
19. [Testing strategy](#719-testing-strategy-trong-devops)
20. [Compliance & audit](#720-compliance--audit-readiness)
21. [Deployment phases](#721-deployment-phases)
22. [Operational runbook](#722-operational-runbook)
23. [KPI vận hành](#723-kpi-vận-hành-devops)

---

## 7.1 Mục tiêu

Mục này quy định cách hệ thống được:
- **Build**: đóng gói sản phẩm
- **Test**: kiểm tra chất lượng
- **Triển khai**: cài đặt lên môi trường
- **Giám sát**: theo dõi hoạt động
- **Backup**: sao lưu dữ liệu
- **Mở rộng**: scale hệ thống
- **Khôi phục**: restore khi có sự cố

**Mục tiêu cuối**: đảm bảo nền tảng:
- Chạy ổn định
- An toàn dữ liệu
- Dễ mở rộng đa farm / đa tenant
- Triển khai nhiều môi trường
- Vận hành theo chuẩn SaaS

---

## 7.2 Nguyên tắc triển khai

Hệ thống phải tuân thủ **6 nguyên tắc**:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Infrastructure as Code** | Toàn bộ hạ tầng phải khai báo bằng code (Docker, YAML, Terraform) |
| **Immutable Deployment** | Mỗi bản release là một image mới, không sửa trực tiếp máy chạy |
| **Zero/Low Downtime** | Nâng cấp không làm gián đoạn vận hành nông trại |
| **Rollback nhanh** | Có thể quay lại phiên bản trước trong vài phút |
| **Secure by Default** | Mặc định khóa an toàn, chỉ mở đúng quyền |
| **Observability-first** | Mọi phần quan trọng phải có log, metric, trace, alert |

---

## 7.3 Môi trường triển khai

Hệ thống cần **4 môi trường**:

### A. Development (`dev`)
- Dùng cho dev local
- Code nhanh, dữ liệu giả lập
- Chạy service rút gọn
- Không phụ thuộc production

### B. Staging (`staging`)
- Môi trường gần giống production
- Test tính năng mới
- Kiểm tra migration
- Test tích hợp IoT giả lập

### C. Production (`prod`)
- Môi trường thật
- Dữ liệu thật, thiết bị thật
- Farm thật
- Backup và monitoring đầy đủ

### D. Sandbox / Demo
- Demo khách hàng, POC, training
- Không ảnh hưởng dữ liệu production

---

## 7.4 Kiến trúc triển khai

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                              │
└────────────────────────┬──────────────────────────────���─────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              CDN / WAF / Load Balancer                        │
└────────────────────────┬────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Frontend App                          │
└────────────────────────┬────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                          │
└──────────────┬──────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────────┐
│                   Core Services                         │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Auth      │  FarmOS   │  IoT       │  AI        │
│  Service  │  Core    │  Ingestion │  Engine    │
├───────────┼──────────┼───────────┼───────────┤
│  Planning │  Trace   │  Notifi   │  Report   │
│  Engine   │  .Engine │  cation   │  Service  │
└─────┬─────┴────┬────┴─────┬─────┴────┬─────┬─────┘
      ↓          ↓         ↓         ↓        ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                          │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ PostgreSQL  │    Redis    │    MQTT    │  S3 Storage │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Gợi ý triển khai

| Component | Công nghệ |
|----------|-----------|
| Frontend | Static hosting hoặc container riêng |
| API | Containerized Node.js/Express |
| Database | PostgreSQL managed hoặc cluster riêng |
| MQTT Broker | EMQX / Mosquitto service riêng |
| Redis | Cache/Queue |
| Storage | S3-compatible object storage |
| Worker | Batch jobs, AI jobs, report jobs |

---

## 7.5 Container strategy

Toàn bộ service phải được container hóa.

### Container nhóm chính

| Container | Mô tả |
|-----------|-------|
| `web-frontend` | React/Next.js frontend |
| `api-gateway` | API Gateway / Auth |
| `farmos-core-service` | FarmOS Core API |
| `iot-ingestion-service` | MQTT ingestion |
| `ai-service` | AI Engine inference |
| `traceability-service` | Traceability Engine |
| `worker-service` | Background jobs |
| `scheduler-service` | Cron jobs |

### Dockerfile requirements

Mỗi container cần:
- Dockerfile riêng
- Healthcheck (`HEALTHCHECK`)
- Environment variables
- Log ra stdout/stderr
- Không lưu trạng thái cục bộ (stateless)

---

## 7.6 CI/CD pipeline

Pipeline chuẩn gồm **8 bước**:

```
┌──────────────────────────────────────────────────────────────┐
│                    1. LINT                         │
│   - Style, format, import, lint rules                    │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    2. TEST                           │
│   - Unit test, integration, API, permission, migration   │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    3. BUILD                          │
│   - Production bundle, Docker image, artifact         │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                 4. SECURITY SCAN                      │
│   - Dependency vuln, secret leak, container scan    │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                 5. DEPLOY STAGING                       │
│   - Triển khai bản build lên staging                   │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                 6. SMOKE TEST                         │
│   - Login, API chính, telemetry, dashboard, QR trace   │
└────────────────────────┬───────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│              7. APPROVE PRODUCTION                    │
│   - Manual approval hoặc auto Pass                   │
└────────────────────────┬─────────────────────────────���─���
                       ↓
┌──────────────────────────────────────────────────────────────┐
│              8. DEPLOY PRODUCTION                      │
│   - Rolling/Blue-Green/Canary deploy                   │
└──────────────────────────────────────────────────────────────┘
```

### GitHub Actions Workflow

Xem `.github/workflows/ci.yml` để triển khai.

---

## 7.7 Deployment strategy

### A. Rolling Deploy
- Triển khai từng phần
- Ít rủi ro, dễ áp dụng
- Phù hợp service không stateful

### B. Blue-Green Deploy
- Có 2 cụm: **blue** (bản đang chạy) + **green** (bản mới)
- Sau khi kiểm tra OK → switch traffic sang green

### C. Canary Deploy
- Đẩy bản mới cho một phần nhỏ user/farm trước
- Phù hợp hệ thống SaaS, giảm rủi ro

### Khuyến nghị cho EcoSynTech

| Component | Strategy |
|----------|---------|
| Frontend | Blue-Green |
| API | Rolling hoặc Canary |
| Worker jobs | Rolling |
| DB migration | Riêng, có kiểm soát |

---

## 7.8 Database migration policy

### Quy tắc quan trọng

- **Forward-compatible**: Migration phải tương thích chiều đi
- **Không xóa cột ngay trong release đầu**
- **Thêm cột trước → chuyển dữ liệu sau → xóa sau**
- **Phải có script rollback** nếu có thể

### Luồng chuẩn

```
1. Add new column/table
2. Deploy code mới dùng cả cũ và mới
3. Backfill dữ liệu
4. Chuyển toàn bộ sang schema mới
5. Remove schema cũ ở release sau
```

### Bắt buộc

- Backup trước migration lớn
- Test migration trên staging
- Ghi version migration rõ ràng

---

## 7.9 Configuration management

Tất cả config phải tách khỏi code.

### Nhóm cấu hình

| Nhóm | Ví dụ |
|------|-------|
| DB connection | `DATABASE_URL` |
| Redis | `REDIS_URL` |
| MQTT | `MQTT_BROKER_URL` |
| JWT secrets | `JWT_SECRET` |
| AI endpoint | `AI_API_URL` |
| Weather API | `OPENWEATHER_API_KEY` |
| Storage | `S3_BUCKET`, `S3_SECRET` |
| SMTP/SMS | `SMTP_HOST`, `SMS_API_KEY` |
| Feature flags | `ENABLE_AI`, `ENABLE_TRACEABILITY` |

### Nguyên tắc

- Dev dùng `.env`
- Staging/Prod dùng secret manager (AWS Secrets Manager, HashiCorp Vault)
- **Không commit secrets vào git**

---

## 7.10 Secrets management

### Các loại secret cần quản lý

- DB password
- JWT secret
- API keys (Weather, MQTT, AI)
- MQTT credentials
- Object storage access key
- Payment/billing keys
- Email gateway credentials
- Telegram/Zalo bot tokens

### Yêu cầu

- Mã hóa at rest
- Chỉ service cần mới được đọc
- Rotate định kỳ (90 ngày)
- Audit truy cập secret

---

## 7.11 Observability

### A. Logs

| Loại log | Mô tả |
|---------|-------|
| Request logs | HTTP request/response |
| Error logs | Lỗi ứng dụng |
| Auth logs | Đăng nhập, logout |
| Audit logs | Thay đổi quyền, data |
| Device ingestion logs | Telemetry từ IoT |

### B. Metrics

- API latency (p50, p95, p99)
- Error rate
- CPU / memory usage
- Telemetry throughput
- Job queue length
- DB connections
- Alert counts

### C. Traces

- Request trace end-to-end
- Trace qua các service liên quan
- Đặc biệt: log/plan AI/traceability

### D. Dashboards

- System dashboard
- Farm activity
- IoT health
- AI jobs
- Incident/alert
- Release status

---

## 7.12 Alerting

### Cảnh báo bắt buộc

| Alert | Ngưỡng | Kênh |
|-------|--------|------|
| API error tăng | > 5% trong 5p | Email, Slack |
| DB down | 0 connections | SMS, Email |
| MQTT disconnect | Device offline > 10% | Telegram |
| Telemetry backlog | Queue > 1000 | Slack |
| Worker chết | 0 workers | SMS |
| Queue đầy | > 80% | Slack |
| Disk gần đầy | > 85% | Email |
| Backup lỗi | Last backup > 24h | Email |
| AI job fail | Job failed | Slack |
| Traceability lookup chậm | > 3s | Slack |

### Kênh cảnh báo

- Email
- Telegram / Slack / Zalo OA
- Dashboard alert center
- **SMS cho sự cố nghiêm trọng**

---

## 7.13 Backup & Disaster Recovery

### Backup chính

| Loại backup | Tần suất | Retention |
|------------|----------|-----------|
| PostgreSQL snapshot | Hằng ngày | 7-14 ngày |
| Incremental backup | Mỗi giờ | 7 ngày |
| Object storage | Hằng ngày | 30 ngày |
| Config backup | Mỗi deploy | 30 ngày |
| Audit log archive | Hằng ngày | 12 tháng |

### Retention policy

- **Daily**: 7-14 ngày
- **Weekly**: 4-8 tuần
- **Monthly**: 6-12 tháng
- **Yearly**: Tùy chính sách doanh nghiệp

### DR mục tiêu

| Metric | Mục tiêu |
|--------|----------|
| **RPO** (Recovery Point Objective) | < 1 giờ |
| **RTO** (Recovery Time Objective) | < 4 giờ |

### Yêu cầu

- Có quy trình restore test định kỳ
- Backup không chỉ lưu mà phải restore thử được
- Document rõ ràng quy trình DR

---

## 7.14 Security hardening

### Bắt buộc

- HTTPS everywhere
- HSTS (HTTP Strict Transport Security)
- Secure cookies
- CSRF protection
- Rate limit (100 req/phút/user)
- Request validation
- RBAC enforcement
- Audit logging
- IP/device anomaly detection

### API Security

- JWT access token (15 phút)
- Refresh token an toàn (7 ngày)
- Revoke token khi cần
- API key riêng cho thiết bị/đối tác
- Hạn mức theo tenant

### IoT Security

- Device identity riêng
- Token ký riêng cho thiết bị
- Không cho thiết bị giả mạo farm khác
- Rotate credential thiết bị (90 ngày)

---

## 7.15 Scalability policy

### Scale theo lớp

| Layer | Scale strategy |
|-------|---------------|
| Frontend | Static/CDN scale dễ |
| API | Scale ngang (horizontal) |
| Worker | Scale theo queue length |
| MQTT | Scale theo số device/message rate |
| Database | Tối ưu index, partition, replica |

### Khi nào scale

- Số farm tăng > 100
- Số thiết bị tăng > 1000
- Telemetry tăng > 10K/phút
- Report jobs tăng > 100/day
- AI jobs tăng > 50/day

---

## 7.16 Job scheduling & Background processing

### Tác vụ chạy background

- Tổng hợp telemetry
- AI inference batch
- Report generation
- Reminder tasks
- Backup
- Sync data
- Send notifications
- Traceability indexing

### Yêu cầu Job queue

- Retry policy (3 lần, exponential backoff)
- Dead-letter queue
- Idempotency
- Rate limit theo tenant

---

## 7.17 Release management

### Versioning

Dùng **Semantic Versioning**:
```
major.minor.patch
Ví dụ: 5.0.0 → 5.1.0 → 5.1.1
```

### Release notes phải có

- Tính năng mới (Features)
- Bug fix
- Migration cần thiết
- Breaking change
- Rollback notes

### Phân loại release

| Loại | Mô tả |
|------|-------|
| Hotfix | Sửa lỗi khẩn cấp |
| Patch | Bug fix nhỏ |
| Feature | Tính năng mới |
| Major | Breaking change |

### Bắt buộc

- Tag git (`v5.0.0`)
- Build artifact có version
- Lưu changelog (`CHANGELOG.md`)

---

## 7.18 Rollback plan

### Khi nào rollback

- API lỗi hàng loạt
- Migration lỗi
- AI ra quyết định sai gây nguy hiểm
- Ingestion bị nghẽn
- Traceability lookup sai dữ liệu

### Quy tắc rollback

1. **Rollback app trước** nếu DB tương thích
2. Nếu migration phá vỡ schema → rollback theo playbook riêng
3. **Luôn có phiên bản ổn định trước đó** (stable tag)

### Rollback commands

```bash
# Rollback Docker tag
git checkout v4.x.x
docker-compose -f docker-compose-prod.yml up -d

# Rollback Database (nếu cần)
psql -f migrations/rollback_001.sql
```

---

## 7.19 Testing strategy trong DevOps

### Unit Test
- Logic nhỏ, pure function
- Permission rules
- Validation

### Integration Test
- API + DB
- API + Queue
- API + MQTT
- Traceability flow
- AI job flow

### End-to-end Test
1. Login
2. Tạo farm
3. Tạo asset
4. Ghi log
5. Sinh batch
6. Tạo QR
7. Public verify

### Load Test
- Số device lớn (1000+)
- Burst telemetry
- Nhiều user truy cập dashboard

### Security Test
- Auth bypass
- Injection (SQL, XSS)
- Privilege escalation
- Broken access control

---

## 7.20 Compliance & audit readiness

### Dữ liệu cần audit

| Hành động | Lưu log |
|-----------|---------|
| User login | ✅ |
| Chỉnh sửa asset | ✅ |
| Tạo log | ✅ |
| Tạo batch | ✅ |
| Đóng gói | ✅ |
| Xuất hàng | ✅ |
| Duyệt AI suggestion | ✅ |
| Thay đổi quyền | ✅ |

### Lưu ý

- Audit log **không nên sửa tùy tiện**
- Nên có cơ chế **lưu bất biến** hoặc **append-only**
- Xem `src/middleware/audit.js`

---

## 7.21 Deployment phases

### Phase 1 – MVP production
- ✅ Auth
- ✅ Farm core
- ✅ Basic assets/logs
- ✅ Frontend
- ✅ DB migration pipeline
- ✅ Backup cơ bản

### Phase 2 – IoT production
- ✅ MQTT ingestion
- ⏳ Telemetry pipeline
- ⏳ Alerting
- ⏳ Device management

### Phase 3 – FarmOS full core
- ⏳ Plans
- ⏳ Tasks
- ⏳ Quantities
- ⏳ RBAC hoàn chỉnh
- ⏳ Audit

### Phase 4 – AI + Traceability
- ✅ Inference jobs
- ✅ Recommendations
- ✅ Batch/QR/Shipment
- ✅ Public verification

### Phase 5 – Enterprise hardening
- ⏳ Multi-tenant scale
- ⏳ Blue-green/canary
- ⏳ Observability đầy đủ
- ⏳ DR drill
- ⏳ Compliance audit

---

## 7.22 Operational runbook

### Quick commands

```bash
# Deploy production
./deploy.sh prod

# Rollback
./rollback.sh v4.x.x

# Restore backup
./restore.sh backup_20240101

# Rotate secrets
./rotate-secrets.sh

# Restart MQTT (nếu lỗi)
docker-compose restart mqtt

# Clear cache
redis-cli FLUSHALL

# Kill stuck jobs
./jobs/kill-stuck.sh

# Reset tenant
./tenant/reset.sh <tenant_id>

# Lock suspect account
./security/lock.sh <user_id>
```

---

## 7.23 KPI vận hành DevOps

### System KPIs

| KPI | Mục tiêu |
|-----|----------|
| Uptime | > 99.9% |
| Latency (p95) | < 500ms |
| Error rate | < 0.1% |
| Deployment success | > 95% |
| MTTR (Mean Time To Recover) | < 30 phút |
| Backup success | > 99% |

### Product KPIs

| KPI | Mục tiêu |
|-----|----------|
| Telemetry processed | > 10K/phút |
| Alert delivery time | < 5 phút |
| QR lookup time | < 3 giây |
| AI response time | < 10 giây |
| Batch trace completeness | > 95% |

---

## Tóm tắt

Mục 7 biến EcoSynTech FarmOS PRO từ **"một sản phẩm có code"** thành **một hệ thống có thể vận hành thật, mở rộng thật, và bán SaaS thật**.

**Cốt lõi**:
- ✅ Build có kiểm soát
- ✅ Deploy an toàn
- ✅ Quan sát được
- ✅ Backup được
- ✅ Rollback được
- ✅ Scale được

---

## Xem thêm

- [Dockerfile](Dockerfile)
- [docker-compose.yml](docker-compose.yml)
- [.github/workflows/](.github/workflows/)
- [CHANGELOG.md](CHANGELOG.md)
- [SECURITY.md](SECURITY.md)