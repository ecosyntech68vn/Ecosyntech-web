module.exports = {
  id: 'voice-assistant',
  name: 'Voice Assistant',
  description: 'AI-powered voice assistant with full system knowledge - answers questions, provides guides, and troubleshooting',
  triggers: [
    'event:voice.ask',
    'event:voice.answer',
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
    'event:voice.about',
    'event:voice.faq',
    'cron:5m'
  ],
  riskLevel: 'low',
  canAutoFix: false,
  
  knowledge: {
    vi: {
      system: {
        name: 'ECOSYNTECH FARM OS',
        version: 'V2.3.2',
        description: 'Nền tảng nông nghiệp thông Minh 4.0',
        features: [
          '60 skills tự động hóa',
          'QR truy xuất nguồn gốc',
          'Aptos Blockchain (tùy chọn)',
          'i18n đa ngôn ngữ',
          'Tối ưu RAM 512MB'
        ],
        pricing: {
          free: '0đ - Thử nghiệm',
          basic: '99K/tháng - Nông dân/HTX',
          pro: '299K/tháng - Doanh nghiệp'
        }
      },
      hardware: {
        esp32: {
          name: 'ESP32 V8.5.0',
          cpu: 'Dual-core 240MHz',
          flash: '4MB',
          ram: '512KB',
          relay: '8 kênh 10A',
          sensor: '12 ports',
          display: 'OLED 0.96"',
          power: '12V DC'
        }
      },
      software: {
        backend: 'Node.js Express V2.3.2',
        database: 'SQLite',
        skills: 60,
        api: 'REST + WebSocket'
      },
      connectivity: {
        wifi: '802.11 b/g/n 2.4GHz',
        bluetooth: 'BLE 4.2',
        mqtt: 'Hỗ trợ',
        webhook: 'Hỗ trợ'
      }
    },
    en: {
      system: {
        name: 'ECOSYNTECH FARM OS',
        version: 'V2.3.2',
        description: 'Comprehensive Smart Agriculture 4.0 Platform',
        features: [
          '60 automation skills',
          'QR Traceability',
          'Aptos Blockchain (optional)',
          'i18n multi-language',
          'RAM Optimized 512MB'
        ],
        pricing: {
          free: 'Free - Trial',
          basic: '99K/month - Farmer/Cooperative',
          pro: '299K/month - Enterprise'
        }
      },
      hardware: {
        esp32: {
          name: 'ESP32 V8.5.0',
          cpu: 'Dual-core 240MHz',
          flash: '4MB',
          ram: '512KB',
          relay: '8 channels 10A',
          sensor: '12 ports',
          display: 'OLED 0.96"',
          power: '12V DC'
        }
      },
      software: {
        backend: 'Node.js Express V2.3.2',
        database: 'SQLite',
        skills: 60,
        api: 'REST + WebSocket'
      },
      connectivity: {
        wifi: '802.11 b/g/n 2.4GHz',
        bluetooth: 'BLE 4.2',
        mqtt: 'Supported',
        webhook: 'Supported'
      }
    },
    zh: {
      system: {
        name: 'ECOSYNTECH FARM OS',
        version: 'V2.3.2',
        description: '智慧农业4.0综合平台',
        features: [
          '60个自动化技能',
          '二维码溯源',
          'Aptos区块链(可选)',
          'i18n多语言',
          '512MB内存优化'
        ],
        pricing: {
          free: '免费 - 试用',
          basic: '99K/月 - 农民/合作社',
          pro: '299K/月 - 企业'
        }
      },
      hardware: {
        esp32: {
          name: 'ESP32 V8.5.0',
          cpu: '双核240MHz',
          flash: '4MB',
          ram: '512KB',
          relay: '8通道10A',
          sensor: '12端口',
          display: 'OLED 0.96寸',
          power: '12V直流'
        }
      },
      software: {
        backend: 'Node.js Express V2.3.2',
        database: 'SQLite',
        skills: 60,
        api: 'REST + WebSocket'
      },
      connectivity: {
        wifi: '802.11 b/g/n 2.4GHz',
        bluetooth: 'BLE 4.2',
        mqtt: '支持',
        webhook: '支持'
      }
    }
  },
  
  run: function(ctx) {
    var event = ctx.event || {};
    var action = event.action || event.type?.replace('voice.', '') || 'answer';
    var lang = event.lang || 'vi';
    var question = event.question || event.query || '';
    var topic = event.topic || event.data?.topic || '';
    
    var result = {
      ok: true,
      action: action,
      language: lang,
      timestamp: new Date().toISOString(),
      ttsOutput: null,
      response: null,
      suggestions: [],
      sources: []
    };
    
    switch (action) {
      case 'ask':
      case 'answer':
        result.response = this.answerQuestion(question, topic, lang);
        result.ttsOutput = result.response;
        result.suggestions = this.getSuggestions(question, lang);
        result.sources = this.getSources(question, lang);
        break;
        
      case 'guide':
        result.response = this.getGuideContent(topic, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'config':
        result.response = this.getConfigGuide(event.deviceType || topic, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'about':
        result.response = this.getAbout(lang);
        result.ttsOutput = result.response;
        break;
        
      case 'faq':
        result.response = this.getFAQ(event.faqId, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'admin':
      case 'monitor':
      case 'troubleshoot':
        result.response = this.getGuideContent(action + '.' + topic, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'userdata':
        result.response = this.formatUserData(event.data, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'input':
        result.response = this.generateInputPrompt(event.field, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'alert':
        result.response = this.formatAlert(event.data, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'confirm':
        result.response = this.generateConfirmation(event.message, lang);
        result.ttsOutput = result.response;
        break;
        
      case 'help':
        result.response = this.getHelpTopics(lang);
        result.ttsOutput = result.response;
        break;
        
      default:
        result.response = this.getDefaultResponse(lang);
        result.ttsOutput = result.response;
    }
    
    return result;
  },
  
  answerQuestion: function(question, topic, lang) {
    var q = (question || '').toLowerCase();
    var t = (topic || '').toLowerCase();
    
    var answers = {
      vi: {
        'gia': 'Giá của ECOSYNTECH rất hợp lý. Gói Free hoàn toàn miễn phí. Gói Basic 99K/tháng, Gói Pro 299K/tháng. Năm đầu chỉ cần mua thiết bị 300-500K VNĐ.',
        'chiphi': 'Chi phí rất thấp. Thiết bị 300-500K, backend và database miễn phí (Google Apps Script). Tổng năm đầu chỉ 300-500K VNĐ.',
        'cấu hình': 'Cấu hình rất đơn giản. Kết nối WiFi, cắm sensor, scan QR, bắt đầu. Mất 5 phút.',
        'cài đặt': 'Cài đặt: npm install, npm start. Hoặc dùng script: bash scripts/setup-ai.sh',
        'cai dat': 'Cài đặt: npm install, npm start. Hoặc dùng script: bash scripts/setup-ai.sh',
        'setup': 'Setup: git clone, npm install, npm start. Chi tiết xem README.md',
        'wifi': 'Kết nối WiFi 2.4GHz, nhập SSID và password, lưu.',
        'cảm biến': 'Hỗ trợ DHT22, DS18B20, Soil moisture, pH, EC, Light sensor. Cắm vào port tương ứng.',
        'sensor': 'Hỗ trợ DHT22, DS18B20, Soil moisture, pH, EC, Light sensor. Cắm vào port tương ứng.',
        'relay': 'Có 8 relay 10A. Điều khiển máy bơm, đèn, quạt theo ngưỡng hoặc thủ công.',
        'telegram': 'Telegram bot nhận cảnh báo. Dùng /start, /status, /sensors, /alerts để tương tác.',
        'bot': 'Telegram bot nhận cảnh báo. Dùng /start, /status, /sensors, /alerts để tương tác.',
        'qr': 'QR tự tạo khi tạo batch. Scan để truy xuất nguồn gốc từ gieo trồng đến xuất bán.',
        'blockchain': 'Aptos Blockchain ghi hash khi thu hoạch, xuất bán, chứng nhận. Bật trong .env',
        'ai': 'Có AI Advisory dự đoán thời tiết, phát hiện bất thường. Tích hợp sẵn.',
        'skills': 'Có 60 skills tự động hóa. Bao gồm vận hành, giám sát, sửa lỗi, nông nghiệp.',
        '60': 'Có 60 skills tự động hóa. Bao gồm vận hành, giám sát, sửa lỗi, nông nghiệp.',
        'api': 'REST API tại /api/* . Xem API_REFERENCE.md chi tiết.',
        'ram': 'Chạy được trên 512MB RAM. Tối ưu cho thiết bị thấp.',
        'hướng dẫn': 'Xem OPERATIONS.md hoặc dùng voice assistant. Gõ /help để xem hướng dẫn.',
        'help': 'Gõ /help để xem hướng dẫn. Xem OPERATIONS.md hoặc dùng voice assistant.',
        'troubleshoot': 'Xem OPERATIONS.md phần troubleshooting. Hoặc hỏi voice assistant về vấn đề cụ thể.',
        'lỗi': 'Liên hệ support hoặc xem OPERATIONS.md. Restart bằng npm start nếu cần.',
        'default': 'ECOSYNTECH là nền tảng nông nghiệp thông minh với 60 skills tự động. Hỏi cụ thể hơn được không?'
      },
      en: {
        'price': 'ECOSYNTECH pricing: Free - $0, Basic - 99K/month, Pro - 299K/month. First year only device cost 300-500K.',
        'cost': 'Very low cost. Device 300-500K, backend free (GAS). Total first year only 300-500K VND.',
        'setup': 'Setup: git clone, npm install, npm start. Run bash scripts/setup-ai.sh for AI.',
        'install': 'Setup: git clone, npm install, npm start. Run bash scripts/setup-ai.sh for AI.',
        'wifi': 'Connect WiFi 2.4GHz, enter SSID and password, save.',
        'sensor': 'Supports DHT22, DS18B20, Soil moisture, pH, EC, Light sensor. Plug into corresponding port.',
        'relay': '8 relays 10A. Control pump, light, fan by threshold or manual.',
        'telegram': 'Telegram bot for alerts. Use /start, /status, /sensors, /alerts.',
        'qr': 'Auto QR when create batch. Scan to trace from planting to sale.',
        'blockchain': 'Aptos Blockchain hashes on harvest, export, certify. Enable in .env',
        'ai': 'AI Advisory for weather prediction, anomaly detection. Included.',
        'skills': '60 automation skills. Operations, monitoring, troubleshooting, agriculture.',
        '60': '60 automation skills. Operations, monitoring, troubleshooting, agriculture.',
        'api': 'REST API at /api/*. See API_REFERENCE.md.',
        'ram': 'Works on 512MB RAM. Optimized for low-end devices.',
        'help': 'Type /help for guide. See OPERATIONS.md or use voice assistant.',
        'troubleshoot': 'See OPERATIONS.md troubleshooting section. Or ask voice assistant.',
        'default': 'ECOSYNTECH is smart agriculture platform with 60 skills. Ask more specific?'
      },
      zh: {
        'price': 'ECOSYNTECH价格：免费-0元，基础版-99K/月，专业版-299K/月。第一年只需设备费300-500K。',
        'cost': '成本很低。设备300-500K，后端免费（GAS）。第一年总计仅300-500K。',
        'setup': '安装：git clone, npm install, npm start。运行bash scripts/setup-ai.sh安装AI。',
        'install': '安装：git clone, npm install, npm start。运行bash scripts/setup-ai.sh安装AI。',
        'wifi': '连接WiFi 2.4GHz，输入SSID和密码，保存。',
        'sensor': '支持DHT22、DS18B20、土壤湿度、pH、EC、光传感器。插入对应端口。',
        'relay': '8个继电器10A。按阈值或手动控制泵、灯、风扇。',
        'telegram': 'Telegram机器人接收警报。使用/start、/status、/sensors、/alerts。',
        'qr': '创建批次时自动生成二维码。扫描从种植到销售全程溯源。',
        'blockchain': 'Aptos区块链在收获、出口、认证时记录哈希。在.env中启用。',
        'ai': 'AI顾问预测天气、检测异常。已内置。',
        'skills': '60个自动化技能。运营、监控、故障排除、农业。',
        '60': '60个自动化技能。运营、监控、故障排除、农业。',
        'api': 'REST API在/api/*。详见API_REFERENCE.md。',
        'ram': '512MB内存可运行。针对低端设备优化。',
        'help': '输入/help获取指南。查看OPERATIONS.md或使用语音助手。',
        'troubleshoot': '查看OPERATIONS.md故障排除部分。或询问语音助手。',
        'default': 'ECOSYNTECH是具有60个技能的智慧农业平台。请更具体地提问？'
      }
    };
    
    var langAnswers = answers[lang] || answers.vi;
    
    for (var key in langAnswers) {
      if (q.indexOf(key) !== -1 || t.indexOf(key) !== -1) {
        return langAnswers[key];
      }
    }
    
    return langAnswers['default'];
  },
  
  getAbout: function(lang) {
    var about = {
      vi: 'ECOSYNTECH FARM OS V2.3.2 là nền tảng nông nghiệp thông minh 4.0 do EcoSynTech Global phát triển. Điểm nổi bật: 60 skills tự động hóa, QR truy xuất nguồn gốc, Aptos Blockchain (tùy chọn), i18n đa ngôn ngữ, tối ưu RAM 512MB. Chi phí thấp nhất: Free đến 99K/tháng.',
      en: 'ECOSYNTECH FARM OS V2.3.2 is Smart Agriculture 4.0 platform by EcoSynTech Global. Features: 60 automation skills, QR Traceability, Aptos Blockchain (optional), i18n, 512MB RAM optimized. Lowest cost: Free to 99K/month.',
      zh: 'ECOSYNTECH FARM OS V2.3.2是EcoSynTech开发的智慧农业4.0平台。功能：60个自动化技能、二维码溯源、Aptos区块链（可选）、i18n、512MB内存优化。最低成本：免费至99K/月。'
    };
    
    return about[lang] || about.vi;
  },
  
  getFAQ: function(faqId, lang) {
    var faqs = {
      vi: {
        '1': 'Câu hỏi: Làm sao bắt đầu? Trả lời: git clone, npm install, npm start. Xem README.md hướng dẫn chi tiết.',
        '2': 'Câu hỏi: Cần bao nhiêu chi phí? Trả lời: Thiết bị 300-500K, còn lại miễn phí. Năm đầu chỉ 300-500K.',
        '3': 'Câu hỏi: Có cần kiến thức IT không? Trả lời: Không. Cắm là chạy trong 5 phút.',
        '4': 'Câu hỏi: Thiết bị có bền không? Trả lời: ESP32 chính hãng, bảo hành 12 tháng.',
        '5': 'Câu hỏi: Hỗ trợ những cảm biến nào? Trả lời: DHT22, DS18B20, Soil, pH, EC, Light sensor.'
      },
      en: {
        '1': 'Q: How to start? A: git clone, npm install, npm start. See README.md.',
        '2': 'Q: How much cost? A: Device 300-500K, rest free. First year only 300-500K.',
        '3': 'Q: Need IT knowledge? A: No. Plug and play in 5 minutes.',
        '4': 'Q: Is device durable? A: ESP32 official, 12 month warranty.',
        '5': 'Q: What sensors supported? A: DHT22, DS18B20, Soil, pH, EC, Light sensor.'
      },
      zh: {
        '1': '问题：如何开始？答案：git clone, npm install, npm start。详见README.md。',
        '2': '问题：多少费用？答案：设备300-500K，其余免费。第一年仅300-500K。',
        '3': '问题：需要IT知识吗？答案：不需要。5分钟即插即用。',
        '4': '问题：设备耐用吗？答案：ESP32正品，12个月保修。',
        '5': '问题：支持哪些传感器？答案：DHT22、DS18B20、土壤、pH、EC、光传感器。'
      }
    };
    
    var langFAQs = faqs[lang] || faqs.vi;
    return faqs[lang] || 'Xem FAQ list: 1) Bắt đầu 2) Chi phí 3) IT 4) Bền 5) Sensor';
  },
  
  getHelpTopics: function(lang) {
    var topics = {
      vi: [
        'Cấu hình thiết bị - Cách kết nối WiFi, cảm biến, relay',
        'Thêm cảm biến mới - Hướng dẫn thêm và cấu hình',
        'Thiết lập cảnh báo - Tạo ngưỡng và nhận alert',
        'Tạo QR truy xuất - Tạo mã cho lô hàng',
        'Điều khiển thiết bị - Bật/tắt relay',
        'Xem báo cáo - Xuất dữ liệu',
        'Cài đặt AI - Cài Ollama local',
        'Xem hướng dẫn chi tiết - Xem OPERATIONS.md'
      ],
      en: [
        'Device config - Connect WiFi, sensors, relays',
        'Add sensor - How to add and configure',
        'Set alerts - Create thresholds and receive alerts',
        'Create QR - Generate QR for batch',
        'Control device - On/off relays',
        'View reports - Export data',
        'Install AI - Install local Ollama',
        'View detailed guide - See OPERATIONS.md'
      ],
      zh: [
        '设备配置 - 连接WiFi、传感器、继电器',
        '添加传感器 - 如何添加和配置',
        '设置警报 - 创建阈值和接收警报',
        '创建二维码 - 为批次生成二维码',
        '控制设备 - 开关继电器',
        '查看报告 - 导出数据',
        '安装AI - 安装本地Ollama',
        '查看详细指南 - 查看OPERATIONS.md'
      ]
    };
    
    return topics[lang] || topics.vi;
  },
  
  getSuggestions: function(question, lang) {
    var q = (question || '').toLowerCase();
    var suggestions = {
      vi: [
        'Giá bao nhiêu?',
        'Cách cài đặt?',
        'Cần những gì?',
        'Hỗ trợ cảm biến nào?',
        'Cách s��� d��ng telegram bot?'
      ],
      en: [
        'How much does it cost?',
        'How to install?',
        'What do I need?',
        'What sensors are supported?',
        'How to use telegram bot?'
      ],
      zh: [
        '要多少钱？',
        '如何安装？',
        '我需要什么？',
        '支持哪些传感器？',
        '如何使用telegram机器人？'
      ]
    };
    
    return suggestions[lang] || suggestions.vi;
  },
  
  getSources: function(question, lang) {
    return [
      'README.md',
      'OPERATIONS.md', 
      'API_REFERENCE.md',
      'MARKETING.md'
    ];
  },
  
  getGuideContent: function(topic, lang) {
    var guides = {
      vi: {
        'setup': 'Hướng dẫn setup: 1. git clone về. 2. npm install. 3. npm start. Chi tiết xem README.md',
        'sensor': 'Thêm cảm biến: Vào dashboard > Thiết bị > Thêm > Chọn loại > Lưu',
        'relay': 'Điều khiển relay: Vào dashboard > Điều khiển > Bật/tắt. Hoặc cấu hình auto.',
        'alert': 'Tạo cảnh báo: Vào dashboard > Cảnh báo > Thêm ngưỡng > Lưu',
        'qr': 'Tạo QR: Vào dashboard > Truy xuất > Tạo lô > QR tự tạo',
        'telegram': 'Telegram: /start, /status, /sensors, /alerts, /devices, /rules',
        'welcome': 'Chào mừng đến với ECOSYNTECH! Hệ thống nông nghiệp thông minh 4.0 với 60 skills tự động.'
      },
      en: {
        'setup': 'Setup guide: 1. git clone. 2. npm install. 3. npm start. See README.md',
        'sensor': 'Add sensor: Dashboard > Devices > Add > Select type > Save',
        'relay': 'Control relay: Dashboard > Control > On/off. Or configure auto.',
        'alert': 'Create alert: Dashboard > Alerts > Add threshold > Save',
        'qr': 'Create QR: Dashboard > Traceability > Create batch > QR auto',
        'telegram': 'Telegram: /start, /status, /sensors, /alerts, /devices, /rules',
        'welcome': 'Welcome to ECOSYNTECH! Smart Agriculture 4.0 with 60 skills.'
      },
      zh: {
        'setup': '安装指南：1. git clone。2. npm install。3. npm start。详见README.md',
        'sensor': '添加传感器：仪表板>设备>添加>选择类型>保存',
        'relay': '控制继电器：仪表板>控制>开关。或配置自动。',
        'alert': '创建警报：仪表板>警报>添加阈值>保存',
        'qr': '创建二维码：仪表板>溯源>创建批次>二维码自动生成',
        'telegram': 'Telegram：/start、/status、/sensors、/alerts、/devices、/rules',
        'welcome': '欢迎使用ECOSYNTECH！具有60个技能的智慧农业4.0。'
      }
    };
    
    var langGuides = guides[lang] || guides.vi;
    var content = langGuides[topic] || langGuides['setup'];
    return content;
  },
  
  getConfigGuide: function(deviceType, lang) {
    var configs = {
      vi: {
        'esp32': 'Cấu hình ESP32: 1. Chọn WiFi mode. 2. Nhập SSID/password. 3. Cấu hình MQTT (nếu dùng). 4. Đặt interval. 5. Lưu.',
        'dht22': 'Cấu hình DHT22: 1. VCC→3.3V. 2. GND→GND. 3. Data→GPIO. 4. Thêm vào dashboard.',
        'relay': 'Cấu hình relay: 1. Kết nối vào GPIO. 2. Đặt tên. 3. Chọn chế độ. 4. Lưu.',
        'default': 'Cấu hình: Xem OPERATIONS.md hoặc hỏi cụ thể hơn.'
      },
      en: {
        'esp32': 'ESP32 config: 1. Select WiFi mode. 2. Enter SSID/password. 3. Configure MQTT (if used). 4. Set interval. 5. Save.',
        'dht22': 'DHT22 config: 1. VCC→3.3V. 2. GND→GND. 3. Data→GPIO. 4. Add to dashboard.',
        'relay': 'Relay config: 1. Connect to GPIO. 2. Set name. 3. Select mode. 4. Save.',
        'default': 'Config: See OPERATIONS.md or ask more specific.'
      },
      zh: {
        'esp32': 'ESP32配置：1.选择WiFi模式。2.输入SSID/密码。3.配置MQTT（如果使用）。4.设置间隔。5.保存。',
        'dht22': 'DHT22���置：1.VCC→3.3V。2.GND→GND。3.Data→GPIO。4.添加到仪表板。',
        'relay': '继电器配置：1.连接到GPIO。2.设置名称。3.选择模式。4.保存。',
        'default': '配置：查看OPERATIONS.md或更具体地提问。'
      }
    };
    
    var langConfigs = configs[lang] || configs.vi;
    return langConfigs[deviceType] || langConfigs['default'];
  },
  
  getDefaultResponse: function(lang) {
    var responses = {
      vi: 'Tôi là voice assistant của ECOSYNTECH. Có thể trả lời về: giá cả, cách cài đặt, cấu hình, sử dụng. Bạn hỏi gì?',
      en: 'I am ECOSYNTECH voice assistant. Can answer about: pricing, install, config, usage. What do you want to know?',
      zh: '我是ECOSYNTECH语音助手。可以回答：价格、安装、配置、使用。你想知道什么？'
    };
    
    return responses[lang] || responses.vi;
  },
  
  generateInputPrompt: function(field, lang) {
    var prompts = {
      vi: {
        'wifi_ssid': 'Vui lòng nói tên WiFi',
        'wifi_password': 'Vui lòng nói mật khẩu WiFi',
        'device_name': 'Vui lòng nói tên thiết bị',
        'batch_code': 'Vui lòng nói mã lô hàng',
        'threshold': 'Vui lòng nói giá trị ngưỡng',
        'confirm': 'Xác nhận? Nói "có" hoặc "không"'
      },
      en: {
        'wifi_ssid': 'Please say your WiFi name',
        'wifi_password': 'Please say your WiFi password',
        'device_name': 'Please say device name',
        'batch_code': 'Please say batch code',
        'threshold': 'Please say threshold value',
        'confirm': 'Confirm? Say "yes" or "no"'
      },
      zh: {
        'wifi_ssid': '请说出WiFi名称',
        'wifi_password': '请说出WiFi密码',
        'device_name': '请说出设备名称',
        'batch_code': '请说出批次代码',
        'threshold': '请说出阈值',
        'confirm': '确认？请说"是"或"否"'
      }
    };
    
    var langPrompts = prompts[lang] || prompts.vi;
    return langPrompts[field] || langPrompts['confirm'];
  },
  
  formatAlert: function(data, lang) {
    var alerts = {
      vi: {
        'critical': 'Cảnh báo nghiêm trọng: ',
        'high': 'Cảnh báo cao: ',
        'medium': 'Cảnh báo: ',
        'low': 'Thông báo: '
      },
      en: {
        'critical': 'Critical alert: ',
        'high': 'High alert: ',
        'medium': 'Alert: ',
        'low': 'Notification: '
      },
      zh: {
        'critical': '严重警报：',
        'high': '高警报：',
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
  
  formatUserData: function(data, lang) {
    var templates = {
      vi: {
        'status': 'Trạng thái: ' + (data?.status || 'Hoạt động bình thường'),
        'sensors': 'Cảm biến - Nhiệt: ' + (data?.temp || '---') + 'độ, Ẩm: ' + (data?.humidity || '---') + '%',
        'devices': 'Thiết bị: ' + (data?.deviceCount || '0') + ' hoạt động',
        'alerts': 'Cảnh báo: ' + (data?.alertCount || '0') + ' chưa đọc'
      },
      en: {
        'status': 'Status: ' + (data?.status || 'Normal'),
        'sensors': 'Sensors - Temp: ' + (data?.temp || '---') + ', Humidity: ' + (data?.humidity || '---') + '%',
        'devices': 'Devices: ' + (data?.deviceCount || '0') + ' active',
        'alerts': 'Alerts: ' + (data?.alertCount || '0') + ' unread'
      },
      zh: {
        'status': '状态：' + (data?.status || '正常'),
        'sensors': '传感器 - 温度：' + (data?.temp || '---') + '，湿度：' + (data?.humidity || '---') + '%',
        'devices': '设备：' + (data?.deviceCount || '0') + ' 运行中',
        'alerts': '警报：' + (data?.alertCount || '0') + ' 未读'
      }
    };
    
    var langTemplates = templates[lang] || templates.vi;
    var type = data?.type || 'status';
    return langTemplates[type] || langTemplates['status'];
  },
  
  getKnowledge: function(type, lang) {
    return this.knowledge[lang]?.[type] || this.knowledge.vi?.[type] || {};
  },
  
  speak: function(text, lang) {
    return {
      text: text,
      language: lang || 'vi',
      ready: true
    };
  },
  
  getAvailableLanguages: function() {
    return ['vi', 'en', 'zh'];
  },
  
  getTopics: function() {
    return [
      'system', 'hardware', 'software', 'pricing',
      'setup', 'install', 'config', 'wifi', 
      'sensor', 'relay', 'telegram', 'qr', 'blockchain', 'ai', 'skills'
    ];
  }
};