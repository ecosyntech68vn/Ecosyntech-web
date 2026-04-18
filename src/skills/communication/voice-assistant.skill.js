module.exports = {
  id: 'voice-assistant',
  name: 'Voice Assistant',
  description: 'Multi-function voice/TTS for reading guides, device config, text input, and system notifications',
  triggers: [
    'event:voice.read',
    'event:voice.guide',
    'event:voice.config',
    'event:voice.input',
    'event:voice.alert',
    'event:voice.confirm',
    'event:voice.help',
    'event:voice.admin',
    'event:voice.monitor',
    'event:voice.troubleshoot',
    'event:voice.userdata',
    'cron:5m'
  ],
  riskLevel: 'low',
  canAutoFix: false,
  run: function(ctx) {
    var event = ctx.event || {};
    var action = event.action || event.type?.replace('voice.', '') || 'read';
    var lang = event.lang || 'vi';
    
    var result = {
      ok: true,
      action: action,
      language: lang,
      timestamp: new Date().toISOString(),
      ttsOutput: null,
      guidanceSteps: [],
      inputPrompt: null,
      confirmationNeeded: false
    };
    
    switch (action) {
      case 'guide':
        result.guidanceSteps = this.generateGuide(event.topic, lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        break;
        
      case 'config':
        result.guidanceSteps = this.generateConfigGuide(event.deviceType, lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        result.confirmationNeeded = true;
        break;
        
      case 'admin':
        result.guidanceSteps = this.generateAdminGuide(event.topic, lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        break;
        
      case 'monitor':
        result.guidanceSteps = this.generateMonitorGuide(event.topic, lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        break;
        
      case 'troubleshoot':
        result.guidanceSteps = this.generateTroubleshootGuide(event.issue, lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        break;
        
      case 'userdata':
        result.ttsOutput = this.formatUserData(event.data, lang);
        break;
        
      case 'input':
        result.inputPrompt = this.generateInputPrompt(event.field, lang);
        result.ttsOutput = result.inputPrompt;
        break;
        
      case 'alert':
        result.ttsOutput = this.formatAlert(event.data, lang);
        break;
        
      case 'confirm':
        result.ttsOutput = this.generateConfirmation(event.message, lang);
        result.confirmationNeeded = true;
        break;
        
      case 'help':
        result.guidanceSteps = this.generateHelpTopics(lang);
        result.ttsOutput = this.generateTTS(result.guidanceSteps, lang);
        break;
        
      case 'read':
      default:
        result.ttsOutput = this.readContent(event.content, lang);
        break;
    }
    
    return result;
  },
  
  generateGuide: function(topic, lang) {
    var guides = {
      vi: {
        'setup': [
          { step: 1, text: 'Kết nối thiết bị với nguồn 12V', icon: '⚡' },
          { step: 2, text: 'Mở WiFi và kết nối tên EcoSynTech_XXX', icon: '📡' },
          { step: 3, text: 'Mở trình duyệt, truy cập địa chỉ 192.168.4.1', icon: '🌐' },
          { step: 4, text: 'Nhập thông tin WiFi gia đình và bấm lưu', icon: '✅' },
          { step: 5, text: 'Đợi 30 giây, thiết bị sẽ kết nối và bắt đầu gửi dữ liệu', icon: '🔄' }
        ],
        'sensor': [
          { step: 1, text: 'Cắm cảm biến vào cổng tương ứng (DHT22 → port 1, DS18B20 → port 2)', icon: '🔌' },
          { step: 2, text: 'Siết chặt đầu nối để đảm bảo tiếp xúc tốt', icon: '🔧' },
          { step: 3, text: 'Kiểm tra trên dashboard thấy dữ liệu cảm biến', icon: '📊' },
          { step: 4, text: 'Nếu không thấy dữ liệu, thử khởi động lại thiết bị', icon: '🔄' }
        ],
        'relay': [
          { step: 1, text: 'Kết nối thiết bị cần điều khiển với relay (tối đa 10A)', icon: '⚡' },
          { step: 2, text: 'Vào mục Điều khiển trên dashboard', icon: '🎛️' },
          { step: 3, text: 'Bật/tắt relay thủ công hoặc cấu hình tự động', icon: '✅' },
          { step: 4, text: 'Thiết lập rule tưới nước tự động theo độ ẩm đất', icon: '💧' }
        ],
        'alert': [
          { step: 1, text: 'Vào mục Cảnh báo trên dashboard', icon: '🔔' },
          { step: 2, text: 'Thêm ngưỡng cảnh báo mới', icon: '➕' },
          { step: 3, text: 'Chọn loại cảm biến, ngưỡng tối thiểu/tối đa', icon: '⚙️' },
          { step: 4, text: 'Bật thông báo Telegram để nhận cảnh báo', icon: '📱' }
        ],
        'qr': [
          { step: 1, text: 'Vào mục Truy xuất nguồn gốc', icon: '📦' },
          { step: 2, text: 'Tạo lô hàng mới với thông tin cây trồng', icon: '🌱' },
          { step: 3, text: 'Hệ thống sẽ tự động tạo mã QR', icon: '🔳' },
          { step: 4, text: 'In QR và dán lên sản phẩm', icon: '🖨️' },
          { step: 5, text: 'Khách hàng scan QR để xem toàn bộ journey', icon: '📱' }
        ],
        'welcome': [
          { step: 1, text: 'Chào mừng đến với EcoSynTech FARM OS!', icon: '🌱' },
          { step: 2, text: 'Hệ thống IoT nông nghiệp thông minh toàn diện', icon: '🚀' },
          { step: 3, text: 'Bạn có 58 skills tự động hóa sẵn sàng để hỗ trợ', icon: '⚙️' },
          { step: 4, text: 'Hãy khám phá dashboard và bắt đầu trồng trọt thông minh', icon: '📊' }
        ]
      },
      en: {
        'setup': [
          { step: 1, text: 'Connect device to 12V power', icon: '⚡' },
          { step: 2, text: 'Connect to WiFi network EcoSynTech_XXX', icon: '📡' },
          { step: 3, text: 'Open browser, go to 192.168.4.1', icon: '🌐' },
          { step: 4, text: 'Enter your home WiFi info and save', icon: '✅' },
          { step: 5, text: 'Wait 30 seconds, device will connect and send data', icon: '🔄' }
        ],
        'sensor': [
          { step: 1, text: 'Plug sensor into corresponding port (DHT22 → port 1)', icon: '🔌' },
          { step: 2, text: 'Tighten connectors for good contact', icon: '🔧' },
          { step: 3, text: 'Check dashboard for sensor data', icon: '📊' },
          { step: 4, text: 'If no data, try restarting the device', icon: '🔄' }
        ],
        'relay': [
          { step: 1, text: 'Connect device to relay (max 10A)', icon: '⚡' },
          { step: 2, text: 'Go to Control section on dashboard', icon: '🎛️' },
          { step: 3, text: 'Manual on/off or configure auto mode', icon: '✅' },
          { step: 4, text: 'Set up automatic irrigation rule based on soil moisture', icon: '💧' }
        ],
        'alert': [
          { step: 1, text: 'Go to Alerts section on dashboard', icon: '🔔' },
          { step: 2, text: 'Add new alert threshold', icon: '➕' },
          { step: 3, text: 'Select sensor type, min/max threshold', icon: '⚙️' },
          { step: 4, text: 'Enable Telegram notifications', icon: '📱' }
        ],
        'qr': [
          { step: 1, text: 'Go to Traceability section', icon: '📦' },
          { step: 2, text: 'Create new batch with crop info', icon: '🌱' },
          { step: 3, text: 'System will auto-generate QR code', icon: '🔳' },
          { step: 4, text: 'Print and attach QR to product', icon: '🖨️' },
          { step: 5, text: 'Customer scans QR to view full journey', icon: '📱' }
        ],
        'welcome': [
          { step: 1, text: 'Welcome to EcoSynTech FARM OS!', icon: '🌱' },
          { step: 2, text: 'Comprehensive IoT Smart Farming System', icon: '🚀' },
          { step: 3, text: 'You have 58 automation skills ready to assist', icon: '⚙️' },
          { step: 4, text: 'Explore the dashboard and start smart farming', icon: '📊' }
        ]
      },
      zh: {
        'setup': [
          { step: 1, text: '连接设备到12V电源', icon: '⚡' },
          { step: 2, text: '连接WiFi网络EcoSynTech_XXX', icon: '📡' },
          { step: 3, text: '打开浏览器，访问192.168.4.1', icon: '🌐' },
          { step: 4, text: '输入您的家庭WiFi信息并保存', icon: '✅' },
          { step: 5, text: '等待30秒，设备将连接并发送数据', icon: '🔄' }
        ],
        'sensor': [
          { step: 1, text: '将传感器插入对应端口 (DHT22 → 端口 1)', icon: '🔌' },
          { step: 2, text: '拧紧连接器以确保良好接触', icon: '🔧' },
          { step: 3, text: '在仪表板上检查传感器数据', icon: '📊' },
          { step: 4, text: '如果没有数据，请尝试重启设备', icon: '🔄' }
        ],
        'relay': [
          { step: 1, text: '将设备连接到继电器（最大10A）', icon: '⚡' },
          { step: 2, text: '进入仪表板的控制部分', icon: '🎛️' },
          { step: 3, text: '手动开关或配置自动模式', icon: '✅' },
          { step: 4, text: '根据土壤湿度设置自动灌溉规则', icon: '💧' }
        ],
        'alert': [
          { step: 1, text: '进入仪表板的警报部分', icon: '🔔' },
          { step: 2, text: '添加新的警报阈值', icon: '➕' },
          { step: 3, text: '选择传感器类型、最小/最大阈值', icon: '⚙️' },
          { step: 4, text: '启用Telegram通知', icon: '📱' }
        ],
        'qr': [
          { step: 1, text: '进入可追溯性部分', icon: '📦' },
          { step: 2, text: '创建新批次并填写作物信息', icon: '🌱' },
          { step: 3, text: '系统将自动生成二维码', icon: '🔳' },
          { step: 4, text: '打印并贴在产品上', icon: '🖨️' },
          { step: 5, text: '客户扫描二维码查看完整过程', icon: '📱' }
        ],
        'welcome': [
          { step: 1, text: '欢迎使用EcoSynTech FARM OS！', icon: '🌱' },
          { step: 2, text: '全面的物联网智慧农业系统', icon: '🚀' },
          { step: 3, text: '您拥有58个自动化技能随时待命', icon: '⚙️' },
          { step: 4, text: '探索仪表板并开始智慧农业', icon: '📊' }
        ]
      }
    };
    
    var langGuides = guides[lang] || guides.vi;
    return langGuides[topic] || langGuides['setup'];
  },
  
  generateConfigGuide: function(deviceType, lang) {
    var configs = {
      vi: {
        'esp32': [
          { step: 1, text: 'Chọn chế độ WiFi: Station hoặc Access Point', icon: '📡' },
          { step: 2, text: 'Nhập SSID và mật khẩu WiFi', icon: '🔑' },
          { step: 3, text: 'Cấu hình MQTT broker (nếu dùng)', icon: '🔗' },
          { step: 4, text: 'Đặt interval gửi dữ liệu (mặc định 10 phút)', icon: '⏱️' },
          { step: 5, text: 'Cấu hình ngưỡng cảnh báo cho từng cảm biến', icon: '⚠️' },
          { step: 6, text: 'Lưu cấu hình và khởi động lại', icon: '✅' }
        ],
        'dht22': [
          { step: 1, text: 'Kết nối chân VCC → 3.3V', icon: '🔌' },
          { step: 2, text: 'Kết nối chân GND → GND', icon: '🔌' },
          { step: 3, text: 'Kết nối chân Data → GPIO (cấu hình trong dashboard)', icon: '📊' },
          { step: 4, text: 'Thêm cảm biến vào danh sách thiết bị', icon: '➕' },
          { step: 5, text: 'Đặt tên và vị trí cảm biến', icon: '✏️' }
        ],
        'relay': [
          { step: 1, text: 'Kết nối relay vào cổng GPIO tương ứng', icon: '🔌' },
          { step: 2, text: 'Đặt tên cho thiết bị (máy bơm, đèn...)', icon: '✏️' },
          { step: 3, text: 'Cấu hình chế độ: thủ công hoặc tự động', icon: '⚙️' },
          { step: 4, text: 'Nếu tự động: thiết lập điều kiện kích hoạt', icon: '🔄' },
          { step: 5, text: 'Đặt thời gian tắt tự động (nếu cần)', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: 'Xác định loại thiết bị cần cấu hình', icon: '📋' },
          { step: 2, text: 'Kết nối thiết bị theo hướng dẫn', icon: '🔗' },
          { step: 3, text: 'Thêm thiết bị trong dashboard', icon: '➕' },
          { step: 4, text: 'Cấu hình các thông số cần thiết', icon: '⚙️' },
          { step: 5, text: 'Kiểm tra hoạt động và lưu cấu hình', icon: '✅' }
        ]
      },
      en: {
        'esp32': [
          { step: 1, text: 'Select WiFi mode: Station or Access Point', icon: '📡' },
          { step: 2, text: 'Enter WiFi SSID and password', icon: '🔑' },
          { step: 3, text: 'Configure MQTT broker (if using)', icon: '🔗' },
          { step: 4, text: 'Set data sending interval (default 10 min)', icon: '⏱️' },
          { step: 5, text: 'Configure alert thresholds for each sensor', icon: '⚠️' },
          { step: 6, text: 'Save config and restart', icon: '✅' }
        ],
        'dht22': [
          { step: 1, text: 'Connect VCC pin → 3.3V', icon: '🔌' },
          { step: 2, text: 'Connect GND pin → GND', icon: '🔌' },
          { step: 3, text: 'Connect Data pin → GPIO (configure in dashboard)', icon: '📊' },
          { step: 4, text: 'Add sensor to device list', icon: '➕' },
          { step: 5, text: 'Set sensor name and location', icon: '✏️' }
        ],
        'relay': [
          { step: 1, text: 'Connect relay to corresponding GPIO port', icon: '🔌' },
          { step: 2, text: 'Name device (pump, light...)', icon: '✏️' },
          { step: 3, text: 'Configure mode: manual or auto', icon: '⚙️' },
          { step: 4, text: 'If auto: set trigger conditions', icon: '🔄' },
          { step: 5, text: 'Set auto-off timer (if needed)', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: 'Identify device type to configure', icon: '📋' },
          { step: 2, text: 'Connect device following guide', icon: '🔗' },
          { step: 3, text: 'Add device in dashboard', icon: '➕' },
          { step: 4, text: 'Configure required parameters', icon: '⚙️' },
          { step: 5, text: 'Test and save configuration', icon: '✅' }
        ]
      },
      zh: {
        'esp32': [
          { step: 1, text: '选择WiFi模式：终端或接入点', icon: '📡' },
          { step: 2, text: '输入WiFi名称和密码', icon: '🔑' },
          { step: 3, text: '配置MQTT代理（如果使用）', icon: '🔗' },
          { step: 4, text: '设置数据发送间隔（默认10分钟）', icon: '⏱️' },
          { step: 5, text: '为每个传感器配置警报阈值', icon: '⚠️' },
          { step: 6, text: '保存配置并重启', icon: '✅' }
        ],
        'dht22': [
          { step: 1, text: '连接VCC引脚 → 3.3V', icon: '🔌' },
          { step: 2, text: '连接GND引脚 → GND', icon: '🔌' },
          { step: 3, text: '连接数据引脚 → GPIO（在仪表板配置）', icon: '📊' },
          { step: 4, text: '将传感器添加到设备列表', icon: '➕' },
          { step: 5, text: '设置传感器名称和位置', icon: '✏️' }
        ],
        'relay': [
          { step: 1, text: '将继电器连接到对应的GPIO端口', icon: '🔌' },
          { step: 2, text: '为设备命名（水泵、灯...）', icon: '✏️' },
          { step: 3, text: '配置模式：手动或自动', icon: '⚙️' },
          { step: 4, text: '如果自动：设置触发条件', icon: '🔄' },
          { step: 5, text: '设置自动关闭计时器（如需要）', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: '确定要配置的设备类型', icon: '📋' },
          { step: 2, text: '按照指南连接设备', icon: '🔗' },
          { step: 3, text: '在仪表板添加设备', icon: '➕' },
          { step: 4, text: '配置所需参数', icon: '⚙️' },
          { step: 5, text: '测试并保存配置', icon: '✅' }
        ]
      }
    };
    
    var langConfigs = configs[lang] || configs.vi;
    return langConfigs[deviceType] || langConfigs['default'];
  },
  
  generateInputPrompt: function(field, lang) {
    var prompts = {
      vi: {
        'wifi_ssid': 'Vui lòng nói tên WiFi của bạn',
        'wifi_password': 'Vui lòng nói mật khẩu WiFi',
        'device_name': 'Vui lòng nói tên thiết bị',
        'batch_code': 'Vui lòng nói mã lô hàng',
        'crop_type': 'Vui lòng nói loại cây trồng',
        'threshold': 'Vui lòng nói giá trị ngưỡng',
        'phone': 'Vui lòng nói số điện thoại',
        'confirm': 'Xác nhận thao tác này? Nói "có" để đồng ý, "không" để hủy'
      },
      en: {
        'wifi_ssid': 'Please say your WiFi name',
        'wifi_password': 'Please say your WiFi password',
        'device_name': 'Please say the device name',
        'batch_code': 'Please say the batch code',
        'crop_type': 'Please say the crop type',
        'threshold': 'Please say the threshold value',
        'phone': 'Please say the phone number',
        'confirm': 'Confirm this action? Say "yes" to confirm, "no" to cancel'
      },
      zh: {
        'wifi_ssid': '请说出您的WiFi名称',
        'wifi_password': '请说出您的WiFi密码',
        'device_name': '请说出设备名称',
        'batch_code': '请说出批次代码',
        'crop_type': '请说出作物类型',
        'threshold': '请说出阈值',
        'phone': '请说出电话号码',
        'confirm': '确认此操作？请说"是"确认，"否"取消'
      }
    };
    
    var langPrompts = prompts[lang] || prompts.vi;
    return langPrompts[field] || langPrompts['confirm'];
  },
  
  formatAlert: function(data, lang) {
    var alerts = {
      vi: {
        'critical': 'Cảnh báo nghiêm trọng! ',
        'high': 'Cảnh báo cao! ',
        'medium': 'Cảnh báo: ',
        'low': 'Thông báo: '
      },
      en: {
        'critical': 'Critical alert! ',
        'high': 'High priority alert! ',
        'medium': 'Alert: ',
        'low': 'Notification: '
      },
      zh: {
        'critical': '严重警报！',
        'high': '高优先级警报！',
        'medium': '警报：',
        'low': '通知：'
      }
    };
    
    var langAlerts = alerts[lang] || alerts.vi;
    var severity = data?.severity || 'medium';
    var message = data?.message || data?.alert || '';
    
    return langAlerts[severity] + message;
  },
  
  generateConfirmation: function(message, lang) {
    var confirms = {
      vi: 'Xác nhận: ' + message + '. Nói "có" để đồng ý, "không" để hủy.',
      en: 'Confirm: ' + message + '. Say "yes" to confirm, "no" to cancel.',
      zh: '确认：' + message + '。请说"是"确认，"否"取消。'
    };
    
    return confirms[lang] || confirms.vi;
  },
  
  generateHelpTopics: function(lang) {
    var topics = {
      vi: [
        { step: 1, text: 'Cấu hình thiết bị - Hướng dẫn kết nối WiFi, cảm biến, relay', icon: '⚙️' },
        { step: 2, text: 'Thêm cảm biến - Cách thêm và cấu hình cảm biến mới', icon: '📡' },
        { step: 3, text: 'Thiết lập cảnh bào - Tạo ngưỡng cảnh báo và thông báo', icon: '🔔' },
        { step: 4, text: 'Tạo QR truy xuất - Tạo mã QR cho lô hàng', icon: '🔳' },
        { step: 5, text: 'Điều khiển thiết bị - Bật/tắt relay, thiết lập tự động', icon: '🎛️' },
        { step: 6, text: 'Xem báo cáo - Truy cập dữ liệu và xuất báo cáo', icon: '📊' }
      ],
      en: [
        { step: 1, text: 'Device config - Guide to connect WiFi, sensors, relays', icon: '⚙️' },
        { step: 2, text: 'Add sensor - How to add and configure new sensor', icon: '📡' },
        { step: 3, text: 'Set alerts - Create threshold alerts and notifications', icon: '🔔' },
        { step: 4, text: 'Create QR code - Generate QR for batch', icon: '🔳' },
        { step: 5, text: 'Control devices - On/off relays, set automation', icon: '🎛️' },
        { step: 6, text: 'View reports - Access data and export reports', icon: '📊' }
      ],
      zh: [
        { step: 1, text: '设备配置 - 连接WiFi、传感器、继电器的指南', icon: '⚙️' },
        { step: 2, text: '添加传感器 - 如何添加和配置新传感器', icon: '📡' },
        { step: 3, text: '设置警报 - 创建阈值警报和通知', icon: '🔔' },
        { step: 4, text: '创建二维码 - 为批次生成二维码', icon: '🔳' },
        { step: 5, text: '控制设备 - 开关继电器、设置自动化', icon: '🎛️' },
        { step: 6, text: '查看报告 - 访问数据和导出报告', icon: '📊' }
      ]
    };
    
    return topics[lang] || topics.vi;
  },
  
  readContent: function(content, lang) {
    if (!content) return '';
    var str = String(content);
    if (str.length > 500) {
      str = str.substring(0, 497) + '...';
    }
    return str;
  },
  
  generateTTS: function(steps, lang) {
    var prefix = {
      vi: 'Hướng dẫn: ',
      en: 'Guide: ',
      zh: '指南：'
    };
    
    var texts = steps.map(function(s) {
      return s.step + '. ' + s.text;
    }).join('. ');
    
    return (prefix[lang] || prefix.vi) + texts;
  },
  
  generateAdminGuide: function(topic, lang) {
    var docs = {
      vi: {
        'skill': [
          { step: 1, text: 'Vào mục Skills trên dashboard', icon: '⚙️' },
          { step: 2, text: 'Xem danh sách 59 skills đã cài đặt', icon: '📋' },
          { step: 3, text: 'Bật/tắt skill bằng toggle', icon: '🔄' },
          { step: 4, text: 'Xem logs của từng skill để theo dõi', icon: '📊' },
          { step: 5, text: 'Cấu hình skill parameters trong file cấu hình', icon: '⚙️' }
        ],
        'system': [
          { step: 1, text: 'Vào mục Quản trị hệ thống', icon: '🎛️' },
          { step: 2, text: 'Xem thông số server: CPU, RAM, Network', icon: '💻' },
          { step: 3, text: 'Xem logs hệ thống để phát hiện lỗi', icon: '📝' },
          { step: 4, text: 'Restart services nếu cần thiết', icon: '🔄' },
          { step: 5, text: 'Backup dữ liệu định kỳ', icon: '💾' }
        ],
        'user': [
          { step: 1, text: 'Vào mục Người dùng', icon: '👥' },
          { step: 2, text: 'Thêm người dùng mới với quyền tương ứng', icon: '➕' },
          { step: 3, text: 'Phân quyền: Admin, Operator, Viewer', icon: '🔐' },
          { step: 4, text: 'Reset mật khẩu nếu cần', icon: '🔑' },
          { step: 5, text: 'Xem logs hoạt động của người dùng', icon: '📊' }
        ],
        'backup': [
          { step: 1, text: 'Vào mục Sao lưu', icon: '💾' },
          { step: 2, text: 'Tạo backup thủ công hoặc để scheduler tự động', icon: '⏰' },
          { step: 3, text: 'Chọn destination: local hoặc cloud', icon: '☁️' },
          { step: 4, text: 'Tải file backup về máy', icon: '⬇️' },
          { step: 5, text: 'Restore khi cần thiết', icon: '🔄' }
        ],
        'default': [
          { step: 1, text: 'Vào mục Quản trị trên dashboard', icon: '🎛️' },
          { step: 2, text: 'Chọn mục cần quản lý', icon: '📋' },
          { step: 3, text: 'Thực hiện thao tác cần thiết', icon: '⚙️' },
          { step: 4, text: 'Kiểm tra kết quả', icon: '✅' }
        ]
      },
      en: {
        'skill': [
          { step: 1, text: 'Go to Skills section', icon: '⚙️' },
          { step: 2, text: 'View 59 installed skills', icon: '📋' },
          { step: 3, text: 'Toggle skill on/off', icon: '🔄' },
          { step: 4, text: 'View logs per skill', icon: '📊' },
          { step: 5, text: 'Configure in config file', icon: '⚙️' }
        ],
        'system': [
          { step: 1, text: 'Go to System Admin', icon: '🎛️' },
          { step: 2, text: 'View server stats: CPU, RAM, Network', icon: '💻' },
          { step: 3, text: 'View system logs for errors', icon: '📝' },
          { step: 4, text: 'Restart services if needed', icon: '🔄' },
          { step: 5, text: 'Backup data regularly', icon: '💾' }
        ],
        'user': [
          { step: 1, text: 'Go to Users section', icon: '👥' },
          { step: 2, text: 'Add new user with role', icon: '➕' },
          { step: 3, text: 'Assign roles: Admin, Operator, Viewer', icon: '🔐' },
          { step: 4, text: 'Reset password if needed', icon: '🔑' },
          { step: 5, text: 'View user activity logs', icon: '📊' }
        ],
        'backup': [
          { step: 1, text: 'Go to Backup section', icon: '💾' },
          { step: 2, text: 'Manual or auto scheduler backup', icon: '⏰' },
          { step: 3, text: 'Choose destination: local or cloud', icon: '☁️' },
          { step: 4, text: 'Download backup file', icon: '⬇️' },
          { step: 5, text: 'Restore when needed', icon: '🔄' }
        ],
        'default': [
          { step: 1, text: 'Go to Admin dashboard', icon: '🎛️' },
          { step: 2, text: 'Select manage section', icon: '📋' },
          { step: 3, text: 'Perform action', icon: '⚙️' },
          { step: 4, text: 'Verify result', icon: '✅' }
        ]
      },
      zh: {
        'skill': [
          { step: 1, text: '进入技能部分', icon: '⚙️' },
          { step: 2, text: '查看已安装的59个技能', icon: '📋' },
          { step: 3, text: '切换技能开关', icon: '🔄' },
          { step: 4, text: '查看每个技能的日志', icon: '📊' },
          { step: 5, text: '在配置文件中配置', icon: '⚙️' }
        ],
        'system': [
          { step: 1, text: '进入系统管理', icon: '🎛️' },
          { step: 2, text: '查看服务器状态：CPU、RAM、网络', icon: '💻' },
          { step: 3, text: '查看系统日志以发现错误', icon: '📝' },
          { step: 4, text: '如需要重启服务', icon: '🔄' },
          { step: 5, text: '定期备份数据', icon: '💾' }
        ],
        'user': [
          { step: 1, text: '进入用户部分', icon: '👥' },
          { step: 2, text: '添加新用户并分配角色', icon: '➕' },
          { step: 3, text: '分配角色：管理员、操作员、查看者', icon: '🔐' },
          { step: 4, text: '如需要重置密码', icon: '🔑' },
          { step: 5, text: '查看用户活动日志', icon: '📊' }
        ],
        'backup': [
          { step: 1, text: '进入备份部分', icon: '💾' },
          { step: 2, text: '手动或自动计划备份', icon: '⏰' },
          { step: 3, text: '选择目标：本地或云', icon: '☁️' },
          { step: 4, text: '下载备份文件', icon: '⬇️' },
          { step: 5, text: '需要时恢复', icon: '🔄' }
        ],
        'default': [
          { step: 1, text: '进入管理仪表板', icon: '🎛️' },
          { step: 2, text: '选择管理部分', icon: '📋' },
          { step: 3, text: '执行操作', icon: '⚙️' },
          { step: 4, text: '验证结果', icon: '✅' }
        ]
      }
    };
    
    var langDocs = docs[lang] || docs.vi;
    return langDocs[topic] || langDocs['default'];
  },
  
  generateMonitorGuide: function(topic, lang) {
    var monitors = {
      vi: {
        'realtime': [
          { step: 1, text: 'Vào mục Giám sát thời gian thực', icon: '👁️' },
          { step: 2, text: 'Xem dữ liệu cảm biến mới nhất', icon: '📊' },
          { step: 3, text: 'Xem trạng thái relay hiện tại', icon: '🎛️' },
          { step: 4, text: 'Theo dõi tải server', icon: '💻' }
        ],
        'history': [
          { step: 1, text: 'Vào mục Lịch sử dữ liệu', icon: '📜' },
          { step: 2, text: 'Chọn khoảng thời gian', icon: '⏰' },
          { step: 3, text: 'Chọn cảm biến cần xem', icon: '📡' },
          { step: 4, text: 'Xem biểu đồ dữ liệu', icon: '📈' }
        ],
        'alert': [
          { step: 1, text: 'Vào mục Cảnh báo', icon: '🔔' },
          { step: 2, text: 'Xem danh sách cảnh báo', icon: '📋' },
          { step: 3, text: 'Lọc theo mức độ nghiêm trọng', icon: '⚠️' },
          { step: 4, text: 'Xem chi tiết và xử lý', icon: '🔧' }
        ],
        'device': [
          { step: 1, text: 'Vào mục Thiết bị', icon: '���' },
          { step: 2, text: 'Xem danh sách thiết bị', icon: '📋' },
          { step: 3, text: 'Xem trạng thái online/offline', icon: '🟢' },
          { step: 4, text: 'Xem thời gian hoạt động', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: 'Vào mục Giám sát', icon: '👁️' },
          { step: 2, text: 'Chọn loại giám sát', icon: '📊' },
          { step: 3, text: 'Xem dữ liệu', icon: '📈' },
          { step: 4, text: 'Xuất báo cáo nếu cần', icon: '📄' }
        ]
      },
      en: {
        'realtime': [
          { step: 1, text: 'Go to Real-time Monitor', icon: '👁️' },
          { step: 2, text: 'View latest sensor data', icon: '📊' },
          { step: 3, text: 'View current relay status', icon: '🎛️' },
          { step: 4, text: 'Monitor server load', icon: '💻' }
        ],
        'history': [
          { step: 1, text: 'Go to Data History', icon: '📜' },
          { step: 2, text: 'Select time range', icon: '⏰' },
          { step: 3, text: 'Select sensor to view', icon: '📡' },
          { step: 4, text: 'View data chart', icon: '📈' }
        ],
        'alert': [
          { step: 1, text: 'Go to Alerts', icon: '🔔' },
          { step: 2, text: 'View alert list', icon: '📋' },
          { step: 3, text: 'Filter by severity', icon: '⚠️' },
          { step: 4, text: 'View details and handle', icon: '🔧' }
        ],
        'device': [
          { step: 1, text: 'Go to Devices', icon: '📱' },
          { step: 2, text: 'View device list', icon: '📋' },
          { step: 3, text: 'View online/offline status', icon: '🟢' },
          { step: 4, text: 'View uptime', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: 'Go to Monitoring', icon: '👁️' },
          { step: 2, text: 'Select monitor type', icon: '📊' },
          { step: 3, text: 'View data', icon: '📈' },
          { step: 4, text: 'Export report if needed', icon: '📄' }
        ]
      },
      zh: {
        'realtime': [
          { step: 1, text: '进入实时监控', icon: '👁️' },
          { step: 2, text: '查看最新传感器数据', icon: '📊' },
          { step: 3, text: '查看当前继电器状态', icon: '🎛️' },
          { step: 4, text: '监控服务器负载', icon: '💻' }
        ],
        'history': [
          { step: 1, text: '进入数据历史', icon: '📜' },
          { step: 2, text: '选择时间范围', icon: '⏰' },
          { step: 3, text: '选择要查看的传感器', icon: '📡' },
          { step: 4, text: '查看数据图表', icon: '📈' }
        ],
        'alert': [
          { step: 1, text: '进入警报', icon: '🔔' },
          { step: 2, text: '查看警报列表', icon: '📋' },
          { step: 3, text: '按严重程度筛选', icon: '⚠️' },
          { step: 4, text: '查看详情并处理', icon: '🔧' }
        ],
        'device': [
          { step: 1, text: '进入设备', icon: '📱' },
          { step: 2, text: '查看设备列表', icon: '📋' },
          { step: 3, text: '查看在线/离线状态', icon: '🟢' },
          { step: 4, text: '查看运行时间', icon: '⏱️' }
        ],
        'default': [
          { step: 1, text: '进入监控', icon: '👁️' },
          { step: 2, text: '选择监控类型', icon: '📊' },
          { step: 3, text: '查看数据', icon: '📈' },
          { step: 4, text: '如需要导出报告', icon: '📄' }
        ]
      }
    };
    
    var langMonitors = monitors[lang] || monitors.vi;
    return langMonitors[topic] || langMonitors['default'];
  },
  
  generateTroubleshootGuide: function(issue, lang) {
    var fixes = {
      vi: {
        'no_data': [
          { step: 1, text: 'Kiểm tra kết nối cảm biến', icon: '🔌' },
          { step: 2, text: 'Khởi động lại thiết bị', icon: '🔄' },
          { step: 3, text: 'Kiểm tra cổng GPIO', icon: '⚙️' },
          { step: 4, text: 'Thử thay cảm biến khác', icon: '🔁' },
          { step: 5, text: 'Liên hệ hỗ trợ nếu không được', icon: '📞' }
        ],
        'offline': [
          { step: 1, text: 'Kiểm tra nguồn điện', icon: '⚡' },
          { step: 2, text: 'Kiểm tra WiFi', icon: '📡' },
          { step: 3, text: 'Khởi động lại thiết bị', icon: '🔄' },
          { step: 4, text: 'Kiểm tra cấu hình mạng', icon: '⚙️' },
          { step: 5, text: 'Reset về factory defaults', icon: '🏠' }
        ],
        'relay_not_work': [
          { step: 1, text: 'Kiểm tra relay có kết nối không', icon: '🔌' },
          { step: 2, text: 'Kiểm tra tải (max 10A)', icon: '⚡' },
          { step: 3, text: 'Thử bật/tắt thủ công', icon: '🎛️' },
          { step: 4, text: 'Kiểm tra rule cấu hình', icon: '⚙️' },
          { step: 5, text: 'Thay relay mới nếu hỏng', icon: '🔁' }
        ],
        'alert_not_sent': [
          { step: 1, text: 'Kiểm tra cấu hình Telegram', icon: '📱' },
          { step: 2, text: 'Kiểm tra bot token', icon: '🔑' },
          { step: 3, text: 'Thử gửi test message', icon: '✉️' },
          { step: 4, text: 'Kiểm tra ngưỡng cảnh báo', icon: '⚠️' },
          { step: 5, text: 'Kiểm tra network', icon: '🌐' }
        ],
        'high_cpu': [
          { step: 1, text: 'Xem processes đang chạy', icon: '📊' },
          { step: 2, text: 'Kiểm tra logs', icon: '📝' },
          { step: 3, text: 'Restart services', icon: '🔄' },
          { step: 4, text: 'Tăng RAM nếu cần', icon: '💻' },
          { step: 5, text: 'Liên hệ support', icon: '📞' }
        ],
        'default': [
          { step: 1, text: 'Xem chi tiết lỗi trong logs', icon: '📝' },
          { step: 2, text: 'Thử khởi động lại thiết bị', icon: '🔄' },
          { step: 3, text: 'Kiểm tra kết nối mạng', icon: '���' },
          { step: 4, text: 'Liên hệ hỗ trợ nếu không được', icon: '📞' }
        ]
      },
      en: {
        'no_data': [
          { step: 1, text: 'Check sensor connection', icon: '🔌' },
          { step: 2, text: 'Restart device', icon: '🔄' },
          { step: 3, text: 'Check GPIO port', icon: '⚙️' },
          { step: 4, text: 'Try different sensor', icon: '🔁' },
          { step: 5, text: 'Contact support if not working', icon: '📞' }
        ],
        'offline': [
          { step: 1, text: 'Check power supply', icon: '⚡' },
          { step: 2, text: 'Check WiFi', icon: '📡' },
          { step: 3, text: 'Restart device', icon: '🔄' },
          { step: 4, text: 'Check network config', icon: '⚙️' },
          { step: 5, text: 'Reset to factory defaults', icon: '🏠' }
        ],
        'relay_not_work': [
          { step: 1, text: 'Check relay connection', icon: '🔌' },
          { step: 2, text: 'Check load (max 10A)', icon: '⚡' },
          { step: 3, text: 'Try manual on/off', icon: '🎛️' },
          { step: 4, text: 'Check rule config', icon: '⚙️' },
          { step: 5, text: 'Replace relay if broken', icon: '🔁' }
        ],
        'alert_not_sent': [
          { step: 1, text: 'Check Telegram config', icon: '📱' },
          { step: 2, text: 'Check bot token', icon: '🔑' },
          { step: 3, text: 'Try send test message', icon: '✉️' },
          { step: 4, text: 'Check alert threshold', icon: '⚠️' },
          { step: 5, text: 'Check network', icon: '🌐' }
        ],
        'high_cpu': [
          { step: 1, text: 'View running processes', icon: '📊' },
          { step: 2, text: 'Check logs', icon: '📝' },
          { step: 3, text: 'Restart services', icon: '🔄' },
          { step: 4, text: 'Increase RAM if needed', icon: '💻' },
          { step: 5, text: 'Contact support', icon: '📞' }
        ],
        'default': [
          { step: 1, text: 'View error details in logs', icon: '📝' },
          { step: 2, text: 'Try restarting device', icon: '🔄' },
          { step: 3, text: 'Check network connection', icon: '🌐' },
          { step: 4, text: 'Contact support if not working', icon: '📞' }
        ]
      },
      zh: {
        'no_data': [
          { step: 1, text: '检查传感器连接', icon: '🔌' },
          { step: 2, text: '重启设备', icon: '🔄' },
          { step: 3, text: '检查GPIO端口', icon: '⚙️' },
          { step: 4, text: '尝试不同的传感器', icon: '🔁' },
          { step: 5, text: '如需要联系支持', icon: '📞' }
        ],
        'offline': [
          { step: 1, text: '检查电源', icon: '⚡' },
          { step: 2, text: '检查WiFi', icon: '📡' },
          { step: 3, text: '重启设备', icon: '🔄' },
          { step: 4, text: '检查网络配置', icon: '⚙️' },
          { step: 5, text: '恢复出厂设置', icon: '🏠' }
        ],
        'relay_not_work': [
          { step: 1, text: '检查继电器连接', icon: '🔌' },
          { step: 2, text: '检查负载（最大10A）', icon: '⚡' },
          { step: 3, text: '尝试手动开关', icon: '🎛️' },
          { step: 4, text: '检查规则配置', icon: '⚙️' },
          { step: 5, text: '如损坏则更换继电器', icon: '🔁' }
        ],
        'alert_not_sent': [
          { step: 1, text: '检查Telegram配置', icon: '📱' },
          { step: 2, text: '检查机器人令牌', icon: '🔑' },
          { step: 3, text: '尝试发送测试消息', icon: '✉️' },
          { step: 4, text: '检查警报阈值', icon: '⚠️' },
          { step: 5, text: '检查网络', icon: '🌐' }
        ],
        'high_cpu': [
          { step: 1, text: '查看运行中的进程', icon: '📊' },
          { step: 2, text: '检查日志', icon: '📝' },
          { step: 3, text: '重启服务', icon: '🔄' },
          { step: 4, text: '如需要增加RAM', icon: '💻' },
          { step: 5, text: '联系支持', icon: '📞' }
        ],
        'default': [
          { step: 1, text: '在日志中查看错误详情', icon: '📝' },
          { step: 2, text: '尝试重启设备', icon: '🔄' },
          { step: 3, text: '检查网络连接', icon: '🌐' },
          { step: 4, text: '如需要联系支持', icon: '📞' }
        ]
      }
    };
    
    var langFixes = fixes[lang] || fixes.vi;
    return langFixes[issue] || langFixes['default'];
  },
  
  formatUserData: function(data, lang) {
    var templates = {
      vi: {
        'status': 'Trạng thái hệ thống: ' + (data?.status || 'Hoạt động bình thường'),
        'sensors': 'Cảm biến: Nhiệt độ ' + (data?.temp || '---') + ' độ, Độ ẩm ' + (data?.humidity || '---') + ' phần trăm',
        'devices': 'Thiết bị: ' + (data?.deviceCount || '0') + ' thiết bị đang hoạt động',
        'alerts': 'Cảnh báo: ' + (data?.alertCount || '0') + ' cảnh báo chưa đọc',
        'batches': 'Lô hàng: ' + (data?.batchCount || '0') + ' lô đang theo dõi'
      },
      en: {
        'status': 'System status: ' + (data?.status || 'Normal'),
        'sensors': 'Sensors: Temperature ' + (data?.temp || '---') + ', Humidity ' + (data?.humidity || '---') + ' percent',
        'devices': 'Devices: ' + (data?.deviceCount || '0') + ' devices active',
        'alerts': 'Alerts: ' + (data?.alertCount || '0') + ' unread alerts',
        'batches': 'Batches: ' + (data?.batchCount || '0') + ' batches tracking'
      },
      zh: {
        'status': '系统状态：' + (data?.status || '正常'),
        'sensors': '传感器：温度' + (data?.temp || '---') + '，湿度' + (data?.humidity || '---') + '百分比',
        'devices': '设备：' + (data?.deviceCount || '0') + '个设备运行中',
        'alerts': '警报：' + (data?.alertCount || '0') + '条未读警报',
        'batches': '批次：' + (data?.batchCount || '0') + '个批次跟踪中'
      }
    };
    
    var langTemplates = templates[lang] || templates.vi;
    var type = data?.type || 'status';
    return langTemplates[type] || langTemplates['status'];
  },
  
  speak: function(text, lang) {
    return {
      text: text,
      language: lang || 'vi',
      timestamp: Date.now(),
      ready: true
    };
  },
  
  getAvailableLanguages: function() {
    return ['vi', 'en', 'zh'];
  },
  
  getAvailableTopics: function() {
    return ['setup', 'sensor', 'relay', 'alert', 'qr'];
  }
};