const express = require('express');
const router = express.Router();

const mockData = {
  stats: {
    revenue: '125.5M',
    orders: 156,
    customers: 89,
    products: 234,
    devices: 156,
    devicesActive: 142,
    devicesOffline: 8,
    devicesMaintenance: 6,
    aiSkills: 228,
    aiModels: 7,
    predictions: 1234,
    accuracy: '94.5%',
    totalFarms: 5,
    totalArea: 25,
    totalRevenue: '180M'
  },
  
  devices: [
    { id: 'ESP32-001', name: 'ESP32 Sensor Kit', type: 'ESP32', location: 'Nông trại A - Vùng 1', status: 'active', battery: 85, rssi: -42, lastSeen: '1 phút trước', farm: 'Nông trại A' },
    { id: 'DHT22-001', name: 'DHT22 Sensor', type: 'Sensor', location: 'Nông trại A - Vùng 2', status: 'active', battery: 92, rssi: -55, lastSeen: '30 giây trước', farm: 'Nông trại A' },
    { id: 'Soil-003', name: 'Soil-Moist-003', type: 'Soil Moisture', location: 'Nông trại B - Vùng 1', status: 'offline', battery: 12, rssi: -98, lastSeen: '2 giờ trước', farm: 'Nông trại B' },
    { id: 'Light-004', name: 'Light Sensor', type: 'Light', location: 'Nông trại A - Vùng 3', status: 'maintenance', battery: 45, rssi: -67, lastSeen: '5 giờ trước', farm: 'Nông trại A' },
    { id: 'RPI-001', name: 'Raspberry Pi Gateway', type: 'Gateway', location: 'Trạm trung tâm', status: 'active', battery: 100, rssi: -30, lastSeen: '10 giây trước', farm: 'Nông trại A' }
  ],
  
  sensors: {
    temperature: { value: 28.5, unit: '°C', min: 24, max: 32, avg: 27 },
    humidity: { value: 72, unit: '%', min: 60, max: 85, avg: 70 },
    soilMoisture: { value: 45, unit: '%', min: 30, max: 60, avg: 48 },
    light: { value: 850, unit: 'lux', min: 100, max: 1200, avg: 650 },
    ph: { value: 6.8, unit: 'pH', min: 6.0, max: 7.5, avg: 6.5 },
    co2: { value: 420, unit: 'ppm', min: 350, max: 800, avg: 450 }
  },
  
  alerts: [
    { id: 1, type: 'critical', title: 'Thiết bị offline > 2 giờ', desc: 'Soil-Moist-003 tại Nông trại B không phản hồi', device: 'Soil-Moist-003', farm: 'Nông trại B', time: '2 giờ trước', status: 'pending' },
    { id: 2, type: 'critical', title: 'Pin yếu dưới 15%', desc: 'Thiết bị Light-004 sắp hết pin', device: 'Light-004', farm: 'Nông trại A', time: '5 giờ trước', status: 'pending' },
    { id: 3, type: 'critical', title: 'Nhiệt độ vượt ngưỡng', desc: 'Nhiệt độ 38°C vượt ngưỡng an toàn 35°C', device: 'DHT22-002', farm: 'Nông trại A', time: '1 giờ trước', status: 'pending' },
    { id: 4, type: 'warning', title: 'Độ ẩm đất thấp', desc: 'Độ ẩm đất 25% dưới ngưỡng 30%', device: 'Soil-001', farm: 'Nông trại A', time: '30 phút trước', status: 'pending' },
    { id: 5, type: 'warning', title: 'Tín hiệu yếu', desc: 'RSSI -95 dBm dưới ngưỡng -90 dBm', device: 'ESP32-005', farm: 'Nông trại B', time: '1 giờ trước', status: 'resolved' }
  ],
  
  automation: [
    { id: 1, name: 'Tưới nước tự động', trigger: 'IF độ ẩm đất < 30%', action: '→ Bật máy bơm', status: 'active', runs: 45 },
    { id: 2, name: 'Bật quạt khi nóng', trigger: 'IF nhiệt độ > 32°C', action: '→ Bật quạt làm mát', status: 'active', runs: 28 },
    { id: 3, name: 'Phun sương khi khô', trigger: 'IF độ ẩm không khí < 60%', action: '→ Phun sương 5 phút', status: 'active', runs: 15 },
    { id: 4, name: 'Cảnh báo pin yếu', trigger: 'IF pin < 20%', action: '→ Gửi cảnh báo', status: 'active', runs: 8 },
    { id: 5, name: 'Điều chỉnh đèn', trigger: 'IF ánh sáng < 500 lux', action: '→ Bật đèn grow light', status: 'paused', runs: 0 },
    { id: 6, name: 'Tưới theo lịch', trigger: 'IF 6:00 sáng', action: '→ Tưới 10 phút', status: 'paused', runs: 0 }
  ],
  
  maintenance: [
    { id: 1, type: 'high', title: 'Thay pin thiết bị Light-004', desc: 'Pin yếu, cần thay pin AAA', device: 'Light-004', farm: 'Nông trại A', status: 'pending', date: '26/04/2026' },
    { id: 2, type: 'high', title: 'Khắc phục thiết bị Soil-Moist-003', desc: 'Thiết bị offline, kiểm tra nguồn', device: 'Soil-Moist-003', farm: 'Nông trại B', status: 'in_progress', date: '26/04/2026' },
    { id: 3, type: 'medium', title: 'Vệ sinh cảm biến DHT22-005', desc: 'Cảm biến bụi bẩn', device: 'DHT22-005', farm: 'Nông trại A', status: 'pending', date: '25/04/2026' },
    { id: 4, type: 'low', title: 'Cập nhật firmware ESP32-008', desc: 'Cập nhật lên phiên bản mới', device: 'ESP32-008', farm: 'Nông trại A', status: 'done', date: '24/04/2026' }
  ],
  
  farms: [
    { id: 1, name: 'Nông trại A', location: 'Đà Lạt, Lâm Đồng', area: 8, devices: '52/55', revenue: '65M', status: 'active', color: '#10b981' },
    { id: 2, name: 'Nông trại B', location: 'Đức Trọng, Lâm Đồng', area: 6, devices: '38/42', revenue: '48M', status: 'warning', color: '#6366f1' },
    { id: 3, name: 'Nông trại C', location: 'Bảo Lộc, Lâm Đồng', area: 5, devices: '28/30', revenue: '35M', status: 'active', color: '#f59e0b' },
    { id: 4, name: 'Nông trại D', location: 'Di Linh, Lâm Đồng', area: 4, devices: '15/18', revenue: '22M', status: 'active', color: '#ec4899' },
    { id: 5, name: 'Nông trại E', location: 'Lạc Dương, Lâm Đồng', area: 2, devices: '9/11', revenue: '10M', status: 'active', color: '#14b8a6' }
  ],
  
  energy: {
    total: 24.5,
    solar: 18.2,
    grid: 6.3,
    battery: 92,
    savings: '2.4M',
    hourly: [20, 15, 10, 8, 12, 25, 45, 65, 80, 75, 60, 45]
  },
  
  traceability: [
    { id: 'RAU-2026-0426-001', name: 'Rau muống hữu cơ', farm: 'Nông trại A', date: '26/04/2026', status: 'sold' },
    { id: 'CAI-2026-0425-089', name: 'Cải ngọt hữu cơ', farm: 'Nông trại B', date: '25/04/2026', status: 'sold' },
    { id: 'XAL-2026-0425-088', name: 'Xà lách romaine', farm: 'Nông trại A', date: '25/04/2026', status: 'sold' }
  ],
  
  aiModels: [
    { name: 'MobileNetV3', type: 'Plant Disease', status: 'active', accuracy: 98 },
    { name: 'TinyWeedNet', type: 'Weed ID', status: 'active', accuracy: 95 },
    { name: 'YOLOv8n', type: 'Pest Detector', status: 'active', accuracy: 97 },
    { name: 'LSTM', type: 'Irrigation', status: 'active', accuracy: 92 },
    { name: 'LightGBM', type: 'Yield Predict', status: 'active', accuracy: 94 },
    { name: 'RandomForest', type: 'Anomaly', status: 'active', accuracy: 91 },
    { name: 'TFLite', type: 'Disease', status: 'error', accuracy: 0 }
  ],
  
  sales: {
    revenue: '125.5M',
    orders: 156,
    newCustomers: 23,
    conversion: 68,
    recentOrders: [
      { id: '#ORD-2024-156', customer: 'Công ty ABC', product: 'ESP32 Sensor Kit x5', total: 25000000, date: '26/04/2026', status: 'completed' },
      { id: '#ORD-2024-155', customer: 'Anh Minh', product: 'Raspberry Pi 4 x2', total: 8500000, date: '26/04/2026', status: 'shipping' },
      { id: '#ORD-2024-154', customer: 'Chị Hương', product: 'DHT22 Sensor x10', total: 1200000, date: '25/04/2026', status: 'pending' }
    ]
  },
  
  inventory: [
    { id: 'ESP32-001', name: 'ESP32 Sensor Kit', category: 'IoT Hardware', stock: 45, importPrice: 350000, sellPrice: 450000, status: 'available' },
    { id: 'DHT22-001', name: 'DHT22 Sensor', category: 'Cảm biến', stock: 120, importPrice: 45000, sellPrice: 65000, status: 'available' },
    { id: 'RPI4-001', name: 'Raspberry Pi 4', category: 'Single Board', stock: 8, importPrice: 3200000, sellPrice: 4200000, status: 'low' },
    { id: 'MQ135-001', name: 'MQ-135 Sensor', category: 'Cảm biến', stock: 0, importPrice: 55000, sellPrice: 80000, status: 'out' }
  ],
  
  marketing: {
    leads: 89,
    campaigns: 5,
    revenue: '45.2M',
    conversion: 12.3,
    recentLeads: [
      { id: '#LEAD-001', name: 'Công ty TNHH ABC', source: 'Facebook', status: 'new', date: '26/04/2026', potential: 'Cao' },
      { id: '#LEAD-002', name: 'Anh Nguyễn Văn A', source: 'Google', status: 'contacted', date: '25/04/2026', potential: 'Trung bình' },
      { id: '#LEAD-003', name: 'Công ty XYZ', source: 'Email', status: 'pending', date: '25/04/2026', potential: 'Cao' }
    ]
  },
  
  hr: {
    total: 45,
    working: 42,
    leave: 3,
    recruiting: 5,
    employees: [
      { id: 1, name: 'Nguyễn Văn A', email: 'nvana@email.com', department: 'IT', position: 'Senior Developer', joinDate: '01/03/2024', status: 'working' },
      { id: 2, name: 'Trần Thị B', email: 'ttb@email.com', department: 'Sales', position: 'Sales Manager', joinDate: '15/01/2024', status: 'working' },
      { id: 3, name: 'Lê Văn C', email: 'lvc@email.com', department: 'Marketing', position: 'Marketing Lead', joinDate: '20/02/2024', status: 'leave' }
    ]
  },
  
  system: {
    uptime: 99.9,
    responseTime: 45,
    memory: 384,
    memoryTotal: 512,
    cpu: 12,
    components: [
      { name: 'Web Server', health: 95 },
      { name: 'MQTT Broker', health: 98 },
      { name: 'Database', health: 92 },
      { name: 'Redis Cache', health: 88 },
      { name: 'Email Service', health: 100 },
      { name: 'Auth Service', health: 99 }
    ]
  }
};

router.get('/:type', (req, res) => {
  const { type } = req.params;
  
  switch(type) {
    case 'stats':
      res.json(mockData.stats);
      break;
    case 'devices':
      res.json(mockData.devices);
      break;
    case 'sensors':
      res.json(mockData.sensors);
      break;
    case 'alerts':
      res.json(mockData.alerts);
      break;
    case 'automation':
      res.json(mockData.automation);
      break;
    case 'maintenance':
      res.json(mockData.maintenance);
      break;
    case 'farms':
      res.json(mockData.farms);
      break;
    case 'energy':
      res.json(mockData.energy);
      break;
    case 'traceability':
      res.json(mockData.traceability);
      break;
    case 'ai':
      res.json({ models: mockData.aiModels, stats: { skills: mockData.stats.aiSkills, predictions: mockData.stats.predictions, accuracy: mockData.stats.accuracy } });
      break;
    case 'sales':
      res.json(mockData.sales);
      break;
    case 'inventory':
      res.json(mockData.inventory);
      break;
    case 'marketing':
      res.json(mockData.marketing);
      break;
    case 'hr':
      res.json(mockData.hr);
      break;
    case 'system':
      res.json(mockData.system);
      break;
    default:
      res.json(mockData);
  }
});

router.get('/api/stats', (req, res) => {
  res.json(mockData.stats);
});

router.get('/api/activities', (req, res) => {
  const activities = [
    { time: '10:30', action: 'Tạo đơn hàng mới #ORD-2024-156', user: 'Nguyễn Văn A', status: 'success' },
    { time: '10:15', action: 'Cập nhật tồn kho sản phẩm', user: 'Trần Thị B', status: 'success' },
    { time: '09:45', action: 'Chạy AI model dự đoán', user: 'Hệ thống', status: 'processing' },
    { time: '09:30', action: 'Gửi báo cáo hàng ngày', user: 'Hệ thống', status: 'success' },
    { time: '09:00', action: 'Tưới nước tự động', user: 'Automation', status: 'success' }
  ];
  res.json(activities);
});

module.exports = router;
