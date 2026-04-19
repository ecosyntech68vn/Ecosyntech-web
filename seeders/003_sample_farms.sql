-- EcoSynTech FarmOS PRO - Seeder 003: Sample Data
-- Version: 5.0.0
-- Created: 2026-04-19

-- Sample Admin User (password: admin123)
INSERT OR IGNORE INTO users (id, email, password, name, role, phone, created_at, updated_at) VALUES
('user-admin', 'admin@ecosyntech.com', '$2a$10$K7xNv5HxQxVxQzQxQzQxQ.OzQxQzQxQzQzQzQxQzQxQzQzQzQzQxQzQzQ', 'EcoSynTech Admin', 'admin', '0989516698', datetime('now'), datetime('now'));

-- Sample Farm
INSERT OR IGNORE INTO farms (id, org_id, name, name_vi, location, area_size, area_unit, status, created_at, updated_at) VALUES
('farm-demo', 'org-001', 'EcoSynTech Demo Farm', 'Nông trại mẫu EcoSynTech', 'Hồ Chí Minh', 10, 'hectare', 'active', datetime('now'), datetime('now'));

-- Sample Areas
INSERT OR IGNORE INTO areas (id, farm_id, name, name_vi, crop_type, status, created_at, updated_at) VALUES
('area-a1', 'farm-demo', 'A1', 'Khu A - Rau muống', 'vegetable', 'active', datetime('now'), datetime('now')),
('area-a2', 'farm-demo', 'A2', 'Khu A - Xà lách', 'vegetable', 'active', datetime('now'), datetime('now')),
('area-b1', 'farm-demo', 'B1', 'Khu B - Cà chua', 'vegetable', 'active', datetime('now'), datetime('now'));

-- Sample Devices
INSERT OR IGNORE INTO devices (id, farm_id, area_id, name, type, status, location, last_seen, created_at, updated_at) VALUES
('device-sensor-001', 'farm-demo', 'area-a1', 'Sensor A1-1', 'sensor', 'online', 'A1 - Góc Đông Bắc', datetime('now'), datetime('now'), datetime('now')),
('device-pump-001', 'farm-demo', 'area-a1', 'Pump A1-1', 'pump', 'online', 'A1 - Hệ thống tưới', datetime('now'), datetime('now')),
('device-sensor-002', 'farm-demo', 'area-b1', 'Sensor B1-1', 'sensor', 'online', 'B1 - Góc Tây Nam', datetime('now'), datetime('now'));

-- Sample Workers
INSERT OR IGNORE INTO workers (id, farm_id, name, role, phone, email, status, created_at, updated_at) VALUES
('worker-001', 'farm-demo', 'Nguyễn Văn A', 'Quản lý farm', '0912345678', 'nguyenvana@ecosyntech.com', 'active', datetime('now'), datetime('now')),
('worker-002', 'farm-demo', 'Trần Thị B', 'Nhân viên', '0912345679', 'tranthis@ecosyntech.com', 'active', datetime('now'));

-- Sample Rules
INSERT OR IGNORE INTO rules (id, farm_id, name, description, enabled, condition, action, cooldown_minutes, created_at, updated_at) VALUES
('rule-001', 'farm-demo', 'Tưới khi đất khô', 'Tưới tự động khi độ ẩm đất < 30%', 1, '{"type":"sensor","sensor_type":"soil","operator":"lt","value":30}', '{"type":"device","device_id":"device-pump-001","action":"on"}', 60, datetime('now'), datetime('now')),
('rule-002', 'farm-demo', 'Alert nhiệt cao', 'Cảnh báo khi nhiệt > 35°C', 1, '{"type":"sensor","sensor_type":"temperature","operator":"gt","value":35}', '{"type":"alert","severity":"critical","message":"Nhiệt độ cao!'}', 30, datetime('now'), datetime('now'));

-- Sample Sensors
INSERT OR IGNORE INTO sensors (id, device_id, type, name, value, unit, min_value, max_value, timestamp) VALUES
('sensor-temp', 'device-sensor-001', 'temperature', 'Nhiệt độ', 28, '°C', 20, 35, datetime('now')),
('sensor-humid', 'device-sensor-001', 'humidity', 'Độ ẩm', 75, '%', 50, 90, datetime('now')),
('sensor-soil', 'device-sensor-001', 'soil', 'Độ ẩm đất', 45, '%', 20, 85, datetime('now'));

-- Seeder Complete