# SOP-E-01: QUẢN LÝ SMART AUTOMATION ENGINE
# Phiên bản: 1.0.0 | Ngày: 2026-04-22

---

## 1. MỤC ĐÍCH

Quy trình này hướng dẫn vận hành và quản lý SmartAutomationEngine - hệ thống AI tự động hóa của EcoSynTech FarmOS.

## 2. PHẠM VI

Áp dụng cho:
- IT Admin
- AI Operations Team
- System Operators

## 3. ĐỊNH NGHĨA

### 3.1 SmartAutomationEngine Components
- **AIManager**: 9 AI agents (5 agriculture + 4 system)
- **SkillOrchestrator**: Ánh xạ agent → skills
- **ContextualLearning**: Học từ kết quả
- **PredictiveAlerting**: Phát hiện bất thường (Z-score)
- **SelfOptimizingPipeline**: Tự tối ưu hóa

### 3.2 AI Agents
| Agent | Chức năng | Threshold |
|-------|-----------|-----------|
| irrigation | Tưới tiêu thông minh | soil < 20% |
| climate | Điều chỉnh theo thời tiết | temp > 34°C |
| soil_health | Chăm sóc đất | pH < 5.5 |
| energy_saver | Tiết kiệm năng lượng | power > 80% |
| pest_control | Phòng trừ sâu bệnh | pestRisk > 70% |
| system_health | Giám sát hệ thống | CPU > 90% |
| security_monitor | An ninh mạng | failedLogins ≥ 5 |
| performance_tuner | Tối ưu hiệu năng | responseTime > 2s |
| alert_aggregator | Giảm alert fatigue | alertCount > 20 |

## 4. QUY TRÌNH

### 4.1 Khởi động SmartAutomationEngine

```bash
# Kiểm tra trạng thái
node -e "const e = require('./src/services/smartAutomationEngine'); console.log(e.getSmartEngine().getStats())"

# Khởi động với context
node -e "
const { getSmartEngine } = require('./src/services/smartAutomationEngine');
const engine = getSmartEngine();
engine.enable();
console.log('SmartAutomationEngine enabled');
"
```

### 4.2 Giám sát AI Agents

```bash
# Lấy insights
node -e "
const { getSmartEngine } = require('./src/services/smartAutomationEngine');
const result = getSmartEngine().process({ cpu: 50, ram: 40 });
console.log(JSON.stringify(result.insights, null, 2));
"
```

### 4.3 Xử lý Predictive Alerts

1. **Phát hiện anomaly**:
   - Z-score > 2.5 = anomaly
   - Baseline: 1 giờ rolling window

2. **Hành động**:
   - Critical: Gửi alert ngay
   - Warning: Batch 15 phút
   - Info: Tổng hợp daily report

### 4.4 Contextual Learning

- Tự động ghi nhận kết quả actions
- Adapt thresholds sau 10+ records
- Xem insights:
```bash
node -e "console.log(JSON.stringify(require('./src/services/smartAutomationEngine').getSmartEngine().getStats().learning, null, 2))"
```

## 5. CHECKLIST VẬN HÀNH

| STT | Task | Tần suất | Người phụ trách |
|-----|------|----------|------------------|
| 1 | Kiểm tra AI stats | Mỗi ca | Operator |
| 2 | Review Predictive Alerts | 15 phút | Operator |
| 3 | Xem Contextual Learning insights | 1 giờ | AI Ops |
| 4 | Verify skill executions | 1 giờ | AI Ops |
| 5 | Review Pipeline analysis | 4 giờ | AI Ops |
| 6 | Generate Compliance Report | Daily | IT Admin |

## 6. TROUBLESHOOTING

### 6.1 AI Agents không hoạt động
```bash
# Kiểm tra AIManager
node -e "const {AIManager} = require('./src/services/AIManager'); console.log(new AIManager().agents.size)"
```

### 6.2 Skills không execute
```bash
# Kiểm tra SkillOrchestrator
node -e "const {getOrchestrator} = require('./src/services/skillOrchestrator'); console.log(JSON.stringify(getOrchestrator().getStats(), null, 2))"
```

### 6.3 Memory cao
- Kiểm tra cache: `getSmartEngine().pipeline.analyze()`
- Clear manual nếu cần: restart service

## 7. SECURITY CONSIDERATIONS

- ✅ AI decisions được log đầy đủ
- ✅ Context sanitized trước khi lưu
- ✅ Skills có timeout (5s max)
- ✅ Sensitive data masking trong logs

## 8. METRICS

| Metric | Target | Alert |
|--------|--------|-------|
| AI execution success | > 80% | < 60% |
| Predictive accuracy | > 75% | < 50% |
| Pipeline latency | < 500ms | > 2000ms |
| Skill success rate | > 85% | < 70% |

---

## APPROVAL

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Prepared by | AI Ops Team | 2026-04-22 | __________ |
| Approved by | IT Manager | 2026-04-22 | __________ |

---

*Document Classification: Internal*
*Next Review: 2026-05-22*
