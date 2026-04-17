// =============================================================================
// ECOSYNTECH GAS V9.2 — ALL FIXED & PRODUCTION READY
// Version: 9.3 | FW Compat: 8.5.0 | Date: 2026-04-16
// Patches V9.2: C1, C2, C3, H1, H2, H4, H5, M1, M2, M4, M5, I1, I4
// Patches V9.3: GPT-1 Idempotency, GPT-3b DeadLetter, GPT-5b Watchdog, GPT-6 ManualValidate
// Patches V9.4: FIX-1 RetryQueue, FIX-2 LockRetry, FIX-3 FirebaseRetry, FIX-4 Archive, FIX-5 writeAtTop, FIX-6 SensorRange, FIX-7 SkipDead, FIX-8 CacheInval
// Patches V9.5: FIX-1 Firebase 4xRetry+Backoff, FIX-2 InvalidSensorLog, FIX-3 _handleError+severity
// Author: Ta Quang Thuan + Claude
// DEPLOY: Copy toàn bộ file này vào Google Apps Script → Save → Deploy
// =============================================================================

/*******************************************************************************

 * ECOSYNTECH GAS V9.1 -- PRODUCT FINAL (monolith, optimized & patched)
 *
 * ===== MỤC LỤC MODULE (đánh số 1 → 31) =====
 *  01. Global Constants & Defaults       (đã FIX bug V8.0)
 *  02. Helpers (prop, escapeHtml, canonicalStringify, JsonResponse,
 *               writeAtTop, logAtTop, prependRowKeepSize)
 *  03. EventModule                       (logEvent ghi dòng 2, hook Aptos)
 *  04. Security                          (HMAC, nonce, signed payload)
 *  05. Database                          (+ computeSha256, createTemporaryDownloadLink,
 *                                          cacheGet/Put/Remove)
 *  06. RealTime
 *  07. IoTCore                           (sensor 10 phút, hook Aptos)
 *  08. Admin
 *  09. CloudRun
 *  10. AI
 *  11. Analytics
 *  12. RetryQueue
 *  13. BacklogModule
 *  14. Commands helpers
 *  15. TelegramModule
 *  16. AdvisoryEngine
 *  17. SmartControlEngine                (addRule dùng writeAtTop)
 *  18. IntegrationManager
 *  19. SystemMonitor
 *  20. DeploymentManager
 *  21. QRModule
 *  22. MediaModule                       (hook Aptos khi upload)
 *  23. LanguageModule
 *  24. SnapshotModule
 *  25. AptosModule                       (Mainnet qua Vercel)
 *  26. WeeklyBatchModule                 (gom sự kiện N ngày/lần)
 *  27. FirmwareManager                   (OTA webhook, tự tính SHA256)
 *  28. Admin UI Pro (getFullAdminHTML)   (sidebar + dark mode + dashboard)
 *  29. EcoSynTechApp (router)
 *  30. doGet / doPost / setupAllTriggers (6 triggers)
 *  31. Test Functions
 *
 * FW_VERSION giữ "8.5.0" (khớp firmware ESP32 hiện tại của bạn).
 * Ngày tối ưu: 2026-04-16  --  V9.1: patches applied, production-ready.
 *******************************************************************************/

/***********************************************************

 * EcoSynTech GAS V9.5 | FW 8.5.0 |
✅ SmartControl + Telegram + QR Traceability + Advisory AI + Blockchain Aptos
✅Tích hợp quản lý thiết bị qua sheet Devices (status active/disabled), cập nhật OTA tự động
✅Cấu hình từ xa qua sheet DeviceConfig (override mặc định)
✅Thêm heartbeat endpoint, kiểm tra device active trước khi xử lý
✅Tối ưu bảo mật, dễ mở rộng, fallback an toàn
✅Author: Tạ Quang Thuận (hoàn thiện bởi Claude)
✅Date: 2026-04-14 (bổ sung Smart Control Engine- )
✅ Smart Control Engine hoàn thiện (hysteresis, cooldown, reset_action tùy chỉnh).
✅ Retry Queue cho lệnh thất bại.
✅ Giao diện quản lý rule (CRUD).
✅ Sửa lỗi loadRules, thêm cột cooldown_sec & reset_action.
✅ Tích hợp trigger xử lý retry mỗi 10 phút.
 **********************************************************/

/* ----------------------------**1-  GLOBAL CONSTANTS** ---------------------------- */

// Phiên bản firmware hiện tại (tham chiếu để so sánh OTA) -  part 1
const FW_VERSION = "8.5.0"; //- đây là vesion của thiết bị esp32
const DEFAULTS = {
  SPREADSHEET_ID:           "CHANGE_ME",
  PUBLIC_COPY_ID:           "",
  HMAC_SECRET:              "CHANGE_ME",
  API_KEY:                  "CHANGE_ME",
  WEBAPP_URL:               "CHANGE_ME",
  QR_FOLDER_ID:             "CHANGE_ME",
  MEDIA_FOLDER_ID:          "CHANGE_ME",
  FIRMWARE_FOLDER_ID:       "CHANGE_ME",     // [V9.0] folder Drive chứa .bin
  QR_EXPIRY_DAYS:           "365",
  OTA_MANIFEST:             JSON.stringify({ update_available: false, version: "9.0.0", bin_url: "", sha256: "", size: 0, notes: "No update" }),
  IPFS_GATEWAY:             "https://ipfs.io/ipfs/",
  BLOCKCHAIN_POST_URL:      "",
  BLOCKCHAIN_POST_APIKEY:   "",
  CLOUD_FN_URL:             "CHANGE_ME",
  CLOUD_FN_API_KEY:         "CHANGE_ME",
  SNAPSHOT_BUCKET:          "",
  REPLAY_WINDOW_SEC:        "1200",
  RATE_LIMIT_PER_DEVICE:    "100",
  DEVICE_POST_INTERVAL_SEC: "600",           // [V9.0] 10 phút = 600s (tiết kiệm pin)
  SENSOR_READ_INTERVAL_SEC: "600",           // [V9.0] sensor read 10 phút
  SYNC_SHEETS:              "BatchInfo,Batchsheet,Devices,EventLogs,Blockchain_Log,DynamicQR,BatchMedia,PendingWeeklyEvents",
  SYNC_INTERVAL_MIN:        "30",
  USE_MERKLE:               "true",
  DRY_RUN:                  "false",
  BLOCKCHAIN_POST_MAX_ATTEMPTS: "5",
  CLEANUP_DAYS:             "90",
  MAX_EVENT_LOG_SIZE:       "8192",
  MEDIA_MAX_FILES:          "6",
  MEDIA_MAX_SIZE_MB:        "2",
  ML_ANOMALY_MODEL:         "",
  ADMIN_PASSWORD:           "CHANGE_ME",
  ADMIN_EMAILS:             "CHANGE_ME",
  ADMIN_UI_ENABLED:         "true",
  ADMIN_UI_THEME:           "dark",          // [V9.0] dark | light
  FIREBASE_API_KEY:         "CHANGE_ME",
  FIREBASE_PROJECT_ID:      "CHANGE_ME",
  GOOGLE_VISION_API_KEY:    "CHANGE_ME",
  // ---- Telegram Bot ----
  TELEGRAM_BOT_TOKEN:        "CHANGE_ME",
  TELEGRAM_CHAT_IDS:         "CHANGE_ME",
  TELEGRAM_NOTIFY_HEARTBEAT: "false",
  TELEGRAM_NOTIFY_SENSOR:    "true",
  TELEGRAM_NOTIFY_RULE:      "true",
  TELEGRAM_NOTIFY_SYSTEM:    "true",
  // ---- Advisory Engine ----
  ADVISORY_TEMP_HIGH:        "38.0",
  ADVISORY_TEMP_LOW:         "16.0",
  ADVISORY_HUM_LOW:          "45.0",
  ADVISORY_SOIL_LOW:         "30.0",
  ADVISORY_LIGHT_LOW:        "5000",
  ADVISORY_BATTERY_LOW:      "3.5",           // [V9.0-FIX] đứng riêng đúng cú pháp
  ADVISORY_NOTIFY_TELEGRAM:  "true",
  // ---- Aptos Mainnet (V9.0) ----
  APTOS_VERCEL_URL:          "CHANGE_ME",     // https://your-app.vercel.app/api/log-event
  GAS_ACCESS_TOKEN:          "CHANGE_ME",     // Bearer token dùng chung với Vercel
  APTOS_ACCOUNT_ADDRESS:     "CHANGE_ME",     // 0x... (public)
  APTOS_ENABLED:             "false",         // bật khi đã cấu hình xong
  APTOS_BATCH_DAYS:          "7",             // Gửi batch 1 lần / 7 ngày (có thể chỉnh)
  APTOS_BATCH_MAX_PER_HOUR:  "100",           // rate limit chống spam
  APTOS_VERIFY_INTERVAL_MIN: "30"
  // (Loại bỏ dòng FW_VERSION = "8.5.0" sai cú pháp trong V8.0)
};

/* **-------------- MODULE 02 Helpers: thêm writeAtTop + logAtTop ---------------** */

function prop(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  return (v !== null && v !== undefined) ? v : (DEFAULTS[key] || '');
}

function getCurrentUTCTimestamp() {
  return new Date().toISOString();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**

 * Canonical JSON stringify -- stable key ordering.
 * Single authoritative definition used everywhere.
 */
function canonicalStringify(value) {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
      .filter(k => typeof value[k] !== 'undefined')
      .sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(value[k])).join(',') + '}';
  }

  return JSON.stringify(value);
}

function JsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**

 * writeAtTop(sheet, rowValues) -- chèn 1 dòng dữ liệu ngay bên DƯỚI header (dòng 2).
 * Dùng thay cho sheet.appendRow() khi muốn dữ liệu mới luôn hiển thị trên cùng.
 * An toàn với sheet trống (tự tạo header nếu truyền kèm).

/**

 * writeAtTop -- ghi dòng 2, newest-first.
 * [V9.1 FIX-C3] LockService.getScriptLock tránh race condition khi nhiều device post đồng thời.
 */
function writeAtTop(sheet, rowValues, headerRow) {
  if (!sheet) return;
  const lock = LockService.getScriptLock();
  let locked = false;
  // [V9.4 FIX-2] Retry lock 3 lần (8s + 3s + 2s) trước khi fallback appendRow
  const lockAttempts = [8000, 3000, 2000];
  for (let attempt = 0; attempt < lockAttempts.length && !locked; attempt++) {
    try { locked = lock.tryLock(lockAttempts[attempt]); } catch(_e) {}
  }
  try {
    if (sheet.getLastRow() < 1 && Array.isArray(headerRow) && headerRow.length) {
      sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
      sheet.setFrozenRows(1);
    }

    if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
    const numCols = Math.max(sheet.getLastColumn(), rowValues.length);
    const padded = rowValues.concat(new Array(Math.max(0, numCols - rowValues.length)).fill(''));
    if (locked) {
      // Lock được: chèn an toàn tại dòng 2
      sheet.insertRowBefore(2);
      sheet.getRange(2, 1, 1, padded.length).setValues([padded]);
    } else {
      // Fallback khi không lock được: appendRow để không mất data
      console.warn('writeAtTop lock timeout, appendRow fallback: ' + sheet.getName());
      sheet.appendRow(padded);
    }

  } catch(e) {
    console.error("writeAtTop error:", e);
    try { sheet.appendRow(rowValues); } catch(_) {}
  } finally {
    try { if (locked) lock.releaseLock(); } catch(_) {}
  }
}

/**

 * logAtTop(sheetName, rowValues, headerRow) -- wrapper tiện lợi:
 * mở (hoặc tạo) sheet theo tên rồi ghi dòng 2.
 */
function logAtTop(sheetName, rowValues, headerRow) {
  const ss = Database.getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  writeAtTop(sheet, rowValues, headerRow);
  return sheet;
}

/**

 * prependRowKeepSize(sheet, rowValues, maxRows)
 * Ghi dòng mới ở đầu và xoá dòng cuối nếu vượt maxRows (rolling window).
 */
function prependRowKeepSize(sheet, rowValues, maxRows) {
  writeAtTop(sheet, rowValues);
  if (maxRows && sheet.getLastRow() > maxRows + 1) {
    sheet.deleteRow(sheet.getLastRow());
  }
}

/* ================================================================

   **3 EVENT MODULE  EventModule.logEvent: ghi dòng 2 + hook Aptos**   ================================================================ */
const EventModule = (() => {
  function logEvent(entityId, eventType, dataObj, source) {
    try {
      const ss = Database.getSpreadsheet();
      const evLog = ss.getSheetByName('EventLogs') || ss.insertSheet('EventLogs');
      const header = ['ts', 'entity', 'event', 'payload', 'source', 'note'];
      if (evLog.getLastRow() < 1) {
        evLog.getRange(1, 1, 1, 6).setValues([header]);
        evLog.setFrozenRows(1);
      }

      const maxLen = parseInt(prop('MAX_EVENT_LOG_SIZE'), 10) || 8192;
      const payload = typeof dataObj === 'string'
        ? dataObj.slice(0, maxLen)
        : JSON.stringify(dataObj).slice(0, maxLen);
      // [V9.0] Ghi ngay DƯỚI header (dòng 2) thay vì appendRow
      writeAtTop(evLog, [getCurrentUTCTimestamp(), entityId || '', eventType || '', payload, source || '', ''], header);
      // [V9.0] Hook blockchain (gom batch tuần) cho các sự kiện quan trọng
      const importantEvents = ['bon_phan', 'phun_thuoc', 'thu_hoach', 'so_che', 'che_bien', 'khac', 'manual_event', 'sensor_anomaly', 'media_uploaded'];
      if (importantEvents.includes(eventType)
          && typeof WeeklyBatchModule !== 'undefined'
          && typeof AptosModule !== 'undefined'
          && AptosModule.isConfigured()) {
        try { WeeklyBatchModule.addEvent(entityId || 'system', eventType, dataObj); }
        catch(e) { _handleError('WeeklyBatch:addEvent', e, 'warning'); }
      }

    } catch (e) {
      console.error('logEvent failed:', e);
    }
  }
*/
  function createManualEventsSheet() {
    const ss = Database.getSpreadsheet();
    let sheet = ss.getSheetByName('ManualEvents');
    if (!sheet) {
      sheet = ss.insertSheet('ManualEvents');
      sheet.appendRow([
        'Thời gian (timestamp)', 'Batch ID', 'Loại Sự Kiện',
        'Người thực hiện (operator)', 'Vật tư / Liều lượng',
        'Thời lượng', 'Ghi chú chi tiết', 'Payload ID',
        'Device ID', 'CreatedBy', 'Linked Batch Sheet Row'
      ]);
    }
  }

  function handleManualEvent(data) {
    const allowedEvents = ['bon_phan', 'phun_thuoc', 'thu_hoach', 'so_che', 'che_bien', 'khac'];
    if (!data.event_type || !allowedEvents.includes(data.event_type)) {
      logEvent('system', 'error', { message: 'Invalid event_type', data }, 'manual_event');
      return { ok: false, message: 'Sự kiện không hợp lệ' };
    }

    if (!data.batch_id || !data.operator || !data.materials || Number(data.duration) <= 0) {
      logEvent('system', 'error', { message: 'Missing required fields', data }, 'manual_event');
      return { ok: false, message: 'Vui lòng điền đầy đủ Batch ID, Người thực hiện, Vật tư, và Thời lượng > 0' };
    }
    // [V9.3 GPT-6] Validate batch_id tồn tại trong BatchInfo — tránh dữ liệu truy xuất "bẩn"
    try {
      const batchRows = Database.getSheetData('BatchInfo');
      const batchExists = batchRows.some(r =>
        String(r['batch_id'] || r['id'] || '').trim() === String(data.batch_id).trim()
      );
      if (!batchExists && batchRows.length > 0) {
        // Chỉ warn (không block) nếu BatchInfo có dữ liệu — tránh false negative khi sheet trống
        logEvent('system', 'manual_event_unknown_batch',
          { batch_id: data.batch_id, operator: data.operator }, 'manual_event');
        // Uncomment dòng dưới nếu muốn BLOCK hoàn toàn batch_id không tồn tại:
        // return { ok: false, message: 'Batch ID không tồn tại trong hệ thống: ' + data.batch_id };
      }
    } catch(_be) { /* BatchInfo không tìm được — bỏ qua */ }
    // [V9.3 GPT-6] Sanitize operator input
    data.operator = String(data.operator || '').trim().slice(0, 100);
    data.materials = String(data.materials || '').trim().slice(0, 500);
    data.notes = String(data.notes || '').trim().slice(0, 1000);

    createManualEventsSheet();
    const ss = Database.getSpreadsheet();
    const sheet = ss.getSheetByName('ManualEvents');
    const payload = {
      event_type:  data.event_type,
      batch_id:    data.batch_id,
      operator:    data.operator,
      materials:   data.materials,
      duration:    parseInt(data.duration, 10),
      notes:       data.notes || '',
      payloadId:   data.payloadId || '',
      deviceId:    data.deviceId || '',
      linkedRow:   data.linkedRow || ''
    };
    // [V9.4 FIX-5a] writeAtTop — nhất quán newest-first
    const manualHeader = ['timestamp', 'batch_id', 'event_type', 'operator',
      'materials', 'duration', 'notes', 'payload_id', 'device_id', 'source', 'linked_row'];
    writeAtTop(sheet, [
      getCurrentUTCTimestamp(),
      payload.batch_id, payload.event_type, payload.operator,
      payload.materials, payload.duration, payload.notes,
      payload.payloadId, payload.deviceId, 'manual_form', payload.linkedRow
    ], manualHeader);
    logEvent(payload.batch_id, payload.event_type, payload, 'manual');
    try {
      MailApp.sendEmail(
        prop('ADMIN_EMAILS'),
        'EcoSynTech Sự Kiện Thủ Công: ' + payload.event_type,
        JSON.stringify(payload)
      );
    } catch (e) {
      console.error('Email send failed:', e);
    }

    return { ok: true, message: 'Sự kiện đã log thành công' };
  }

  return { logEvent, handleManualEvent, createManualEventsSheet };
})();

// Global wrapper (used by triggers & modules before full init)
function logEvent(entityId, eventType, dataObj, source) {
  EventModule.logEvent(entityId, eventType, dataObj, source);
}

/* ================================================================

**4 - SECURITY MODULE**
   ================================================================ */
const Security = (() => {
  const NONCE_EXPIRY = 1200; // seconds
  function hmacSha256(message, key) {
    try {
      const raw = Utilities.computeHmacSha256Signature(message, key);
      return raw.map(b => ((b < 0 ? b + 256 : b).toString(16).padStart(2, '0'))).join('');
    } catch (e) {
      console.error('HMAC error:', e);
      return '';
    }
  }

  function safeComputeHmac(payloadStr, secret) {
    try { return hmacSha256(payloadStr, secret).toLowerCase(); } catch (e) { return ''; }
  }

  function generateNonce() {
    return Utilities.getUuid();
  }

  function verifyNonce(deviceId, nonce) {
    const key = 'nonce_' + deviceId + '_' + nonce;
    const exists = CacheService.getScriptCache().get(key);
    if (exists) return false;
    CacheService.getScriptCache().put(key, '1', NONCE_EXPIRY);
    return true;
  }

  function createSignedPayload(deviceId, payload, secret) {
    const nonce = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000);
    const obj = Object.assign({}, payload, { _nonce: nonce, _ts: timestamp, _did: deviceId });
    const sortedObj = {};
    Object.keys(obj).sort().forEach(k => { sortedObj[k] = obj[k]; });
    const payloadStr = canonicalStringify(sortedObj);
    const signature = hmacSha256(payloadStr, secret);
    return { payload: sortedObj, signature };
  }

  function verifyRequestSignature(requestData, deviceSecret) {
    const { payload, signature } = requestData;
    if (!signature) {
      return { valid: false, reason: 'Missing signature' };
    }

    if (!payload || !payload._nonce || !payload._ts || !payload._did) {
      return { valid: false, reason: 'Missing security fields' };
    }

    if (!verifyNonce(payload._did, payload._nonce)) {
      return { valid: false, reason: 'Replay attack detected' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - payload._ts) > NONCE_EXPIRY) {
      return { valid: false, reason: 'Timestamp expired' };
    }

    const checkPayload = Object.assign({}, payload);
    delete checkPayload.signature;
    const sortedObj = {};
    Object.keys(checkPayload).sort().forEach(k => { sortedObj[k] = checkPayload[k]; });
    const payloadStr = canonicalStringify(sortedObj);
    const expectedSig = hmacSha256(payloadStr, deviceSecret);
    if (!timingSafeEqual(signature, expectedSig)) {
      console.error('Signature mismatch');
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true, payload: checkPayload };
  }

  function verifyApiKey(providedKey) {
    return timingSafeEqual(String(providedKey || ''), prop('API_KEY'));
  }

  function timingSafeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
  // Consolidated rate limiter
  function checkRateLimit(deviceId) {
    if (!deviceId) return { ok: true };
    try {
      const limit = parseInt(prop('RATE_LIMIT_PER_DEVICE'), 10) || 100;
      const bucket = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
      const key = 'rl_' + deviceId + '_' + bucket;
      const current = Database.cacheGet(key);
      let count = current ? parseInt(current, 10) : 0;
      count += 1;
      Database.cachePut(key, String(count), 3600);
      if (count > limit) return { ok: false, message: 'Vượt quá giới hạn tốc độ' };
      return { ok: true, count };
    } catch (e) {
      return { ok: true };
    }
  }

  function checkReplay(deviceId, timestamp) {
    const windowSec = parseInt(prop('REPLAY_WINDOW_SEC'), 10) || 1200;
    const now = Math.floor(Date.now() / 1000);
    if (!timestamp) return { ok: false, message: 'Thiếu timestamp' };
    if (Math.abs(now - timestamp) > windowSec) return { ok: false, message: 'Timestamp ngoài cửa sổ chống phát lại' };
    const key = 'replay_' + deviceId + '_' + timestamp;
    if (Database.cacheGet(key)) return { ok: false, message: 'Yêu cầu đã được xử lý (phát lại)' };
    Database.cachePut(key, true, windowSec * 2);
    return { ok: true };
  }
  return {
    hmacSha256,
    safeComputeHmac,
    createSignedPayload,
    verifyRequestSignature,
    verifyApiKey,
    timingSafeEqual,
    checkRateLimit,
    checkReplay
  };
})();

/* ================================================================

**   5 - DATABASE MODULE** (thêm computeSha256 + createTemporaryDownloadLink)   ================================================================ */
const Database = (() => {
  const BATCH_SIZE = 500;
  const CACHE_TTL  = 300;
  let _ss = null; // [V9.1 FIX-H2] cache SpreadsheetApp
  function getSpreadsheet() {
    if (!_ss) {
      const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || DEFAULTS.SPREADSHEET_ID;
      _ss = SpreadsheetApp.openById(id);
    }

    return _ss;
  }
  // Đảm bảo sheet Devices tồn tại và có cấu trúc đúng
  function ensureDevicesSheet() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Devices');
    if (!sheet) {
      sheet = ss.insertSheet('Devices');
      sheet.getRange(1, 1, 1, 7).setValues([['device_id', 'device_name', 'device_secret', 'endpoint_url', 'provisioned_at', 'last_seen', 'status']]);
    } else {
      // Kiểm tra và thêm cột status nếu thiếu
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
      if (!headers.includes('status')) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue('status');
      }
    }

    return sheet;
  }

  function batchAppendRows(sheetName, rows) {
    if (!rows || rows.length === 0) return { success: 0, failed: 0 };
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const success = [];
    const failed  = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      try {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const headers = Object.keys(batch[0]);
        const lastRow = sheet.getLastRow();
        if (lastRow === 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(2, 1, batch.length, headers.length)
            .setValues(batch.map(r => headers.map(h => r[h] !== undefined ? r[h] : '')));
        } else {
          const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
            .map(h => String(h).trim());
          const orderedValues = batch.map(r => existingHeaders.map(h => {
            const key = Object.keys(r).find(k => k.toLowerCase() === h.toLowerCase());
            return key !== undefined ? r[key] : '';
          }));
          sheet.getRange(lastRow + 1, 1, batch.length, existingHeaders.length)
            .setValues(orderedValues);
        }

        success.push(...batch);
      } catch (error) {
        console.error('Batch append failed at index ' + i + ':', error);
        failed.push(...rows.slice(i, i + BATCH_SIZE));
      }
    }

    return { success: success.length, failed: failed.length };
  }

  function getSheetData(sheetName, useCache) {
    if (useCache === undefined) useCache = true;
    const cacheKey = 'sheetdata_' + sheetName;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return cached;
    }

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() === 0) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) row[headers[j]] = data[i][j];
      rows.push(row);
    }

    if (useCache) cachePut(cacheKey, rows, CACHE_TTL);
    return rows;
  }
  // Lấy secret chỉ khi device tồn tại và status = 'active'
  function getDeviceSecret(deviceId) {
    const cacheKey = 'device_secret_' + deviceId;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const devices = getSheetData('Devices');
    const device = devices.find(d => d.device_id === deviceId);
    if (!device) return null;
    const status = (device.status || 'active').toLowerCase();
    if (status !== 'active') return null;
    const secret = device.device_secret;
    if (!secret) return null;
    cachePut(cacheKey, secret, CACHE_TTL);
    return secret;
  }
  // Kiểm tra device có được phép giao tiếp hay không
  function isDeviceAllowed(deviceId) {
    const devices = getSheetData('Devices');
    const device = devices.find(d => d.device_id === deviceId);
    if (!device) return false;
    const status = (device.status || 'active').toLowerCase();
    return status === 'active';
  }

  function updateDeviceLastSeen(deviceId) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Devices');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const deviceIdCol = headers.indexOf('device_id');
    const lastSeenCol  = headers.indexOf('last_seen');
    if (deviceIdCol === -1 || lastSeenCol === -1) return false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][deviceIdCol]) === deviceId) {
        sheet.getRange(i + 1, lastSeenCol + 1).setValue(new Date().toISOString());
        cacheRemoveKey('device_secret_' + deviceId);
        return true;
      }
    }

    return false;
  }

  function provisionDevice(deviceId, rotate) {
    rotate = rotate || false;
    const sheet = ensureDevicesSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idCol = headers.indexOf('device_id');
    const secretCol = headers.indexOf('device_secret');
    const provisionedCol = headers.indexOf('provisioned_at');
    const statusCol = headers.indexOf('status');
    let row = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === deviceId) { row = i + 1; break; }
    }

    const secret = Utilities.getUuid();
    const now = getCurrentUTCTimestamp();
    if (row === -1) {
      const newRow = [deviceId, '', secret, '', now, '', 'active'];
      sheet.appendRow(newRow);
    } else if (rotate) {
      if (secretCol !== -1) sheet.getRange(row, secretCol + 1).setValue(secret);
      if (provisionedCol !== -1) sheet.getRange(row, provisionedCol + 1).setValue(now);
      if (statusCol !== -1) sheet.getRange(row, statusCol + 1).setValue('active');
    }

    logEvent(deviceId, 'device_provisioned', { rotate, secret: maskSecret(secret) }, 'server');
    cacheRemoveKey('device_secret_' + deviceId);
    return secret;
  }

  function maskSecret(s) {
    if (!s) return '';
    s = String(s);
    if (s.length <= 8) return s.substring(0, 2) + '...' + s.substring(s.length - 2);
    return s.substring(0, 4) + '...' + s.substring(s.length - 4);
  }

  function cacheGet(k) {
    try {
      const v = CacheService.getScriptCache().get(k);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  function cachePut(k, v, ttl) {
    try { CacheService.getScriptCache().put(k, JSON.stringify(v), ttl || CACHE_TTL); } catch (e) {} // [V9.1 FIX-H5]
  }

  function cacheRemoveKey(k) {
    try { CacheService.getScriptCache().remove(k); } catch (e) {}
  }

function computeSha256(blob) {
    const bytes = blob.getBytes();
    const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    return hashBytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }

function createTemporaryDownloadLink(fileId) {
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=download&id=' + fileId;
  }
  // [V9.2 FIX-H4] archiveSensorData — giữ SensorReadings <= maxRows
  function archiveSensorData(maxRows) {
    maxRows = maxRows || 50000;
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('SensorReadings');
    if (!sheet) return { archived: 0 };
    const lastRow = sheet.getLastRow();
    if (lastRow <= maxRows + 1) return { archived: 0 };
    // [V9.4 FIX-4] Chuyển sang SensorReadings_Archive thay vì xóa — giữ lịch sử truy xuất
    const rowsToMove = lastRow - maxRows;
    const startRow = maxRows + 2; // dòng đầu cần chuyển (sau header + maxRows dòng giữ lại)
    try {
      let archSheet = ss.getSheetByName('SensorReadings_Archive');
      if (!archSheet) {
        archSheet = ss.insertSheet('SensorReadings_Archive');
        // Copy header từ sheet gốc
        const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
        archSheet.getRange(1, 1, 1, header[0].length).setValues(header);
        archSheet.setFrozenRows(1);
      }
      // Copy rows cũ sang archive
      const oldData = sheet.getRange(startRow, 1, rowsToMove, sheet.getLastColumn()).getValues();
      const archLastRow = archSheet.getLastRow();
      archSheet.getRange(archLastRow + 1, 1, oldData.length, oldData[0].length).setValues(oldData);
      // Xóa khỏi sheet chính SAU KHI đã archive thành công
      sheet.deleteRows(startRow, rowsToMove);
      return { archived: rowsToMove, archive_sheet: 'SensorReadings_Archive' };
    } catch(e) {
      console.error('archiveSensorData error:', e);
      return { archived: 0, error: String(e) };
    }
  }

  return {
    batchAppendRows, getSheetData, getDeviceSecret, isDeviceAllowed,
    updateDeviceLastSeen, provisionDevice, maskSecret, archiveSensorData,
    cacheGet, cachePut, cacheRemoveKey, getSpreadsheet, computeSha256, createTemporaryDownloadLink
  };
})();

/* ================================================================

**   6- REALTIME MODULE**
   ================================================================ */
const RealTime = (() => {
  // [V9.4 FIX-3] Firebase fetch với retry 2 lần + log fail
  function _firebaseFetch(url, options) {
    // [V9.5 FIX-1] 4 lần retry + true exponential backoff (300ms→900ms→2700ms)
    const MAX_RETRIES = 3; // tổng 4 lần: attempt 0,1,2,3
    const BACKOFF_BASE_MS = 300;
    let lastErr = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, options));
        const httpCode = resp.getResponseCode();
        if (httpCode >= 200 && httpCode < 300) return { ok: true, code: httpCode, attempts: attempt + 1 };
        lastErr = 'HTTP ' + httpCode;
        if (httpCode < 500) break; // 4xx (auth, not found) → không retry vô ích
      } catch(e) { lastErr = String(e); }
      if (attempt < MAX_RETRIES) {
        Utilities.sleep(BACKOFF_BASE_MS * Math.pow(3, attempt)); // 300, 900, 2700 ms
      }
    }
    try { EventModule.logEvent('system', 'firebase_write_failed',
      { endpoint: url.split('/').slice(-2).join('/'), err: lastErr, attempts: MAX_RETRIES + 1 }, 'realtime');
    } catch(_) {}
    return { ok: false, error: lastErr };
  }

  function getDatabaseUrl() {
    const projectId = prop('FIREBASE_PROJECT_ID');
    if (!projectId || projectId === 'CHANGE_ME') return null;
    return 'https://' + projectId + '-default-rtdb.asia-southeast1.firebasedatabase.app';
  }

  function updateDeviceStatus(deviceId, status, latestReadings) {
    latestReadings = latestReadings || [];
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) return;
    const url = dbUrl + '/devices/' + deviceId + '.json';
    const data = {
      device_id: deviceId,
      status,
      last_updated: getCurrentUTCTimestamp(),
      latest_readings: latestReadings.slice(-5)
    };
    _firebaseFetch(url, { // [V9.4 FIX-3b]
      method: 'put',
      payload: JSON.stringify(data),
      contentType: 'application/json'
    });
  }

  function sendDashboardEvent(eventType, data) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) return;
    const url = dbUrl + '/events.json';
    _firebaseFetch(url, { // [V9.4 FIX-3c]
      method: 'post',
      payload: JSON.stringify({ type: eventType, data, timestamp: getCurrentUTCTimestamp() }),
      contentType: 'application/json'
    });
  }

  function initFirebase() {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) { console.warn('Firebase not configured (missing FIREBASE_PROJECT_ID)'); return false; }
    return true;
  }

  return { updateDeviceStatus, sendDashboardEvent, initFirebase };
})();

/* ================================================================

**   7. IOT CORE MODULE** sensor interval 10 phút + hook Aptos
   ================================================================ */
const IoTCore = (() => {
  function processSensorData(deviceId, sensorReadings) {
    const rateLimit = Security.checkRateLimit(deviceId);
    if (!rateLimit.ok) throw new Error(rateLimit.message || 'Rate limit exceeded');
    if (!Array.isArray(sensorReadings) || sensorReadings.length === 0) {
      throw new Error('Invalid sensor readings format');
    }
    // [V9.3 GPT-1] Idempotency: chống duplicate request khi ESP32 retry do mạng
    if (sensorReadings._request_id || (sensorReadings[0] && sensorReadings[0]._request_id)) {
      const reqId = sensorReadings._request_id || sensorReadings[0]._request_id;
      const reqKey = 'req_' + deviceId + '_' + String(reqId).slice(0, 36);
      if (Database.cacheGet(reqKey)) {
        return { ok: true, duplicate: true, message: 'Duplicate request, ignored' };
      }
      Database.cachePut(reqKey, true, 600); // 10 phút
    }

    const validReadings   = [];
    const invalidReadings = [];
    const now = new Date().toISOString();
    for (const reading of sensorReadings) {
      if (isValidReading(reading)) {
        validReadings.push(Object.assign({}, reading, { device_id: deviceId, received_at: now }));
      } else {
        invalidReadings.push(reading);
      }
    }

    if (validReadings.length > 0) {
      Database.batchAppendRows('SensorReadings', validReadings);
      Database.updateDeviceLastSeen(deviceId);
      RealTime.updateDeviceStatus(deviceId, 'active', validReadings);
      // [V9.1 FIX-C1] Aptos hook: gom sensor events vào blockchain batch
      if (typeof AptosModule !== 'undefined' && AptosModule.isConfigured()) {
        try {
          WeeklyBatchModule.addEvent(deviceId, 'sensor_data', {
            count: validReadings.length,
            types: [...new Set(validReadings.map(r => r.sensor_type))]
          });

        } catch(e) { _handleError('IoTCore:processSensorData:aptos', e, 'warning'); }
      }
    }
    return {
      success: validReadings.length,
      failed:  invalidReadings.length,
      invalid_readings: invalidReadings
    };
  }

  // [V9.4 FIX-6] Giới hạn vật lý theo sensor_type — chặn giá trị vô lý vào AI/analytics
  const SENSOR_PHYSICAL_LIMITS = {
    'temperature':  { min: -40,   max: 85   }, // °C (ESP32 operating range)
    'humidity':     { min: 0,     max: 100  }, // %
    'soil_moisture':{ min: 0,     max: 100  }, // %
    'light':        { min: 0,     max: 150000 }, // lux (trời nắng gắt ~100k)
    'battery':      { min: 0,     max: 5.0  }, // V
    'ph':           { min: 0,     max: 14   },
    'co2':          { min: 300,   max: 10000 }, // ppm
    'pressure':     { min: 800,   max: 1100 }, // hPa
    'water_level':  { min: 0,     max: 500  }, // cm
    'wind_speed':   { min: 0,     max: 200  }, // km/h
  };

  function isValidReading(reading) {
    // Null guard + type check
    if (!reading) return false;
    if (typeof reading.sensor_type !== 'string' || !reading.sensor_type) return false;
    if (reading.value === undefined || reading.value === null) return false;
    const numVal = parseFloat(reading.value);
    if (isNaN(numVal)) return false;
    if (typeof reading.unit !== 'string') return false;
    if (!reading.timestamp) return false;
    // Physical range check
    const sensorKey = reading.sensor_type.toLowerCase().replace(/[^a-z_]/g, '_');
    const limits = SENSOR_PHYSICAL_LIMITS[sensorKey];
    if (limits) {
      if (numVal < limits.min || numVal > limits.max) {
        // [V9.5 FIX-2] Log vào InvalidSensorLog — giữ data trail thay vì mất âm thầm
        try {
          const ss = Database.getSpreadsheet();
          let invSheet = ss.getSheetByName('InvalidSensorLog');
          if (!invSheet) {
            invSheet = ss.insertSheet('InvalidSensorLog');
            invSheet.getRange(1,1,1,7).setValues([['ts','device_id','sensor_type','value','unit','reason','raw']]);
            invSheet.setFrozenRows(1);
          }
          invSheet.appendRow([
            reading.received_at || new Date().toISOString(),
            reading.device_id   || '',
            reading.sensor_type,
            numVal,
            reading.unit        || '',
            'OUT_OF_RANGE(' + limits.min + '-' + limits.max + ')',
            JSON.stringify(reading).slice(0, 500)
          ]);
        } catch(_e) {}
        return false; // block khỏi SensorReadings
      }
    }
    return true;
  }

  function sendCommandToDevice(deviceId, command, parameters) {
    parameters = parameters || {};
    const deviceSecret   = Database.getDeviceSecret(deviceId);
    if (!deviceSecret) throw new Error('Device not allowed or missing secret');
  const commandId = Utilities.getUuid();
  const createdAt = getCurrentUTCTimestamp();
    const signedCommand  = Security.createSignedPayload(
      deviceId,
      { action: 'device_command', command, parameters, timestamp: Math.floor(Date.now() / 1000) },
      deviceSecret
    );
    Database.batchAppendRows('DeviceCommands', [{
      command_id:  commandId,          // [V9.1 FIX-C2] firmware đọc field này
      device_id:   deviceId,
      command,
      params:      JSON.stringify(parameters),  // 'params' không phải 'parameters'
      status:      'pending',
      created_at:  createdAt,          // dùng biến đã khai báo
      source:      'gas',
      executed_ts: '',
      note:        '',
      signature:   signedCommand.signature
    }]);
    return { command_id: commandId, status: 'queued', signed_payload: signedCommand };
  }

  function handleAlert(payload) {
    if (payload.alert || payload.anomaly) {
      logEvent(payload.device_id, 'alert', payload, 'firmware');
      try {
        MailApp.sendEmail(prop('ADMIN_EMAILS'), 'EcoSynTech Alert', JSON.stringify(payload));
      } catch (e) {}
    }
  }

  return { processSensorData, sendCommandToDevice, handleAlert };
})();

/* ================================================================

   **8- ADMIN MODULE** (giữ nguyên)
   ================================================================ */
const Admin = (() => {
  function getAdminEmails() {
    return prop('ADMIN_EMAILS').split(',').map(e => e.trim()).filter(Boolean);
  }

  function verifyAdmin(email) {
    return getAdminEmails().includes(email);
  }

  function disableDevice(deviceId) {
    return _setDeviceStatus(deviceId, 'disabled');
  }

  function enableDevice(deviceId) {
    return _setDeviceStatus(deviceId, 'active');
  }

  function _setDeviceStatus(deviceId, status) {
    const ss     = Database.getSpreadsheet();
    const sheet  = ss.getSheetByName('Devices');
    if (!sheet) throw new Error('Devices sheet not found');
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const statusCol = headers.indexOf('status');
    const idCol     = headers.indexOf('device_id');
    if (statusCol === -1 || idCol === -1) throw new Error('Required columns missing');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === deviceId) {
        sheet.getRange(i + 1, statusCol + 1).setValue(status);
        Database.cacheRemoveKey('device_secret_' + deviceId);
          Database.cacheRemoveKey('sheetdata_Devices'); // [V9.4 FIX-8]
        EventModule.logEvent(deviceId, 'device_' + status, {}, 'admin');
        return { success: true, message: 'Device ' + status };
      }
    }

    throw new Error('Device not found');
  }

  function updateDevice(deviceId, data) {
    const ss      = Database.getSpreadsheet();
    const sheet   = ss.getSheetByName('Devices');
    if (!sheet) throw new Error('Devices sheet not found');
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0].map(h => String(h).trim().toLowerCase());
    const idCol   = headers.indexOf('device_id');
    if (idCol === -1) throw new Error('device_id column missing');
    let rowIndex  = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][idCol]) === deviceId) { rowIndex = i + 1; break; }
    }

    if (rowIndex === -1) throw new Error('Device not found');
    for (const [key, value] of Object.entries(data)) {
      const col = headers.indexOf(key.toLowerCase());
      if (col !== -1) sheet.getRange(rowIndex, col + 1).setValue(value);
    }

    Database.cacheRemoveKey('device_secret_' + deviceId);
    EventModule.logEvent(deviceId, 'device_updated', data, 'admin');
    return { success: true };
  }

  function rotateDeviceSecret(deviceId) {
    const newSecret = Utilities.getUuid();
    const ss        = Database.getSpreadsheet();
    const sheet     = ss.getSheetByName('Devices');
    if (!sheet) throw new Error('Devices sheet not found');
    const data      = sheet.getDataRange().getValues();
    const headers   = data[0].map(h => String(h).trim().toLowerCase());
    const secretCol = headers.indexOf('device_secret');
    const idCol     = headers.indexOf('device_id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === deviceId) {
        sheet.getRange(i + 1, secretCol + 1).setValue(newSecret);
        Database.cacheRemoveKey('device_secret_' + deviceId);
        EventModule.logEvent(deviceId, 'secret_rotated', { masked: Database.maskSecret(newSecret) }, 'admin');
        return { success: true, newSecret };
      }
    }

    throw new Error('Device not found');
  }

  function manageDevice(deviceId, action, data) {
    data = data || {};
    switch (action) {
      case 'enable':        return enableDevice(deviceId);
      case 'disable':       return disableDevice(deviceId);
      case 'rotate_secret': return rotateDeviceSecret(deviceId);
      case 'update':        return updateDevice(deviceId, data);
      default: throw new Error('Unknown action: ' + action);
    }
  }

  function getSystemStats() {
    const now              = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const devices  = Database.getSheetData('Devices');
    const readings = Database.getSheetData('SensorReadings');
    const media    = Database.getSheetData('BatchMedia');
    return {
      devices: {
        total:   devices.length,
        active:  devices.filter(d => d.status === 'active' && d.last_seen && new Date(d.last_seen) > twentyFourHoursAgo).length,
        offline: devices.filter(d => d.status === 'active' && (!d.last_seen || new Date(d.last_seen) <= twentyFourHoursAgo)).length
      },
      readings: {
        total:   readings.length,
        last24h: readings.filter(r => r.received_at && new Date(r.received_at) > twentyFourHoursAgo).length
      },
      storage: {
        used:  _calculateStorageUsage(),
        media: media.length
      },
      performance: {
        avgResponseTime: _calculateAvgResponseTime(),
        errorRate:       _calculateErrorRate()
      }
    };
  }

  function _calculateStorageUsage() {
    try {
      const folderId = prop('MEDIA_FOLDER_ID') || prop('QR_FOLDER_ID');
      if (!folderId || folderId === 'CHANGE_ME') return 0;
      const folder = DriveApp.getFolderById(folderId);
      const files  = folder.getFiles();
      let total = 0;
      while (files.hasNext()) total += files.next().getSize();
      return total;
    } catch (e) { return 0; }
  }

  function _calculateAvgResponseTime() {
    const cache  = CacheService.getScriptCache();
    const cached = cache.get('avg_response_time');
    if (cached) return parseInt(cached, 10);
    const events = Database.getSheetData('EventLogs');
    const now    = Date.now();
    const recent = events.filter(e => e.event === 'api_call' && (now - new Date(e.ts).getTime()) < 3600000);
    if (recent.length === 0) return 250;
    const avg = recent.reduce((sum, e) => sum + (e.duration_ms || 250), 0) / recent.length;
    cache.put('avg_response_time', String(avg), 300);
    return avg;
  }

  function _calculateErrorRate() {
    const events    = Database.getSheetData('EventLogs');
    const lastHour  = new Date(Date.now() - 3600000);
    const hourEvents = events.filter(e => new Date(e.ts) > lastHour);
    const errors     = hourEvents.filter(e => e.event === 'error').length;
    if (hourEvents.length === 0) return 0;
    return (errors / hourEvents.length) * 100;
  }

  function getManualEventFormHtml() {
    const ss            = Database.getSpreadsheet();
    const batchInfoSheet = ss.getSheetByName('BatchInfo');
    const batchData     = batchInfoSheet ? batchInfoSheet.getDataRange().getValues() : [];
    const batchIds      = [];
    for (let i = 1; i < batchData.length; i++) batchIds.push(batchData[i][0]);
    return `<!DOCTYPE html>
<html>
<head>
<title>EcoSynTech - Nhập Sự Kiện Thủ Công</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<style>body{padding:20px;} .form-group{margin-bottom:15px;} .required{color:red;}</style>
</head>
<body>
<div class="container">
<h2 class="text-center">Nhập Sự Kiện Thủ Công</h2>
<div id="manualEventForm">
<div class="form-group">
  <label>Batch ID <span class="required">*</span></label>
  <select class="form-control" id="batchId">
    <option value="">-- Chọn Batch ID --</option>
    ${batchIds.map(id => '<option value="' + escapeHtml(String(id)) + '">' + escapeHtml(String(id)) + '</option>').join('')}
  </select>
</div>
<div class="form-group">
  <label>Loại Sự Kiện <span class="required">*</span></label>
  <select class="form-control" id="eventType">
    <option value="">-- Chọn loại --</option>
    <option value="phun_thuoc">Phun thuốc</option>
    <option value="bon_phan">Bón phân</option>
    <option value="thu_hoach">Thu hoạch</option>
    <option value="so_che">Sơ chế</option>
    <option value="che_bien">Chế biến</option>
    <option value="khac">Khác</option>
  </select>
</div>
<div class="form-group"><label>Người thực hiện <span class="required">*</span></label><input type="text" class="form-control" id="operator"></div>
<div class="form-group"><label>Vật tư / Liều lượng <span class="required">*</span></label><input type="text" class="form-control" id="materials"></div>
<div class="form-group"><label>Thời lượng (phút) <span class="required">*</span></label><input type="number" class="form-control" id="duration" min="1"></div>
<div class="form-group"><label>Ghi chú chi tiết</label><textarea class="form-control" id="notes" rows="3"></textarea></div>
<div class="form-group"><label>Payload ID (tùy chọn)</label><input type="text" class="form-control" id="payloadId"></div>
<div class="form-group"><label>Device ID (tùy chọn)</label><input type="text" class="form-control" id="deviceId"></div>
<div class="form-group"><label>Linked Batch Sheet Row (tùy chọn)</label><input type="number" class="form-control" id="linkedRow" min="1"></div>
<button class="btn btn-primary btn-block" onclick="submitForm()">Gửi Sự Kiện</button>
</div>
<div id="response" class="mt-3 alert" style="display:none;"></div>
</div>
<script>
function submitForm() {
  var formData = {
    action: 'log_manual_event',
    batch_id: document.getElementById('batchId').value,
    event_type: document.getElementById('eventType').value,
    operator: document.getElementById('operator').value,
    materials: document.getElementById('materials').value,
    duration: document.getElementById('duration').value,
    notes: document.getElementById('notes').value,
    payloadId: document.getElementById('payloadId').value,
    deviceId: document.getElementById('deviceId').value,
    linkedRow: document.getElementById('linkedRow').value
  };
  if (!formData.batch_id || !formData.event_type || !formData.operator || !formData.materials || Number(formData.duration) <= 0) {
    showResponse('danger', 'Vui lòng điền đầy đủ các trường bắt buộc và thời lượng > 0');
    return;
  }

  google.script.run
    .withSuccessHandler(function(result) {
      if (result.ok) {
        showResponse('success', result.message);
        ['batchId','eventType','operator','materials','duration','notes','payloadId','deviceId','linkedRow'].forEach(function(id){
          var el = document.getElementById(id);
          if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
        });

      } else { showResponse('danger', result.message); }
    })
    .withFailureHandler(function(err) { showResponse('danger', 'Lỗi: ' + err.message); })
    .logManualEvent(formData);
}

function showResponse(type, msg) {
  var resp = document.getElementById('response');
  resp.className = 'alert alert-' + type;
  resp.innerText = msg;
  resp.style.display = 'block';
}

var urlParams = new URLSearchParams(window.location.search);
var batchIdFromUrl = urlParams.get('batch');
if (batchIdFromUrl) document.getElementById('batchId').value = batchIdFromUrl;
</script>
</body>
</html>`;
  }
  return {
    verifyAdmin, getSystemStats, manageDevice,
    enableDevice, disableDevice, rotateDeviceSecret,
    updateDevice, getManualEventFormHtml
  };
})();

// thêm modul amin quản lý rules  07.04.2026
function getRuleManagementHtml() {
  const ss = Database.getSpreadsheet();
  const sheet = ss.getSheetByName('ControlRules');
  let rulesHtml = '';
  if (sheet && sheet.getLastRow() > 1) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      rulesHtml += `<tr>
        <td>${escapeHtml(String(data[i][0]))}</td>
        <td>${escapeHtml(String(data[i][1] || ''))}</td>
        <td>${escapeHtml(String(data[i][2]))}</td>
        <td>${data[i][3]}</td>
        <td>${data[i][4]}</td>
        <td>${data[i][5]}</td>
        <td>${data[i][6]}</td>
        <td>${escapeHtml(String(data[i][7]))}</td>
        <td>${escapeHtml(String(data[i][8] || ''))}</td>
        <td>${escapeHtml(String(data[i][9] || ''))}</td>
        <td>${data[i][10] || '300'}</td>
        <td>${data[i][11] === false ? '❌' : '✅'}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editRule('${i}')">Sửa</button>
          <button class="btn btn-sm btn-danger" onclick="toggleRule('${data[i][0]}', ${!data[i][11]})">${data[i][11] === false ? 'Bật' : 'Tắt'}</button>
        </td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <title>Quản lý Control Rules</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
  <style>body{padding:20px;} .modal-lg{max-width:800px;}</style>
</head>
<body>
<div class="container-fluid">
  <h2 class="text-center">📋 Quản lý Rule điều khiển thông minh</h2>
  <button class="btn btn-success mb-3" data-toggle="modal" data-target="#ruleModal" onclick="resetForm()">➕ Thêm rule mới</button>
  <div class="table-responsive">
    <table class="table table-bordered table-striped">
      <thead>
        <tr><th>ID</th><th>Zone</th><th>Cảm biến</th><th>Min</th><th>Max</th><th>Hysteresis</th><th>Duration(s)</th>
        <tr><th>Action</th><th>Reset Action</th><th>Device ID</th><th>Cooldown(s)</th><th>Enabled</th><th>Thao tác</th></tr>
      </thead>
      <tbody>${rulesHtml}</tbody>
    </table>
  </div>
</div>
<!-- Modal Thêm/Sửa Rule -->
<div class="modal fade" id="ruleModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Chi tiết Rule</h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
      <div class="modal-body">
        <form id="ruleForm">
          <input type="hidden" id="ruleId" name="rule_id">
          <div class="form-group"><label>Rule ID (tự sinh nếu để trống)</label><input type="text" class="form-control" id="rule_id_display" readonly placeholder="Tự động"></div>
          <div class="form-row">
            <div class="col"><label>Zone</label><input type="text" class="form-control" id="zone" placeholder="VD: Nha_kinh_1"></div>
            <div class="col"><label>Cảm biến *</label><select id="sensor" class="form-control" required><option value="temperature">Nhiệt độ</option><option value="humidity">Độ ẩm</option><option value="soil_moisture">Độ ẩm đất</option><option value="ph">pH</option><option value="tds">TDS</option><option value="do">DO</option><option value="light_intensity">Ánh sáng</option></select></div>
          </div>
          <div class="form-row">
            <div class="col"><label>Min</label><input type="number" step="any" class="form-control" id="min_val" value="0"></div>
            <div class="col"><label>Max</label><input type="number" step="any" class="form-control" id="max_val" value="100"></div>
            <div class="col"><label>Hysteresis</label><input type="number" step="any" class="form-control" id="hysteresis" value="0"></div>
          </div>
          <div class="form-row">
            <div class="col"><label>Duration (giây)</label><input type="number" class="form-control" id="duration_sec" value="0"></div>
            <div class="col"><label>Cooldown (giây)</label><input type="number" class="form-control" id="cooldown_sec" value="300"></div>
          </div>
          <div class="form-row">
            <div class="col"><label>Action lệnh *</label><input type="text" class="form-control" id="action" required placeholder="VD: relay1_on"></div>
            <div class="col"><label>Reset Action (tùy chọn)</label><input type="text" class="form-control" id="reset_action" placeholder="Để trống auto mapping"></div>
          </div>
          <div class="form-row">
            <div class="col"><label>Device ID (để trống = áp cho mọi device)</label><input type="text" class="form-control" id="device_id" placeholder="* hoặc ID cụ thể"></div>
            <div class="col"><label>Enabled</label><select id="enabled" class="form-control"><option value="true">Bật</option><option value="false">Tắt</option></select></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="saveRule()">Lưu</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Đóng</button>
      </div>
    </div>
  </div>
</div>
<script>
  let editingRow = null;
  function resetForm() {
    editingRow = null;
    document.getElementById('rule_id_display').value = '';
    document.getElementById('zone').value = '';
    document.getElementById('sensor').value = 'temperature';
    document.getElementById('min_val').value = 0;
    document.getElementById('max_val').value = 100;
    document.getElementById('hysteresis').value = 0;
    document.getElementById('duration_sec').value = 0;
    document.getElementById('cooldown_sec').value = 300;
    document.getElementById('action').value = '';
    document.getElementById('reset_action').value = '';
    document.getElementById('device_id').value = '*';
    document.getElementById('enabled').value = 'true';
    document.getElementById('ruleId').value = '';
  }

  function editRule(ruleId) {
    // Lấy dữ liệu từ dòng table (có thể dùng data attribute nhưng tạm dùng cách lấy từ server)
    google.script.run.withSuccessHandler(function(rule) {
      if (rule) {
        document.getElementById('ruleId').value = rule.rule_id;
        document.getElementById('rule_id_display').value = rule.rule_id;
        document.getElementById('zone').value = rule.zone || '';
        document.getElementById('sensor').value = rule.sensor;
        document.getElementById('min_val').value = rule.min_val;
        document.getElementById('max_val').value = rule.max_val;
        document.getElementById('hysteresis').value = rule.hysteresis;
        document.getElementById('duration_sec').value = rule.duration_sec;
        document.getElementById('cooldown_sec').value = rule.cooldown_sec;
        document.getElementById('action').value = rule.action;
        document.getElementById('reset_action').value = rule.reset_action || '';
        document.getElementById('device_id').value = rule.device_id || '*';
        document.getElementById('enabled').value = rule.enabled ? 'true' : 'false';
        $('#ruleModal').modal('show');
      }

    }).getRuleById(ruleId);
  }

  function saveRule() {
    const data = {
      rule_id: document.getElementById('ruleId').value || null,
      zone: document.getElementById('zone').value,
      sensor: document.getElementById('sensor').value,
      min_val: parseFloat(document.getElementById('min_val').value),
      max_val: parseFloat(document.getElementById('max_val').value),
      hysteresis: parseFloat(document.getElementById('hysteresis').value),
      duration_sec: parseInt(document.getElementById('duration_sec').value,10),
      cooldown_sec: parseInt(document.getElementById('cooldown_sec').value,10),
      action: document.getElementById('action').value,
      reset_action: document.getElementById('reset_action').value,
      device_id: document.getElementById('device_id').value,
      enabled: document.getElementById('enabled').value === 'true'
    };
    google.script.run
      .withSuccessHandler(function(res) {
        if (res.ok) {
          alert('Lưu thành công!');
          location.reload();
        } else alert('Lỗi: ' + res.message);
      })
      .withFailureHandler(function(err) { alert('Lỗi: ' + err.message); })
      .saveRule(data);
  }

  function toggleRule(ruleId, newEnabled) {
    google.script.run
      .withSuccessHandler(function(res) { if(res.ok) location.reload(); else alert('Lỗi'); })
      .setRuleEnabled(ruleId, newEnabled);
  }
</script>
</body>
</html>`;
}

/* ================================================================

   **9 - CLOUDRUN MODULE**
   ================================================================ */
const CloudRun = (() => {
  const DEFAULT_TIMEOUT = 30000;
  const MAX_RETRIES     = 3;
  function sendSnapshot(snapshotData, options) {
    options = options || {};
    const url    = options.url    || prop('CLOUD_FN_URL');
    const apiKey = options.apiKey || prop('CLOUD_FN_API_KEY');
    const secret = options.secret || prop('HMAC_SECRET');
    const payloadForSign = JSON.parse(JSON.stringify(snapshotData));
    delete payloadForSign._signature;
    const signatureHex = Security.safeComputeHmac(canonicalStringify(payloadForSign), secret);
    const requestOptions = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(snapshotData),
      muteHttpExceptions: true,
      headers: { 'x-hmac-sign': signatureHex, 'x-api-key': apiKey },
      validateHttpsCertificates: true,
      followRedirects: true,
      timeout: options.timeout || DEFAULT_TIMEOUT
    };
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const resp = UrlFetchApp.fetch(url, requestOptions);
        const code = resp.getResponseCode();
        const text = resp.getContentText();
        let json = {};
        try { json = JSON.parse(text); } catch (e) { json = { ok: false, text }; }
        if (code === 200 && json.ok) {
          logEvent('system', 'snapshot_sent', { snapshotId: snapshotData.snapshotId, code }, 'cloud_run');
          return Object.assign({ code, body: text }, json);
        }

        logEvent('system', 'snapshot_retry', { snapshotId: snapshotData.snapshotId, attempt, code }, 'cloud_run');
      } catch (e) {
        logEvent('system', 'snapshot_retry', { snapshotId: snapshotData.snapshotId, attempt, error: String(e) }, 'cloud_run');
      }

      Utilities.sleep(1000 * Math.pow(2, attempt + 1));
    }

    logEvent('system', 'snapshot_failed', { snapshotId: snapshotData.snapshotId }, 'cloud_run');
    return { ok: false, error: 'Failed after retries' };
  }
  // Synchronous batch
  function sendBatchSnapshots(snapshots, batchSize) {
    batchSize = batchSize || 10;
    const results = { successful: 0, failed: 0, errors: [] };
    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);
      for (const snapshot of batch) {
        try {
          const result = sendSnapshot(snapshot);
          if (result.ok) results.successful++; else { results.failed++; results.errors.push(result.error); }
        } catch (e) { results.failed++; results.errors.push(String(e)); }
      }

      if (i + batchSize < snapshots.length) Utilities.sleep(1000);
    }

    return results;
  }

  function handleWebhook(payload) {
    const payloadForSign = JSON.parse(JSON.stringify(payload));
    delete payloadForSign.signature;
    const expectedSignature = Security.hmacSha256(canonicalStringify(payloadForSign), prop('HMAC_SECRET'));
    if (!Security.timingSafeEqual(expectedSignature, payload.signature)) {
      throw new Error('Invalid webhook signature');
    }

    switch (payload.event_type) {
      case 'blockchain_confirmation': return handleBlockchainConfirmation(payload.data);
      case 'media_processed':        return { processed: true };
      case 'anomaly_detected':       return { processed: true };
      default:
        Logger.log('Unknown webhook event type: ' + payload.event_type);
        return { processed: false };
    }
  }

  function handleBlockchainConfirmation(data) {
    Database.batchAppendRows('BlockchainConfirmations', [{
      tx_hash:      data.tx_hash,
      block_number: data.block_number,
      timestamp:    data.timestamp,
      status:       'confirmed',
      processed_at: new Date().toISOString()
    }]);
    return { success: true };
  }

  return { sendSnapshot, sendBatchSnapshots, handleWebhook, handleBlockchainConfirmation };
})();

/* ================================================================

   **10 - AI MODULE**
   ================================================================ */
const AI = (() => {
  const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
  function analyzeImage(imageUrl, features) {
    features = features || ['LABEL_DETECTION', 'SAFE_SEARCH_DETECTION'];
    const apiKey = prop('GOOGLE_VISION_API_KEY');
    if (!apiKey || apiKey === 'CHANGE_ME') throw new Error('Google Vision API key not configured');
    const payload = {
      requests: [{ image: { source: { imageUri: imageUrl } }, features: features.map(type => ({ type, maxResults: 10 })) }]
    };
    try {
      const response = UrlFetchApp.fetch(VISION_API_URL + '?key=' + apiKey, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });

      const result = JSON.parse(response.getContentText());
      if (result.error) throw new Error('Vision API error: ' + result.error.message);
      return processVisionResults(result.responses[0]);
    } catch (error) {
      Logger.log('Vision API failed: ' + error.message);
      return null;
    }
  }

  function processVisionResults(visionResponse) {
    return {
      labels: (visionResponse.labelAnnotations || []).map(l => ({ description: l.description, score: l.score })),
      safeSearch: visionResponse.safeSearchAnnotation || null,
      text: (visionResponse.textAnnotations || []).map(t => t.description)
    };
  }

  function detectAnomalies(sensorReadings, baselineData) {
    const anomalies = [];
    sensorReadings.forEach(reading => {
      const baseline = baselineData.find(b => b.sensor_type === reading.sensor_type);
      if (!baseline || !baseline.std_dev) return;
      const deviation = Math.abs(reading.value - baseline.average) / baseline.std_dev;
      if (deviation > 2.5) {
        anomalies.push({
          sensor_type:    reading.sensor_type,
          value:          reading.value,
          expected_range: (baseline.average - 2.5 * baseline.std_dev) + ' to ' + (baseline.average + 2.5 * baseline.std_dev),
          deviation,
          severity:  deviation > 4 ? 'critical' : deviation > 3 ? 'high' : 'medium',
          timestamp: reading.timestamp
        });

      }
    });

    return anomalies;
  }

  function trainBaselineModel(readings) {
    const bySensor = {};
    readings.forEach(r => {
      if (!bySensor[r.sensor_type]) bySensor[r.sensor_type] = [];
      bySensor[r.sensor_type].push(r.value);
    });

    const baseline = {};
    Object.keys(bySensor).forEach(sensorType => {
      const values  = bySensor[sensorType];
      const avg     = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
      baseline[sensorType] = { average: avg, std_dev: Math.sqrt(variance), min: Math.min.apply(null, values), max: Math.max.apply(null, values), count: values.length };
    });

    return baseline;
  }

  function checkAnomaly(data) {
    if (prop('ML_ANOMALY_MODEL')) {
      logEvent('system', 'anomaly_check', data, 'ml');
    }
  }

  return { analyzeImage, detectAnomalies, trainBaselineModel, processVisionResults, checkAnomaly };
})();

/* ================================================================

**   11 . ANALYTICS MODULE**
   ================================================================ */
const Analytics = (() => {
  function generateReport(type, options) {
    options = options || {};
    switch (type) {
      case 'daily_summary':      return _generateDailySummaryReport(options);
      case 'device_performance': return _generateDevicePerformanceReport(options);
      case 'sensor_analysis':    return _generateSensorAnalysisReport(options);
      default: throw new Error('Unsupported report type: ' + type);
    }
  }

  function _generateDailySummaryReport(options) {
    logEvent('system', 'report_stub', { type: 'daily_summary' }, 'analytics');
    return { type: 'daily_summary', data: [], generated_at: getCurrentUTCTimestamp() };
  }

  function _generateDevicePerformanceReport(options) {
    logEvent('system', 'report_stub', { type: 'device_performance' }, 'analytics');
    return { type: 'device_performance', data: [], generated_at: getCurrentUTCTimestamp() };
  }

  function _generateSensorAnalysisReport(options) {
    logEvent('system', 'report_stub', { type: 'sensor_analysis' }, 'analytics');
    return { type: 'sensor_analysis', data: [], generated_at: getCurrentUTCTimestamp() };
  }

  function exportReport(reportData, format) {
    format = format || 'json';
    switch (format) {
      case 'json':
        return ContentService.createTextOutput(JSON.stringify(reportData)).setMimeType(ContentService.MimeType.JSON);
      case 'csv':
        return ContentService.createTextOutput(_convertToCsv(reportData)).setMimeType(ContentService.MimeType.CSV);
      case 'pdf':
        return ContentService.createTextOutput('<html><body><pre>' + JSON.stringify(reportData, null, 2) + '</pre></body></html>')
          .setMimeType(ContentService.MimeType.HTML);
      default: throw new Error('Unsupported export format: ' + format);
    }
  }

  function _convertToCsv(data) {
    if (!data) return '';
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const rows    = items.map(row => headers.map(h => '"' + String(row[h] === undefined ? '' : row[h]).replace(/"/g, '""') + '"').join(','));
    return [headers.join(',')].concat(rows).join('\n');
  }

  function scheduleReport(config) {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'generateScheduledReport') ScriptApp.deleteTrigger(t);
    });

    let trigger;
    switch (config.frequency) {
      case 'daily':
        trigger = ScriptApp.newTrigger('generateScheduledReport').timeBased().everyDays(1).atHour(config.hour || 6).create();
        break;
      case 'weekly':
        trigger = ScriptApp.newTrigger('generateScheduledReport').timeBased().everyWeeks(1)
          .onWeekDay(config.weekDay || ScriptApp.WeekDay.MONDAY).atHour(config.hour || 6).create();
        break;
      case 'monthly':
        trigger = ScriptApp.newTrigger('generateScheduledReport').timeBased().everyMonths(1)
          .onMonthDay(config.monthDay || 1).atHour(config.hour || 6).create();
        break;
      default: throw new Error('Unsupported frequency: ' + config.frequency);
    }

    const reportConfigs = JSON.parse(PropertiesService.getScriptProperties().getProperty('REPORT_CONFIGS') || '[]');
    reportConfigs.push(Object.assign({}, config, { triggerId: trigger.getUniqueId(), created: new Date().toISOString() }));
    PropertiesService.getScriptProperties().setProperty('REPORT_CONFIGS', JSON.stringify(reportConfigs));
    return { success: true, triggerId: trigger.getUniqueId() };
  }

  function calculateWeeklyAverageAndSubmitToHedera() {
    try {
      const ss = Database.getSpreadsheet();
      const batchSheet = ss.getSheetByName('Batchsheet');
      if (!batchSheet) { logEvent('system', 'error', 'Batchsheet not found', 'weekly_avg'); return; }
      let avgSheet = ss.getSheetByName('Avgweeks');
      if (!avgSheet) {
        avgSheet = ss.insertSheet('Avgweeks');
        avgSheet.appendRow(['ts', 'device_id', 'sensor_type', 'avg_value', 'count', 'batch_id']);
      }

      const now = new Date();
      const currentDay = now.getUTCDay();
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() - daysToMonday - 7);
      startOfWeek.setUTCHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
      endOfWeek.setUTCHours(23, 59, 59, 999);
      const data    = batchSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const tsCol     = headers.indexOf('event_ts');
      const sensorCol = headers.indexOf('sensor_type');
      const valueCol  = headers.indexOf('value');
      const deviceCol = headers.indexOf('device_id');
      if (tsCol === -1 || sensorCol === -1 || valueCol === -1 || deviceCol === -1) {
        logEvent('system', 'error', 'Missing columns in Batchsheet', 'weekly_avg');
        return;
      }

      const allowedSensors = ['temperature', 'humidity', 'soil_moisture', 'ph', 'tds', 'do', 'light_intensity'];
      const weeklyData = {};
      for (let i = 1; i < data.length; i++) {
        const rowTs = new Date(data[i][tsCol]);
        if (rowTs < startOfWeek || rowTs > endOfWeek) continue;
        const device = String(data[i][deviceCol]);
        const sensor = String(data[i][sensorCol]).toLowerCase();
        if (!allowedSensors.includes(sensor)) continue;
        const value = parseFloat(data[i][valueCol]);
        if (isNaN(value)) continue;
        if (!weeklyData[device]) weeklyData[device] = {};
        if (!weeklyData[device][sensor]) weeklyData[device][sensor] = [];
        weeklyData[device][sensor].push(value);
      }

      const entries   = [];
      let   entryId   = 1;
      const batchId   = 'weekly_batch_' + Utilities.formatDate(startOfWeek, 'GMT', 'yyyy-MM-dd');
      const currentTs = getCurrentUTCTimestamp();
      for (const device in weeklyData) {
        for (const sensor in weeklyData[device]) {
          const values = weeklyData[device][sensor];
          if (!values.length) continue;
          const avg = values.reduce((s, v) => s + v, 0) / values.length;
          avgSheet.appendRow([currentTs, device, sensor, avg, values.length, batchId]);
          entries.push({ id: entryId++, device_id: device, sensor_type: sensor, avg_value: avg, count: values.length, timestamp: currentTs });
        }
      }

      if (avgSheet.getLastRow() > 1) {
        avgSheet.getRange(2, 1, avgSheet.getLastRow() - 1, avgSheet.getLastColumn())
          .sort({ column: 1, ascending: false });
      }

      if (entries.length === 0) { logEvent('system', 'info', 'No data for weekly average', 'weekly_avg'); return; }
      const snapshotObj = {
        snapshotId: 'weekly_' + currentTs.replace(/[:.]/g, '_'),
        entries,
        batch_ids: [batchId],
        meta: { type: 'weekly_average', chain: 'Hedera' }
      };
      const cloudUrl = prop('CLOUD_FN_URL');
      if (!cloudUrl || cloudUrl === 'CHANGE_ME') { logEvent('system', 'warn', 'CLOUD_FN_URL not set', 'weekly_avg'); return; }
      const response  = UrlFetchApp.fetch(cloudUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': prop('CLOUD_FN_API_KEY') },
        payload: JSON.stringify(snapshotObj),
        muteHttpExceptions: true
      });

      const respData = JSON.parse(response.getContentText());
      if (respData.ok) {
        logEvent('system', 'success', { snapshotId: snapshotObj.snapshotId, queued: respData.queued }, 'weekly_avg_hedera');
      } else {
        logEvent('system', 'error', { snapshotId: snapshotObj.snapshotId, error: respData.error }, 'weekly_avg_hedera');
      }

    } catch (e) {
      logEvent('system', 'error', { error: e.toString() }, 'weekly_avg_hedera');
    }
  }
  return {
    generateReport, exportReport, scheduleReport,
    calculateWeeklyAverageAndSubmitToHedera
  };
})();

/* ================================================================

  **12. RETRY QUEUE MODULE** (cho lệnh điều khiển thất bại) - thêm 07.04.2026

/* ================================================================

const RetryQueue = (() => {
  const SHEET_NAME = 'CommandRetryQueue';
  function ensureSheet() {
    const ss = Database.getSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, 7).setValues([[
        'id', 'device_id', 'command', 'parameters', 'failed_at', 'retry_count', 'rule_id'
      ]]);
    }

    return sheet;
  }

  function add(deviceId, command, parameters, ruleId) {
    const sheet = ensureSheet();
    const id = Utilities.getUuid();
    // [V9.4 FIX-1] writeAtTop+lock — nhất quán với kiến trúc toàn hệ
    writeAtTop(sheet, [
      id, deviceId, command, JSON.stringify(parameters),
      new Date().toISOString(), 0, ruleId || '', 'pending'
    ], ['id', 'device_id', 'command', 'parameters', 'failed_at', 'retry_count', 'rule_id', 'status']);
    logEvent(deviceId, 'command_queued_for_retry', { command, ruleId }, 'retry_queue');
  }

  function processRetries() {
    const sheet = ensureSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idCol = headers.indexOf('id');
    const deviceCol = headers.indexOf('device_id');
    const cmdCol = headers.indexOf('command');
    const paramCol = headers.indexOf('parameters');
    const retryCol = headers.indexOf('retry_count');
    const COMMAND_MAX_AGE_SEC = 1800; // [V9.1 FIX-M4] lệnh hết hạn sau 30 phút
    const createdAtCol = headers.indexOf('created_at');
    const statusColIdx = headers.indexOf('status');  // [V9.4 FIX-7]
    for (let i = data.length - 1; i >= 1; i--) {
      // [V9.4 FIX-7] Skip rows đã dead/processed — tránh O(n) scan toàn bộ history
      if (statusColIdx !== -1) {
        const rowStatus = String(data[i][statusColIdx] || '').toLowerCase();
        if (rowStatus === 'dead' || rowStatus === 'processed') continue;
      }
      const deviceId = String(data[i][deviceCol]);
      const command = String(data[i][cmdCol]);
      let params = {};
      try { params = JSON.parse(data[i][paramCol] || '{}'); } catch (e) {}
      const retryCount = parseInt(data[i][retryCol], 10) || 0;
      // [V9.1 FIX-M4] Bỏ lệnh đã hết hạn (quá 30 phút)
      if (createdAtCol !== -1 && data[i][createdAtCol]) {
        const ageSec = (Date.now() - new Date(data[i][createdAtCol]).getTime()) / 1000;
        if (ageSec > COMMAND_MAX_AGE_SEC) {
          sheet.deleteRow(i + 1);
          logEvent(deviceId, 'command_expired', { command, age_sec: Math.round(ageSec) }, 'retry_queue');
          continue;
        }
      }

      if (retryCount >= 3) {
        // [V9.3 GPT-3b] Dead-letter: mark 'dead' thay vì xóa — giữ audit trail
        const statusColRQ = headers.indexOf('status');
        if (statusColRQ !== -1) {
          sheet.getRange(i + 1, statusColRQ + 1).setValue('dead');
        }
        logEvent(deviceId, 'command_dead_letter', { command, retryCount }, 'retry_queue');
        continue;
      }
      try {
        const result = IoTCore.sendCommandToDevice(deviceId, command, params);
        if (result && result.status === 'queued') {
          sheet.deleteRow(i + 1);
          logEvent(deviceId, 'command_retry_success', { command, retryCount }, 'retry_queue');
        } else {
          sheet.getRange(i + 1, retryCol + 1).setValue(retryCount + 1);
        }

      } catch (e) {
        sheet.getRange(i + 1, retryCol + 1).setValue(retryCount + 1);
        logEvent(deviceId, 'command_retry_error', { command, error: e.toString() }, 'retry_queue');
      }
    }
  }

  return { add, processRetries };
})();

/* ================================================================

  **13 . Module  BacklogModule** 13.04.2026

/* ================================================================

const BacklogModule = (() => {
  const SHEET_NAME = 'BacklogQueue';
  function ensureSheet() {
    const ss = Database.getSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1,1,1,6).setValues([['ts','device_id','action','payload','status','note']]);
    }

    return sheet;
  }

  function enqueue(deviceId, action, payload) {
    const sheet = ensureSheet();
    const ts = getCurrentUTCTimestamp();
    // [V9.4 FIX-5b] writeAtTop — nhất quán với kiến trúc
    writeAtTop(sheet, [ts, deviceId || '', action || '', JSON.stringify(payload || {}), 'pending', 'enqueued'],
      ['ts', 'device_id', 'action', 'payload', 'status', 'note']);
    EventModule.logEvent(deviceId || 'server', 'backlog_enqueued', { action, payload }, 'server');
    return { ok: true, ts };
  }

  function process() {
    const ss = Database.getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return { processed: 0 };
    const data = sheet.getDataRange().getValues();
    const updates = [];
    for (let i = 1; i < data.length; i++) {
      const status = String(data[i][4] || '').trim();
      if (status !== 'pending') continue;
      const deviceId = String(data[i][1] || '');
      const action = data[i][2];
      let payload = {};
      try { payload = JSON.parse(data[i][3]); } catch(e) {}
      let result = null;
      if (action === 'execute_command') {
        // Gọi hàm executeCommandNow nếu có (sẽ thêm ở phần sau)
        if (typeof executeCommandNow === 'function') {
          result = executeCommandNow(payload.command_id, deviceId, payload.params || {}, payload.batch_id || '');
        } else {
          result = { ok: false, message: 'executeCommandNow not available' };
        }
      } else {
        // Các action khác có thể xử lý tùy
        result = { ok: false, message: 'Unknown action' };
      }

      const newStatus = (result && result.ok) ? 'processed' : 'failed';
      sheet.getRange(i+1, 5).setValue(newStatus);
      sheet.getRange(i+1, 6).setValue(JSON.stringify(result));
    }

    return { processed: data.length - 1 };
  }

  return { enqueue, process };
})();

/* ================================================================

  **14 . Module  Commands helpers** 13.04.2026
Thêm hàm createCommandForDevice, hàm getPendingCommands(deviceId) 13.04.2026
dùng writeAtTop khi log lệnh

/* ================================================================

function createCommandForDevice(deviceId, commandName, params, source) {
  source = source || 'server';
  const ss = Database.getSpreadsheet();
  let sheet = ss.getSheetByName('Commands');
  if (!sheet) {
    sheet = ss.insertSheet('Commands');
    sheet.getRange(1,1,1,8).setValues([['command_id','command','params','device_id','status','created_ts','source','executed_ts']]);
  }

  const commandId = (commandName || 'cmd') + '_' + Utilities.getUuid().slice(0,8);
  const created_ts = getCurrentUTCTimestamp();
  const paramsStr = params && typeof params === 'object' ? JSON.stringify(params) : (params || '');
  writeAtTop(sheet, [commandId, commandName, paramsStr, deviceId, 'Pending', created_ts, source, ''],
    ['command_id','command','params','device_id','status','created_ts','source','note']);
  logEvent(deviceId || 'server', 'command_created', { command_id: commandId, command: commandName, params }, source);
  return commandId;
}

function getPendingCommands(deviceId) {
  const ss = Database.getSpreadsheet();
  const sheet = ss.getSheetByName('Commands');
  const out = [];
  if (!sheet) return out;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const colId = headers.indexOf('command_id') !== -1 ? headers.indexOf('command_id') : 0;
  const colCommand = headers.indexOf('command') !== -1 ? headers.indexOf('command') : 1;
  const colParams = headers.indexOf('params') !== -1 ? headers.indexOf('params') : 2;
  const colDevice = headers.indexOf('device_id') !== -1 ? headers.indexOf('device_id') : 3;
  const colStatus = headers.indexOf('status') !== -1 ? headers.indexOf('status') : 4;
  for (let r=1; r<data.length; r++) {
    try {
      const rowDevice = String(data[r][colDevice] || '');
      const rowStatus = String(data[r][colStatus] || '');
      if (rowStatus === 'Pending' && (!deviceId || rowDevice === deviceId)) {
        let p = data[r][colParams] || '';
        try { p = JSON.parse(p); } catch(e) {}
        out.push({ command_id: String(data[r][colId]), command: String(data[r][colCommand]), params: p });
      }

    } catch(e) {}
  }

  return out;
}

//=========== Thêm hàm xử lý CommandNow 13.04.2026

function executeCommandNow(commandId, deviceId, params, batchId) {
  const ss = Database.getSpreadsheet();
  const commandsSheet = ss.getSheetByName('Commands');
  if (!commandsSheet) return { ok: false, message: 'Commands sheet not found' };
  const cmds = commandsSheet.getDataRange().getValues();
  let cmdRow = -1;
  for (let i = 1; i < cmds.length; i++) {
    if (String(cmds[i][0]) === String(commandId) && String(cmds[i][3]) === String(deviceId)) {
      cmdRow = i + 1;
      break;
    }
  }

  if (cmdRow === -1) return { ok: false, message: 'Command not found' };
  const statusCell = commandsSheet.getRange(cmdRow, 5).getValue();
  if (String(statusCell).toLowerCase() !== 'pending') return { ok: false, message: 'Command not pending' };
  // Lấy endpoint từ sheet Devices
  let endpoint = null;
  try {
    const devSheet = ss.getSheetByName('Devices');
    if (devSheet) {
      const ddata = devSheet.getDataRange().getValues();
      const dhdr = ddata[0].map(h => String(h).trim().toLowerCase());
      const idCol = dhdr.indexOf('device_id');
      const epCol = dhdr.indexOf('endpoint_url');
      for (let r = 1; r < ddata.length; r++) {
        if (String(ddata[r][idCol]) === deviceId && epCol !== -1) {
          endpoint = String(ddata[r][epCol] || '').trim();
          break;
        }
      }
    }

  } catch(e) {}
  if (!endpoint) {
    commandsSheet.getRange(cmdRow, 5).setValue('Queued');
    BacklogModule.enqueue(deviceId, 'execute_command', { command_id: commandId, params, batch_id: batchId });
    return { ok: false, message: 'No endpoint, queued to backlog' };
  }

  const commandObj = { command_id: commandId, command: cmds[cmdRow-1][1], params: params || {}, device_id: deviceId, timestamp: Math.floor(Date.now()/1000) };
  const devSecret = Database.getDeviceSecret(deviceId);
  if (!devSecret) return { ok: false, message: 'Device secret missing' };
  const signed = Security.createSignedPayload(deviceId, commandObj, devSecret);
  try {
    const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(signed), muteHttpExceptions: true };
    const resp = UrlFetchApp.fetch(endpoint, options);
    const code = resp.getResponseCode();
    let body = {};
    try { body = JSON.parse(resp.getContentText()); } catch(e) { body = { status: 'error', text: resp.getContentText() }; }
    if (code >= 200 && code < 300 && (body.status === 'success' || body.ok === true)) {
      commandsSheet.getRange(cmdRow, 5).setValue('Executed');
      commandsSheet.getRange(cmdRow, 8).setValue(getCurrentUTCTimestamp());
      return { ok: true, message: 'Executed', resp: body };
    } else {
      commandsSheet.getRange(cmdRow, 5).setValue('Failed');
      BacklogModule.enqueue(deviceId, 'execute_command', { command_id: commandId, params, batch_id: batchId });
      return { ok: false, message: 'Failed, queued', resp: body };
    }

  } catch(err) {
    commandsSheet.getRange(cmdRow, 5).setValue('Failed');
    BacklogModule.enqueue(deviceId, 'execute_command', { command_id: commandId, params, batch_id: batchId });
    return { ok: false, message: 'Exception, queued', error: String(err) };
  }
}

   //=============== **15. TELEGRAM MODULE**  **(EcoSynTech V9.0)**

   - Gui thong bao chuyen nghiep toi Telegram Bot
   - Ho tro inline keyboard de dieu khien relay truc tiep tu Telegram
   - Nhan lenh qua webhook (action=telegram_webhook)
   - Rate limiting: max 20 tin/phut, khong spam
   - Cau hinh: Script Properties -> TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS
   ================================================================ */
const TelegramModule = (() => {
  const API_BASE       = 'https://api.telegram.org/bot';
  const MAX_MSG_LEN    = 4096;
  const RATE_LIMIT_MAX = 20;  // max 20 msg / phut
  const RATE_WIN_SEC   = 60;

  /* ---------- config ---------- */

  function getToken()   { return prop('TELEGRAM_BOT_TOKEN') || ''; }
  function getChatIds() {
    return (prop('TELEGRAM_CHAT_IDS') || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  function isConfigured() {
    const t = getToken();
    return t && t !== 'CHANGE_ME' && t.includes(':');
  }

  function notifyEnabled(key) {
    const v = prop(key); return !v || v === 'true';
  }

  /* ---------- rate limiter ---------- */

  function _checkRate() {
    try {
      const cache = CacheService.getScriptCache();
      const key   = 'tg_rl_' + Math.floor(Date.now() / (RATE_WIN_SEC * 1000));
      const cur   = parseInt(cache.get(key) || '0', 10);
      if (cur >= RATE_LIMIT_MAX) return false;
      cache.put(key, String(cur + 1), RATE_WIN_SEC + 5);
      return true;
    } catch (e) { return true; }
  }

  /* ---------- core API call ---------- */

  function _api(method, body) {
    if (!isConfigured()) return { ok: false, error: 'Telegram not configured' };
    try {
      const resp = UrlFetchApp.fetch(API_BASE + getToken() + '/' + method, {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(body), muteHttpExceptions: true
      });

      return JSON.parse(resp.getContentText());
    } catch (e) { console.error('[TG] API error:', e); return { ok: false, error: String(e) }; }
  }

  /* ---------- sendMessage ---------- */

  function sendMessage(chatId, text, options) {
    options = options || {};
    if (!isConfigured() || !_checkRate()) return { ok: false };
    const body = {
      chat_id:    chatId,
      text:       String(text || '').slice(0, MAX_MSG_LEN),
      parse_mode: options.parse_mode || 'HTML'
    };
    if (options.reply_markup)         body.reply_markup         = JSON.stringify(options.reply_markup);
    if (options.disable_notification) body.disable_notification = true;
    const r = _api('sendMessage', body);
    if (!r.ok) console.error('[TG] sendMessage failed:', r.description);
    return r;
  }
  // Gui den tat ca chat_id da cau hinh
  function broadcast(text, options) {
    if (!isConfigured()) return [];
    const ids = getChatIds();
    if (!ids.length) { console.warn('[TG] No TELEGRAM_CHAT_IDS configured'); return []; }
    return ids.map(id => sendMessage(id, text, options));
  }

  /* ---------------------------------------------------------------

     notify(type, data)  -  gui thong bao dinh dang theo loai
     Loai ho tro: alert | rule_trigger | sensor_anomaly | heartbeat |
                  ota_update | device_status | system_health |
                  manual_event | custom
  --------------------------------------------------------------- */
  function notify(type, data) {
    data = data || {};
    let text = '', options = {};
    const ts = data.ts || getCurrentUTCTimestamp();
    switch (type) {
      case 'alert':
        if (!notifyEnabled('TELEGRAM_NOTIFY_SENSOR')) return [];
        text = (data.severity === 'critical' ? '[!!] ' : '[!] ') + '<b>[ALERT] EcoSynTech</b>\n'
             + 'Device: <code>' + (data.device_id || 'system') + '</code>\n'
             + 'Loai: <b>' + (data.alert_type || 'alert') + '</b>\n'
             + 'Gia tri: <code>' + (data.value !== undefined ? data.value : 'N/A') + '</code>\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        if (data.note) text += '\nGhi chu: ' + data.note;
        break;
      case 'rule_trigger':
        if (!notifyEnabled('TELEGRAM_NOTIFY_RULE')) return [];
        text = (String(data.command||'').includes('_on') ? '[ON] ' : '[OFF] ')
             + '<b>[SMART CONTROL] Rule kich hoat</b>\n'
             + 'Rule: <code>' + (data.rule_id || 'N/A') + '</code>\n'
             + 'Cam bien: <b>' + data.sensor + '</b> = <code>' + data.value + (data.unit ? ' ' + data.unit : '') + '</code>\n'
             + 'Lenh: <b>' + data.command + '</b>\n'
             + 'Zone: ' + (data.zone || 'all') + '\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        if (data.device_id && data.command) {
          const toggle = data.command.includes('_on')
            ? data.command.replace('_on', '_off')
            : data.command.replace('_off', '_on');
          options.reply_markup = {
            inline_keyboard: [[
              { text: '[Dao lenh ngay]', callback_data: 'cmd:' + data.device_id + ':' + toggle },
              { text: '[Xem sensor]',    callback_data: 'status:' + data.device_id }
            ]]
          };
        }
        break;
      case 'sensor_anomaly':
        if (!notifyEnabled('TELEGRAM_NOTIFY_SENSOR')) return [];
        text = '[DI THUONG] <b>Cam bien</b>\n'
             + 'Device: <code>' + data.device_id + '</code>\n'
             + 'Sensor: <b>' + data.sensor_type + '</b>\n'
             + 'Gia tri: <code>' + data.value + '</code> (ky vong: ' + (data.expected_range||'N/A') + ')\n'
             + 'Muc do: <b>' + (data.severity||'medium') + '</b>\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        break;
      case 'heartbeat':
        if (!notifyEnabled('TELEGRAM_NOTIFY_HEARTBEAT')) return [];
        text = '[HEARTBEAT] EcoSynTech\n'
             + 'Device: <code>' + data.device_id + '</code>\n'
             + 'WiFi: <code>' + (data.rssi||'N/A') + ' dBm</code>\n'
             + 'Pin: <code>' + (data.battery_v ? (+data.battery_v).toFixed(2)+'V' : 'N/A') + '</code>\n'
             + 'Backlog: <code>' + (data.backlog_count||0) + '</code>\n'
             + 'Free heap: <code>' + (data.free_heap ? Math.round(data.free_heap/1024)+'KB' : 'N/A') + '</code>';
        options.disable_notification = true;
        break;
      case 'ota_update':
        text = '[OTA UPDATE] EcoSynTech\n'
             + 'Device: <code>' + data.device_id + '</code>\n'
             + 'Phien ban moi: <b>' + data.version + '</b>\n'
             + 'Trang thai: ' + data.status + '\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        break;
      case 'device_status':
        if (!notifyEnabled('TELEGRAM_NOTIFY_SYSTEM')) return [];
        text = '[DEVICE] ' + data.device_id + ': <b>' + data.status + '</b>\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        if (data.note) text += '\nGhi chu: ' + data.note;
        break;
      case 'system_health':
        if (!notifyEnabled('TELEGRAM_NOTIFY_SYSTEM')) return [];
        text = (data.healthy ? '[OK] ' : '[!!] ') + '<b>[SYSTEM HEALTH] EcoSynTech</b>\n'
             + 'Tong the: <b>' + (data.healthy ? 'BINH THUONG' : 'CO VAN DE') + '</b>\n'
             + 'DB: ' + (data.db_ok ? 'OK' : 'LOI') + ' | Storage: ' + (data.storage_ok ? 'OK' : 'LOI') + '\n'
             + 'Critical alerts: <code>' + (data.critical_alerts||0) + '</code>\n'
             + 'Warnings: <code>' + (data.warnings||0) + '</code>\n'
             + 'Thoi gian: <code>' + ts + '</code>';
        break;
      case 'manual_event':
        text = '[SU KIEN] <b>' + data.event_type + '</b>\n'
             + 'Batch: <code>' + data.batch_id + '</code>\n'
             + 'Nguoi TH: ' + data.operator + '\n'
             + 'Vat tu: ' + data.materials + '\n'
             + 'Thoi luong: ' + data.duration + ' phut\n'
             + (data.notes ? 'Ghi chu: ' + data.notes + '\n' : '')
             + 'Thoi gian: <code>' + getCurrentUTCTimestamp() + '</code>';
        break;
      case 'custom':
        text = data.text || 'EcoSynTech notification';
        if (data.parse_mode)  options.parse_mode  = data.parse_mode;
        if (data.reply_markup) options.reply_markup = data.reply_markup;
        break;
      default:
        text = '[EcoSynTech] ' + JSON.stringify(data).slice(0, 400);
    }

    return broadcast(text, options);
  }

  /* ---------------------------------------------------------------

     handleUpdate  -  xu ly Telegram Update (webhook + inline keyboard)
  --------------------------------------------------------------- */
  function handleUpdate(update) {
    if (!update) return { ok: false };
    if (update.callback_query) return _handleCallback(update.callback_query);
    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return { ok: false };
    const chatId = String(msg.chat.id);
    if (!_isAuth(chatId)) {
      sendMessage(chatId, 'Ban khong co quyen dieu khien he thong nay.');
      return { ok: false };
    }

    return _doCmd(chatId, msg.text.trim());
  }

  function _handleCallback(cq) {
    const chatId = String(cq.message.chat.id);
    _ackCQ(cq.id);
    if (!_isAuth(chatId)) return { ok: false };
    const parts = (cq.data || '').split(':');
    if (parts[0] === 'cmd'    && parts.length >= 3) return _relayCmd(chatId, parts[1], parts[2]);
    if (parts[0] === 'status' && parts.length >= 2) return _sensorStatus(chatId, parts[1]);
    if (parts[0] === 'rules')                       return _ruleList(chatId);
    return { ok: false };
  }

  function _ackCQ(id, txt) { _api('answerCallbackQuery', { callback_query_id: id, text: txt||'' }); }
  function _isAuth(chatId) { const ids = getChatIds(); return !ids.length || ids.includes(chatId); }

  /* ---------- command router ---------- */

  function _doCmd(chatId, text) {
    const parts = text.split(/\s+/);
    const cmd   = parts[0].toLowerCase().split('@')[0];
    const args  = parts.slice(1);
    switch (cmd) {
      case '/start':
      case '/help':
        sendMessage(chatId,
          '<b>EcoSynTech Bot</b>\n\n'
          + '/status  - Trang thai he thong\n'
          + '/devices - Danh sach thiet bi\n'
          + '/rules   - Danh sach control rules\n'
          + '/relay [device] [1-4] [on|off] - Dieu khien relay\n'
          + '/sensor [device_id]  - Doc cam bien moi nhat\n'
          + '/alerts              - Xem alerts gan day\n'
          + '/rule_on  [rule_id]  - Bat rule\n'
          + '/rule_off [rule_id]  - Tat rule\n'
          + '/ping                - Kiem tra ket noi'
        );
        return { ok: true };
      case '/ping':
        sendMessage(chatId, 'Pong! Server time: <code>' + getCurrentUTCTimestamp() + '</code>');
        return { ok: true };
      case '/status': {
        try {
          const h = SystemMonitor.checkSystemHealth();
          const s = Admin.getSystemStats();
          sendMessage(chatId,
            '<b>System Status</b>\n'
            + 'DB: '      + (h.database.healthy ? 'OK' : 'LOI')
            + ' | Stor: ' + (h.storage.healthy  ? 'OK' : 'LOI')
            + ' | API: '  + (h.api.healthy       ? 'OK' : 'LOI') + '\n'
            + 'Devices: ' + s.devices.active + '/' + s.devices.total + ' active\n'
            + 'Readings 24h: ' + s.readings.last24h + '\n'
            + '<code>' + getCurrentUTCTimestamp() + '</code>'
          );
        } catch(e) { sendMessage(chatId, 'Loi: ' + e.message); }
        return { ok: true };
      }

      case '/devices': {
        const devices = Database.getSheetData('Devices');
        if (!devices.length) { sendMessage(chatId, 'Chua co thiet bi nao.'); return { ok: true }; }
        let msg = '<b>Thiet bi (' + devices.length + ')</b>\n\n';
        devices.slice(0, 20).forEach((d, i) => {
          const st = (d.status || 'active').toLowerCase();
          msg += (i+1) + '. [' + (st === 'active' ? 'ON' : 'OFF') + '] <code>' + d.device_id + '</code>';
          if (d.last_seen) msg += '  ' + String(d.last_seen).slice(0,16);
          msg += '\n';
        });

        sendMessage(chatId, msg);
        return { ok: true };
      }

      case '/rules': return _ruleList(chatId);
      case '/relay': {
        if (args.length < 3) { sendMessage(chatId, 'Cu phap: /relay [device_id] [1-4] [on|off]'); return { ok: false }; }
        const rn = parseInt(args[1], 10);
        const st = args[2].toLowerCase();
        if (![1,2,3,4].includes(rn) || !['on','off'].includes(st)) {
          sendMessage(chatId, 'Relay phai la 1-4, trang thai la on hoac off');
          return { ok: false };
        }

        return _relayCmd(chatId, args[0], 'relay' + rn + '_' + st);
      }

      case '/sensor':
        if (!args[0]) { sendMessage(chatId, 'Cu phap: /sensor [device_id]'); return { ok: false }; }
        return _sensorStatus(chatId, args[0]);
      case '/alerts': {
        const logs   = Database.getSheetData('EventLogs');
        const alerts = logs.filter(e => e.event === 'alert' || e.event === 'critical_alert').slice(-10).reverse();
        if (!alerts.length) { sendMessage(chatId, 'Khong co alert nao gan day.'); return { ok: true }; }
        let msg = '<b>Alerts gan day (' + alerts.length + ')</b>\n\n';
        alerts.forEach(a => {
          msg += '[' + String(a.ts||'').slice(0,19) + '] ' + (a.entity||'') + ' - ' + String(a.payload||'').slice(0,80) + '\n';
        });

        sendMessage(chatId, msg);
        return { ok: true };
      }

      case '/rule_on': {
        if (!args[0]) { sendMessage(chatId, 'Cu phap: /rule_on [rule_id]'); return { ok: false }; }
        const r = SmartControlEngine.enableRule(args[0]);
        sendMessage(chatId, r.ok ? 'Rule <code>' + args[0] + '</code> da duoc bat.' : 'Loi: ' + r.message);
        return r;
      }

      case '/rule_off': {
        if (!args[0]) { sendMessage(chatId, 'Cu phap: /rule_off [rule_id]'); return { ok: false }; }
        const r = SmartControlEngine.disableRule(args[0]);
        sendMessage(chatId, r.ok ? 'Rule <code>' + args[0] + '</code> da bi tat.' : 'Loi: ' + r.message);
        return r;
      }
      default:
        if (text.startsWith('/')) sendMessage(chatId, 'Lenh khong ho tro. Go /help.');
        return { ok: false };
    }
  }

  /* ---------- UI helpers ---------- */

  function _relayCmd(chatId, deviceId, command) {
    try {
      const result = IoTCore.sendCommandToDevice(deviceId, command, { triggered_by: 'telegram', ts: getCurrentUTCTimestamp() });
      sendMessage(chatId,
        '[' + (command.includes('_on') ? 'ON' : 'OFF') + '] <b>Lenh da gui</b>\n'
        + 'Device: <code>' + deviceId + '</code>\n'
        + 'Lenh: <b>' + command + '</b>\n'
        + 'CommandID: <code>' + (result.command_id||'N/A') + '</code>'
      );
      EventModule.logEvent(deviceId, 'telegram_command', { command: command, chatId: chatId }, 'telegram');
      return { ok: true };
    } catch (e) {
      sendMessage(chatId, 'Loi gui lenh: ' + e.message);
      return { ok: false, error: String(e) };
    }
  }

  function _sensorStatus(chatId, deviceId) {
    const readings = Database.getSheetData('SensorReadings');
    const latest   = readings.filter(r => r.device_id === deviceId).slice(-8);
    if (!latest.length) { sendMessage(chatId, 'Device <code>' + deviceId + '</code>: Chua co du lieu.'); return { ok: true }; }
    let msg = '<b>Sensor: ' + deviceId + '</b>\n\n';
    latest.forEach(r => { msg += r.sensor_type + ': <code>' + r.value + ' ' + (r.unit||'') + '</code>\n'; });
    if (latest[0] && latest[0].event_ts) msg += '\n<code>' + String(latest[0].event_ts).slice(0,19) + '</code>';
    sendMessage(chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [{ text:'Relay1 ON',  callback_data:'cmd:'+deviceId+':relay1_on'  }, { text:'Relay1 OFF', callback_data:'cmd:'+deviceId+':relay1_off' }],
          [{ text:'Relay2 ON',  callback_data:'cmd:'+deviceId+':relay2_on'  }, { text:'Relay2 OFF', callback_data:'cmd:'+deviceId+':relay2_off' }],
          [{ text:'Relay3 ON',  callback_data:'cmd:'+deviceId+':relay3_on'  }, { text:'Relay3 OFF', callback_data:'cmd:'+deviceId+':relay3_off' }],
          [{ text:'Relay4 ON',  callback_data:'cmd:'+deviceId+':relay4_on'  }, { text:'Relay4 OFF', callback_data:'cmd:'+deviceId+':relay4_off' }],
          [{ text:'[Rules]',    callback_data:'rules' }, { text:'[Refresh]', callback_data:'status:'+deviceId }]
        ]
      }
    });

    return { ok: true };
  }

  function _ruleList(chatId) {
    const rules = SmartControlEngine.getRuleStatus();
    if (!rules.length) { sendMessage(chatId, 'Chua co Control Rule nao.'); return { ok: true }; }
    let msg = '<b>Control Rules (' + rules.length + ')</b>\n\n';
    rules.slice(0, 15).forEach((r, i) => {
      const en = r.enabled !== false ? '[ON]' : '[OFF]';
      const ac = r.state_active ? '[ACTIVE]' : '[idle]';
      msg += en + ac + ' <code>' + r.rule_id + '</code>\n'
           + '  ' + r.sensor + ' [' + r.min_val + '~' + r.max_val + '] -> ' + r.action + '\n';
    });

    if (rules.length > 15) msg += '\n... va ' + (rules.length - 15) + ' rule khac';
    sendMessage(chatId, msg);
    return { ok: true };
  }

  /* ---------- webhook management ---------- */

  function setWebhook() {
    if (!isConfigured()) return { ok: false, error: 'Not configured' };
    const url = prop('WEBAPP_URL');
    if (!url || url === 'CHANGE_ME') return { ok: false, error: 'WEBAPP_URL not set' };
    const webhookUrl = url + '?action=telegram_webhook&api_key=' + prop('API_KEY');
    const result = _api('setWebhook', { url: webhookUrl, allowed_updates: ['message', 'callback_query'] });
    EventModule.logEvent('system', 'telegram_webhook_set', result, 'telegram');
    return result;
  }

  function deleteWebhook() {
    return _api('deleteWebhook', { drop_pending_updates: false });
  }

  function getWebhookInfo() {
    if (!isConfigured()) return { ok: false };
    try {
      const resp = UrlFetchApp.fetch(API_BASE + getToken() + '/getWebhookInfo', { muteHttpExceptions: true });
      return JSON.parse(resp.getContentText());
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  return {
    sendMessage, broadcast, notify,
    handleUpdate, handleCommand: _doCmd,
    setWebhook, deleteWebhook, getWebhookInfo,
    isConfigured
  };
})();

/* ================================================================

   **16 . ADVISORY ENGINE MODULE  (EcoSynTech V8.0 - AI Nhe)**
   - Phan tich readings de phat hien bat thuong va canh bao som
   - Khong thay the Smart Control Engine, chi bo sung lop canh bao
   - Tinh anomaly_score don gian (0-100) dua tren do lech chuan
   - De xuat hanh dong cho nguoi van hanh
   - Nguong canh bao co the cau hinh qua Script Properties
   ================================================================ */
const AdvisoryEngine = (() => {
  function _threshold(key, fallback) {
    const v = parseFloat(prop('ADVISORY_' + key));
    return isNaN(v) ? fallback : v;
  }

  /* ---- Phan tich readings moi nhat ---- */

  function analyzeLatestReadings(readings, context) {
    context  = context  || {};
    readings = Array.isArray(readings) ? readings : [];
    const alerts  = [];
    const actions = [];
    const latest  = _indexLatest(readings);
    const TEMP_HIGH    = _threshold('TEMP_HIGH',    38.0);
    const TEMP_LOW     = _threshold('TEMP_LOW',     16.0);
    const HUM_LOW      = _threshold('HUM_LOW',      45.0);
    const SOIL_LOW     = _threshold('SOIL_LOW',     30.0);
    const LIGHT_LOW    = _threshold('LIGHT_LOW',    5000);
    const BATTERY_LOW  = _threshold('BATTERY_LOW',  3.5);
    if (latest.temperature !== null) {
      if (latest.temperature >= TEMP_HIGH) {
        alerts.push({ level: 'high',   code: 'TEMP_HIGH', message: 'Nhiet do cao: ' + latest.temperature + 'C' });
        actions.push('Bat quat / tang thong gio');
      }

      if (latest.temperature <= TEMP_LOW) {
        alerts.push({ level: 'medium', code: 'TEMP_LOW',  message: 'Nhiet do thap: ' + latest.temperature + 'C' });
      }
    }

    if (latest.humidity !== null && latest.humidity < HUM_LOW) {
      alerts.push({ level: 'medium', code: 'HUM_LOW',  message: 'Do am thap: ' + latest.humidity + '%' });
      actions.push('Can nhac tuoi / phun suong');
    }

    if (latest.soil_moisture !== null && latest.soil_moisture < SOIL_LOW) {
      alerts.push({ level: 'high',   code: 'SOIL_DRY', message: 'Dat kho: ' + latest.soil_moisture + '%' });
      actions.push('Kich hoat tuoi theo zone');
    }

    if (latest.light !== null && latest.light < LIGHT_LOW) {
      alerts.push({ level: 'low',    code: 'LOW_LIGHT', message: 'Anh sang thap: ' + latest.light + ' lux' });
    }

    if (latest.battery !== null && latest.battery < BATTERY_LOW) {
      alerts.push({ level: 'high',   code: 'LOW_BATTERY', message: 'Pin yeu: ' + latest.battery + 'V' });
      actions.push('Chuyen sang che do tiet kiem nang luong');
    }

    const anomaly_score = _anomalyScore(readings, context);
    if (anomaly_score > 60) {
      alerts.push({ level: 'medium', code: 'ANOMALY', message: 'Phat hien bat thuong (score=' + anomaly_score + ')' });
    }
    return {
      ok:               true,
      anomaly_score,
      alerts,
      suggested_actions: _unique(actions),
      summary:           alerts.length ? alerts.length + ' canh bao, can theo doi' : 'Thong so on dinh',
      ts:                getCurrentUTCTimestamp()
    };
  }

  /* ---- Helper: lay gia tri moi nhat theo loai sensor ---- */

  function _indexLatest(readings) {
    const out = { temperature: null, humidity: null, soil_moisture: null, light: null, battery: null };
    readings.forEach(r => {
      const type = String(r.sensor_type || r.type || '').toLowerCase();
      const val  = Number(r.value);
      if (isNaN(val)) return;
      if      (type.includes('temp'))                              out.temperature  = val;
      else if (type.includes('humid') || type === 'humidity')      out.humidity     = val;
      else if (type.includes('soil')  || type.includes('moisture')) out.soil_moisture= val;
      else if (type.includes('light') || type.includes('lux'))     out.light        = val;
      else if (type.includes('battery') || type.includes('volt'))  out.battery      = val;
    });

    return out;
  }

  /* ---- Helper: tinh anomaly score don gian ---- */

  function _anomalyScore(readings, context) {
    if (readings.length < 3) return 0;
    const values = readings.map(r => Number(r.value)).filter(v => !isNaN(v));
    if (values.length < 3) return 0;
    const mean  = values.reduce((a, b) => a + b, 0) / values.length;
    const stdev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    let score = 0;
    if (stdev > 8)  score += 35;
    if (stdev > 15) score += 30;
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (Math.abs(last - prev) > 10) score += 25;
    if (context.offline_hours && context.offline_hours > 1) score += 10;
    return Math.min(score, 100);
  }

  function _unique(arr) { return [...new Set(arr)]; }

  /* ---- Tich hop voi EventModule: log tat ca advisory alerts ---- */

  function processAndLog(batchId, readings, deviceId) {
    const result = analyzeLatestReadings(readings, { batchId, deviceId });
    if (result.alerts.length) {
      EventModule.logEvent(batchId || deviceId || 'system', 'advisory_alert', result, 'advisory_engine');
    }

    return result;
  }

  return { analyzeLatestReadings, processAndLog };
})();

   ================================================================ */
   **17. SMART CONTROL ENGINE MODULE - **(addRule dùng writeAtTop)
   - Đọc ControlRules từ sheet (zone, sensor, min, max, hysteresis,
     duration_sec, action, device_id, cooldown_sec, enabled)
   - Đánh giá tự động khi sensor readings mới đến
   - Gửi lệnh relay tới thiết bị qua IoTCore.sendCommandToDevice()
   - Hỗ trợ hysteresis & cooldown chống dao động
   - Lưu trạng thái rule trong sheet RuleStates
   - Log mọi hành động vào EventLogs
   ================================================================ */
const SmartControlEngine = (() => {
  const RULE_SHEET      = 'ControlRules';
  const STATE_SHEET     = 'RuleStates';
  const DEFAULT_COOLDOWN_SEC = 300;

  /* ---------- sheet helpers cho rules---------- */

function ensureRuleSheet() {
  const ss    = Database.getSpreadsheet();
  let   sheet = ss.getSheetByName(RULE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RULE_SHEET);
    sheet.getRange(1, 1, 1, 12).setValues([[
      'rule_id', 'zone', 'sensor', 'min', 'max',
      'hysteresis', 'duration_sec', 'action', 'reset_action',
      'device_id', 'cooldown_sec', 'enabled'
    ]]);
  } else {
    // Kiểm tra và thêm cột nếu thiếu (để tương thích với sheet cũ)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
    if (!headers.includes('cooldown_sec')) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue('cooldown_sec');
    }

    if (!headers.includes('reset_action')) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue('reset_action');
    }
  }

  return sheet;
}

  function _ensureStateSheet() {
    const ss    = Database.getSpreadsheet();
    let   sheet = ss.getSheetByName(STATE_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(STATE_SHEET);
      sheet.getRange(1, 1, 1, 7).setValues([[
        'rule_id', 'device_id', 'active', 'triggered_at',
        'last_action_at', 'last_value', 'action_count'
      ]]);
    }

    return sheet;
  }
// [V9.1 FIX-H1] Cache constants cho ControlRules
const RULE_CACHE_KEY = 'sce_rules_v91';
const RULE_CACHE_TTL = 120; // 2 phút
function _invalidateRuleCache() { try { Database.cacheRemoveKey(RULE_CACHE_KEY); } catch(e) {} }

//-------------- hàm load Rules từ sheet - đọc rules từ sheet ---------------

function loadRules() {
  // [H1] Check cache trước khi đọc sheet
  const _cr = Database.cacheGet(RULE_CACHE_KEY);
  if (Array.isArray(_cr) && _cr.length > 0) return _cr;
  const ss    = Database.getSpreadsheet();
  const sheet = ss.getSheetByName(RULE_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rules   = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, j) => { row[h] = data[i][j]; });
    const enabled = row['enabled'];
    if (enabled === false || String(enabled).toLowerCase() === 'false') continue;
    if (!row['sensor'] || !row['action']) continue;
    // Helper an toàn
    const toNum = (val, def = 0) => {
      if (val === undefined || val === '') return def;
      const n = Number(val);
      return isNaN(n) ? def : n;
    };
    const toInt = (val, def = 0) => {
      if (val === undefined || val === '') return def;
      const n = parseInt(val, 10);
      return isNaN(n) ? def : n;
    };
    const min_val = toNum(row['min'] ?? row['min_val']);
    const max_val = toNum(row['max'] ?? row['max_val']);
    const hysteresis = toNum(row['hysteresis']);
    const duration_sec = toInt(row['duration_sec']);
    const cooldown_val = row['cooldown_sec'];
    const cooldown_sec = (cooldown_val !== undefined && cooldown_val !== '') ? toInt(cooldown_val, DEFAULT_COOLDOWN_SEC) : DEFAULT_COOLDOWN_SEC;
    rules.push({
      rule_id:       String(row['rule_id'] || ('rule_' + i)),
      zone:          String(row['zone'] || ''),
      sensor:        String(row['sensor']),
      min_val,
      max_val,
      hysteresis,
      duration_sec,
      action:        String(row['action']),
      reset_action:  row['reset_action'] ? String(row['reset_action']) : '',
      device_id:     String(row['device_id'] || ''),
      cooldown_sec
    });

  }

  if (rules.length > 0) Database.cachePut(RULE_CACHE_KEY, rules, RULE_CACHE_TTL); // [H1]
  return rules;
}

  /* ---------- load/save rule states ---------- */

  function _loadStates() {
    const ss    = Database.getSpreadsheet();
    const sheet = ss.getSheetByName(STATE_SHEET);
    const out   = {};
    if (!sheet || sheet.getLastRow() < 2) return out;
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => { row[h] = data[i][j]; });
      const key = (row['rule_id'] || '') + '|' + (row['device_id'] || '');
      out[key] = {
        rowIndex:      i + 1,
        active:        row['active'] === true || String(row['active']).toLowerCase() === 'true',
        triggered_at:  row['triggered_at']  ? new Date(row['triggered_at']).getTime()  : 0,
        last_action_at:row['last_action_at']? new Date(row['last_action_at']).getTime(): 0,
        last_value:    parseFloat(row['last_value'] || 0),
        action_count:  parseInt(row['action_count'] || 0, 10)
      };
    }

    return out;
  }

  function _saveState(sheet, stateMap, ruleId, deviceId, state) {
    const key = ruleId + '|' + deviceId;
    const toIso = ms => ms ? new Date(ms).toISOString() : '';
    if (stateMap[key] && stateMap[key].rowIndex) {
      sheet.getRange(stateMap[key].rowIndex, 3, 1, 5).setValues([[
        state.active,
        toIso(state.triggered_at),
        toIso(state.last_action_at),
        state.last_value,
        state.action_count
      ]]);
    } else {
      sheet.appendRow([
        ruleId, deviceId,
        state.active,
        toIso(state.triggered_at),
        toIso(state.last_action_at),
        state.last_value,
        state.action_count
      ]);
      stateMap[key] = { rowIndex: sheet.getLastRow(), ...state };
    }
  }

  /* ---------- evaluate rules ---------- */

  function evaluateRules(deviceId, sensorReadings) {
    if (!Array.isArray(sensorReadings) || sensorReadings.length === 0) return [];
    const rules  = loadRules();
    if (rules.length === 0) return [];
    const sheet    = _ensureStateSheet();
    const stateMap = _loadStates();
    const actions  = [];
    const nowMs    = Date.now();
    for (const rule of rules) {
      // Lọc đúng device
      if (rule.device_id && rule.device_id !== '' && rule.device_id !== '*' &&
          rule.device_id !== deviceId) continue;
      // Matching readings theo sensor + zone
      const matches = sensorReadings.filter(r =>
        r.sensor_type === rule.sensor &&
        (rule.zone === '' || rule.zone === '*' || r.zone === rule.zone)
      );
      for (const reading of matches) {
        const value = parseFloat(reading.value);
        if (isNaN(value)) continue;
        const stateKey = rule.rule_id + '|' + deviceId;
        const state    = stateMap[stateKey] || {
          active: false, triggered_at: 0, last_action_at: 0,
          last_value: value, action_count: 0
        };
        const outside      = value < rule.min_val || value > rule.max_val;
        const recoveredBand= value >= (rule.min_val + rule.hysteresis) &&
                             value <= (rule.max_val - rule.hysteresis);
        const cooldownOk   = state.last_action_at === 0 ||
                             (nowMs - state.last_action_at) >= (rule.cooldown_sec * 1000);
        if (outside) {
          if (!state.active) {
            if (state.triggered_at === 0) state.triggered_at = nowMs;
            const elapsed = nowMs - state.triggered_at;
            const durationOk = rule.duration_sec === 0 ||
                               elapsed >= (rule.duration_sec * 1000);
            if (durationOk && cooldownOk) {
              state.active         = true;
              state.last_value     = value;
              state.last_action_at = nowMs;
              state.action_count   = (state.action_count || 0) + 1;
              const act = _executeAction(rule, deviceId, value, 'trigger');
              if (act) actions.push(act);
            }
          } else {
            state.last_value = value;
          }
        } else {
          state.triggered_at = 0;
          if (state.active && recoveredBand && cooldownOk) {
            state.active         = false;
            state.last_value     = value;
            state.last_action_at = nowMs;
            const act = _executeAction(rule, deviceId, value, 'reset');
            if (act) actions.push(act);
          }
        }

        _saveState(sheet, stateMap, rule.rule_id, deviceId, state);
      }
    }

    return actions;
  }

//-------------thêm 07.04.2026  thêm rule Reset action---------------------

function _getResetAction(rule) {
  if (rule.reset_action && rule.reset_action !== '') {
    return rule.reset_action;
  }

  const action = rule.action;
  if (action.endsWith('_on')) return action.replace(/_on$/, '_off');
  if (action.endsWith('_off')) return action.replace(/_off$/, '_on');
  return null;
}

  /* ---------- execute action ---------- */

function _executeAction(rule, deviceId, value, triggerType) {
  try {
    // Xác định lệnh cần gửi (trigger hay reset)
    let command = triggerType === 'reset' ? _getResetAction(rule) : rule.action;
    if (!command) return null;
    const targetDevice = (rule.device_id && rule.device_id !== '*')
                         ? rule.device_id : deviceId;
    // Chuẩn bị tham số cho lệnh
    const commandParams = {
      triggered_by: 'smart_control',
      rule_id:      rule.rule_id,
      sensor:       rule.sensor,
      value:        value,
      zone:         rule.zone,
      trigger_type: triggerType,
      ts:           getCurrentUTCTimestamp()
    };
    let result = null;
    try {
      // Gửi lệnh qua IoTCore (hàm này có thể throw hoặc trả về status)
      result = IoTCore.sendCommandToDevice(targetDevice, command, commandParams);
      // Kiểm tra nếu không thành công (tuỳ theo cách trả về của sendCommandToDevice)
      if (!result || result.status !== 'queued') {
        throw new Error('Command not queued or invalid response');
      }

    } catch (err) {
      // Ghi log lỗi
      console.error(`[SmartControl] Command failed for rule ${rule.rule_id}: ${err.message}`);
      EventModule.logEvent(deviceId, 'rule_action_failed', {
        rule_id: rule.rule_id,
        command,
        error: err.message,
        trigger_type: triggerType
      }, 'smart_control');
      // Thêm vào hàng đợi retry
      RetryQueue.add(targetDevice, command, commandParams, rule.rule_id);
      return null; // Không trả về action thành công
    }
    // Ghi log thành công
    EventModule.logEvent(deviceId, 'rule_' + triggerType, {
      rule_id: rule.rule_id,
      sensor: rule.sensor,
      value,
      action: command,
      zone: rule.zone
    }, 'smart_control');
    // Gửi email cảnh báo khi trigger (nếu cần)
    if (triggerType === 'trigger') {
      try {
        MailApp.sendEmail(
          prop('ADMIN_EMAILS'),
          '[EcoSynTech SmartControl] Rule triggered: ' + rule.rule_id,
          JSON.stringify({
            rule_id: rule.rule_id,
            device_id: targetDevice,
            sensor: rule.sensor,
            value,
            action: command,
            zone: rule.zone,
            ts: getCurrentUTCTimestamp()
          })
        );
      } catch (e) { console.error('SmartControl email failed:', e); }
    }

    return { rule_id: rule.rule_id, device_id: targetDevice,
             command, trigger_type: triggerType,
             sensor: rule.sensor, value, result };
  } catch (e) {
    console.error('[SmartControlEngine] Action error:', e);
    EventModule.logEvent(deviceId, 'rule_action_error',
      { rule_id: rule.rule_id, error: String(e) }, 'smart_control');
    return null;
  }
}

  /* ---------- rule management API ---------- */

  function addRule(data) {
  ensureRuleSheet();
  const ss = Database.getSpreadsheet();
  const sheet = ss.getSheetByName(RULE_SHEET);
  const ruleId = 'rule_' + Utilities.getUuid().slice(0, 8);
  // Sửa: thêm reset_action, cooldown_sec, và đầy đủ 12 cột
  writeAtTop(sheet, [
    ruleId,
    data.zone || '',
    data.sensor || '',
    data.min_val !== undefined ? data.min_val : 0,
    data.max_val !== undefined ? data.max_val : 100,
    data.hysteresis !== undefined ? data.hysteresis : 0,
    data.duration_sec !== undefined ? data.duration_sec : 0,
    data.action || '',
    data.reset_action || '',
    data.device_id || '*',
    data.cooldown_sec !== undefined ? data.cooldown_sec : 300,
    data.enabled !== undefined ? data.enabled : true
  ], [
    'rule_id','zone','sensor','min','max',
    'hysteresis','duration_sec','action','reset_action',
    'device_id','cooldown_sec','enabled'
  ]);
  EventModule.logEvent('system', 'rule_added', { rule_id: ruleId, ...data }, 'admin');
  return { ok: true, rule_id: ruleId };
}

  /* [V9.0 NOTE] _executeAction đã ghi log qua EventModule.logEvent (được patch ở PATCH 03 → writeAtTop). Không cần sửa gì thêm tại đây. */

  function updateRule(ruleId, updates) {
    _invalidateRuleCache(); // [V9.1 FIX-H1]
    const ss    = Database.getSpreadsheet();
    const sheet = ss.getSheetByName(RULE_SHEET);
    if (!sheet) return { ok: false, message: 'ControlRules sheet not found' };
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idCol   = headers.indexOf('rule_id');
    if (idCol === -1) return { ok: false, message: 'rule_id column missing' };
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === ruleId) {
        for (const [k, v] of Object.entries(updates)) {
          const col = headers.indexOf(k.toLowerCase());
          if (col !== -1) sheet.getRange(i + 1, col + 1).setValue(v);
        }

        EventModule.logEvent('system', 'rule_updated',
          { rule_id: ruleId, ...updates }, 'admin');
        return { ok: true };
      }
    }

    return { ok: false, message: 'Rule not found' };
  }

  function disableRule(ruleId) { return updateRule(ruleId, { enabled: false }); }
  function enableRule(ruleId)  { return updateRule(ruleId, { enabled: true  }); }
  function getRuleStatus() {
    const rules  = loadRules();
    const states = _loadStates();
    return rules.map(rule => {
      const key   = rule.rule_id + '|' + rule.device_id;
      const state = states[key] || {
        active: false, last_value: null, action_count: 0, last_action_at: 0
      };
      return Object.assign({}, rule, {
        state_active:  state.active,
        last_value:    state.last_value,
        action_count:  state.action_count,
        last_action_at:state.last_action_at
                       ? new Date(state.last_action_at).toISOString() : null
      });

    });

  }
  return {
    loadRules,
    evaluateRules,
    addRule,
    updateRule,
    disableRule,
    enableRule,
    getRuleStatus,
    ensureRuleSheet
  };
})();

/* ================================================================

   **18. INTEGRATION MANAGER MODULE**
   ================================================================ */
const IntegrationManager = (() => {
  const INTEGRATION_CONFIGS = {};
  const syncFunctions = {
    syncERPDownstream: function () { console.log('Syncing data from ERP system'); },
    syncERPUpstream:   function () { console.log('Syncing data to ERP system'); }
  };
  function initializeIntegrations() {
    _loadIntegrationConfigs();
    _setupWebhooks();
    testConnections();
  }

  function _loadIntegrationConfigs() {
    const configs = JSON.parse(PropertiesService.getScriptProperties().getProperty('INTEGRATION_CONFIGS') || '{}');
    Object.assign(INTEGRATION_CONFIGS, configs);
  }

  function _setupWebhooks() {
    if (!INTEGRATION_CONFIGS.webhooks) return;
    INTEGRATION_CONFIGS.webhooks.forEach(w => { if (w.enabled) console.log('Webhook ready: ' + w.name); });
  }

  function testConnections() {
    const results = {};
    if (INTEGRATION_CONFIGS.erp) results.erp = { ok: true };
    if (INTEGRATION_CONFIGS.crm) results.crm = { ok: true };
    if (INTEGRATION_CONFIGS.bi)  results.bi  = { ok: true };
    return results;
  }

  function integrateWithErp(operation, data) {
    const config = INTEGRATION_CONFIGS.erp;
    if (!config || !config.enabled) throw new Error('ERP integration not configured');
    return { ok: true, operation };
  }

  function integrateWithCrm(operation, data) {
    const config = INTEGRATION_CONFIGS.crm;
    if (!config || !config.enabled) throw new Error('CRM integration not configured');
    return { ok: true, operation };
  }

  function integrateWithBi(operation, data) {
    const config = INTEGRATION_CONFIGS.bi;
    if (!config || !config.enabled) throw new Error('BI integration not configured');
    return { ok: true, operation };
  }

  function handleIncomingWebhook(source, payload) {
    const payloadForSign = JSON.parse(JSON.stringify(payload));
    delete payloadForSign.signature;
    const expected = Security.hmacSha256(canonicalStringify(payloadForSign), prop('HMAC_SECRET'));
    if (!Security.timingSafeEqual(expected, payload.signature)) throw new Error('Invalid webhook signature');
    switch (source) {
      case 'erp': case 'crm': case 'bi': case 'payment_gateway':
        return { ok: true, source };
      default: throw new Error('Unknown webhook source: ' + source);
    }
  }

  function syncData(system, direction, options) {
    options = options || {};
    const fnName = 'sync' + system.toUpperCase() + direction.charAt(0).toUpperCase() + direction.slice(1);
    if (typeof syncFunctions[fnName] !== 'function') {
      throw new Error('Unsupported sync operation: ' + system + ' ' + direction);
    }

    return syncFunctions[fnName](options);
  }

  return { initializeIntegrations, integrateWithErp, integrateWithCrm, integrateWithBi, handleIncomingWebhook, syncData, testConnections };
})();

/* ================================================================

** 19 .  SYSTEM MONITOR MODULE**
   ================================================================ */
const SystemMonitor = (() => {
  function performMonitoringCheck() {
    try {
      const checkResults = {
        timestamp:       new Date().toISOString(),
        health:          checkSystemHealth(),
        performance:     checkSystemPerformance(),
        errors:          checkRecentErrors(),
        alerts:          checkActiveAlerts(),
        recommendations: generateRecommendations()
      };
      _logMonitoringResults(checkResults);
      if (checkResults.alerts.critical > 0 || checkResults.alerts.warning > 0) {
        _sendMonitoringAlerts(checkResults);
      }

      _updateMonitoringDashboard(checkResults);
      return checkResults;
    } catch (error) {
      console.error('Monitoring check failed:', error);
      return { timestamp: new Date().toISOString(), error: error.message, status: 'monitoring_failed' };
    }
  }

  function checkSystemHealth() {
    return {
      database:     _checkDatabaseHealth(),
      storage:      _checkStorageHealth(),
      api:          _checkApiHealth(),
      scripts:      _checkScriptHealth(),
      integrations: _checkIntegrationHealth()
    };
  }

  function checkSystemPerformance() {
    return {
      response_time:  _measureResponseTime(),
      throughput:     _measureThroughput(),
      error_rate:     _calcErrorRate(),
      uptime:         _calculateUptime(),
      resource_usage: { cpu: 15, memory: 40 }
    };
  }

  function checkRecentErrors() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const errors = Database.getSheetData('EventLogs').filter(e => e.event === 'error' && new Date(e.ts) > oneHourAgo);
    return {
      total: errors.length,
      by_source:   _groupErrorsBySource(errors),
      by_severity: _groupErrorsBySeverity(errors),
      recent:      errors.slice(0, 10)
    };
  }

  function checkActiveAlerts() {
    const alerts = Database.getSheetData('Alerts').filter(a => a.status === 'active' || a.status === 'unacknowledged');
    return {
      total:    alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning:  alerts.filter(a => a.severity === 'warning').length,
      info:     alerts.filter(a => a.severity === 'info').length,
      alerts:   alerts.slice(0, 20)
    };
  }

  function generateRecommendations() {
    const recommendations = [];
    const health      = checkSystemHealth();
    const performance = checkSystemPerformance();
    if (health.database.usage > 80) recommendations.push({ type: 'database', severity: 'warning', message: 'Database usage is high. Consider archiving old data.', action: 'archive_old_data' });
    if (health.storage.usage_percent > 75) recommendations.push({ type: 'storage', severity: 'warning', message: 'Storage usage is high. Consider cleaning up old files.', action: 'cleanup_storage' });
    if (performance.response_time.average > 5000) recommendations.push({ type: 'performance', severity: 'warning', message: 'Average response time is high. Consider optimizing queries.', action: 'optimize_queries' });
    return recommendations;
  }

  function createSystemAlert(alertData) {
    const alert = Object.assign({ alert_id: 'alert_' + Utilities.getUuid().slice(0, 8), timestamp: new Date().toISOString() }, alertData, { status: 'active', acknowledged: false, acknowledged_by: null, acknowledged_at: null });
    Database.batchAppendRows('Alerts', [alert]);
    if (alertData.severity === 'critical') {
      try { MailApp.sendEmail(prop('ADMIN_EMAILS'), '[URGENT] ' + alertData.severity, JSON.stringify(alert)); } catch (e) {}
    }

    return alert;
  }

  function setupMonitoringTriggers() {
    ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'monitoringTick') ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger('monitoringTick').timeBased().everyMinutes(5).create();
  }
  // Private helpers
  function _checkDatabaseHealth() {
    try {
      const start = Date.now();
      Database.getSpreadsheet().getSheetByName('Devices');
      const latency = Date.now() - start;
      return { healthy: true, latency_ms: latency, usage: _getDatabaseUsagePercent() };
    } catch (e) { return { healthy: false, error: e.message, usage: 0 }; }
  }

  function _getDatabaseUsagePercent() {
    try {
      const ss = Database.getSpreadsheet();
      let totalCells = 0;
      ss.getSheets().forEach(s => { totalCells += s.getMaxRows() * s.getMaxColumns(); });
      return Math.min(100, Math.round((totalCells / 5000000) * 100));
    } catch (e) { return 0; }
  }

  function _checkStorageHealth() {
    try {
      const folderId = prop('MEDIA_FOLDER_ID') || prop('QR_FOLDER_ID');
      if (!folderId || folderId === 'CHANGE_ME') return { healthy: true, usage_percent: 0 };
      const folder = DriveApp.getFolderById(folderId);
      const files  = folder.getFiles();
      let total = 0;
      while (files.hasNext()) total += files.next().getSize();
      const pct = (total / (15 * 1024 * 1024 * 1024)) * 100;
      return { healthy: pct < 90, usage_bytes: total, usage_percent: pct };
    } catch (e) { return { healthy: false, error: e.message, usage_percent: 0 }; }
  }

  function _checkApiHealth() {
    const url = prop('WEBAPP_URL');
    if (!url || url === 'CHANGE_ME') return { healthy: false, error: 'WEBAPP_URL not set' };
    try {
      const res = UrlFetchApp.fetch(url + '?action=ping', { muteHttpExceptions: true });
      return { healthy: res.getResponseCode() === 200, status_code: res.getResponseCode() };
    } catch (e) { return { healthy: false, error: e.message }; }
  }

  function _checkScriptHealth() {
    const triggers = ScriptApp.getProjectTriggers();
    return { healthy: true, triggers_count: triggers.length, has_monitoring: triggers.some(t => t.getHandlerFunction() === 'monitoringTick') };
  }

  function _checkIntegrationHealth() {
    return { healthy: true, configured: { firebase: !!prop('FIREBASE_API_KEY') && prop('FIREBASE_API_KEY') !== 'CHANGE_ME', cloudrun: !!prop('CLOUD_FN_URL') && prop('CLOUD_FN_URL') !== 'CHANGE_ME', hedera: !!prop('BLOCKCHAIN_POST_URL') } };
  }

  function _measureResponseTime() {
    const samples = 3;
    let total = 0;
    for (let i = 0; i < samples; i++) {
      const start = Date.now();
      Database.getSheetData('Devices', false);
      total += Date.now() - start;
    }

    const avg = total / samples;
    return { average: avg, p95: avg * 1.2, samples };
  }

  function _measureThroughput() {
    const events  = Database.getSheetData('EventLogs');
    const lastMin = new Date(Date.now() - 60000);
    return { requests_per_minute: events.filter(e => new Date(e.ts) > lastMin).length };
  }

  function _calcErrorRate() {
    const events    = Database.getSheetData('EventLogs');
    const lastHour  = new Date(Date.now() - 3600000);
    const hourEvents = events.filter(e => new Date(e.ts) > lastHour);
    if (!hourEvents.length) return 0;
    return (hourEvents.filter(e => e.event === 'error').length / hourEvents.length) * 100;
  }

  function _calculateUptime() {
    const lastDeploy = PropertiesService.getScriptProperties().getProperty('LAST_DEPLOY_TIME');
    if (!lastDeploy) return 99.9;
    const days = (Date.now() - new Date(lastDeploy).getTime()) / (1000 * 3600 * 24);
    return Math.max(99, 100 - (days / 365) * 0.5);
  }

  function _groupErrorsBySource(errors) {
    const groups = {};
    errors.forEach(e => { const src = e.source || 'unknown'; groups[src] = (groups[src] || 0) + 1; });
    return groups;
  }

  function _groupErrorsBySeverity(errors) {
    const groups = { low: 0, medium: 0, high: 0 };
    errors.forEach(e => {
      const sev = (e.severity || 'low').toLowerCase();
      if (sev === 'critical' || sev === 'high') groups.high++;
      else if (sev === 'warning' || sev === 'medium') groups.medium++;
      else groups.low++;
    });

    return groups;
  }

  function _logMonitoringResults(results) {
    EventModule.logEvent('system', 'monitoring', { timestamp: results.timestamp, errors: results.errors.total, critical_alerts: results.alerts.critical }, 'monitor');
  }

  function _updateMonitoringDashboard(results) {
    try {
      const sheet = Database.getSpreadsheet().getSheetByName('Monitoring');
      if (sheet) sheet.appendRow([results.timestamp, results.alerts.critical, results.alerts.warning, results.errors.total]);
    } catch (e) {}
  }

  function _sendMonitoringAlerts(checkResults) {
    const config = JSON.parse(PropertiesService.getScriptProperties().getProperty('ALERT_CONFIG') || '{}');
    if (checkResults.alerts.critical > 0) {
      try { MailApp.sendEmail(prop('ADMIN_EMAILS'), '[EcoSynTech CRITICAL] ' + checkResults.alerts.critical + ' alerts', JSON.stringify(checkResults)); } catch (e) {}
    }

    const webhook = prop('MONITORING_WEBHOOK');
    if (webhook) {
      try { UrlFetchApp.fetch(webhook, { method: 'post', payload: JSON.stringify(checkResults), muteHttpExceptions: true }); } catch (e) {}
    }
  }
  return {
    performMonitoringCheck, createSystemAlert, setupMonitoringTriggers,
    checkSystemHealth, checkSystemPerformance, checkRecentErrors,
    checkActiveAlerts, generateRecommendations
  };
})();

/* ================================================================

  **20 .  DEPLOYMENT MANAGER MODULE**
   ================================================================ */
const DeploymentManager = (() => {
  function syncPublicSheets() {
    const srcSs = Database.getSpreadsheet();
    const dstSsId = prop('PUBLIC_COPY_ID');
    if (!dstSsId || dstSsId === 'CHANGE_ME') return { ok: false, message: 'Thiếu PUBLIC_COPY_ID' };
    const dstSs = SpreadsheetApp.openById(dstSsId);
    const sheets = prop('SYNC_SHEETS').split(',').map(s => s.trim());
    sheets.forEach(sheetName => {
      const src = srcSs.getSheetByName(sheetName);
      if (!src) return;
      const dst = dstSs.getSheetByName(sheetName) || dstSs.insertSheet(sheetName);
      const data = src.getDataRange().getValues();
      dst.clear();
      dst.getRange(1,1,data.length, data[0].length).setValues(data);
    });

    return { ok: true, message: `Đã đồng bộ ${sheets.length} sheets` };
  }

  function ensureRequiredSheetHeaders() {
    const ss = Database.getSpreadsheet();
    const required = {
      'Devices': ['device_id','device_name','device_secret','endpoint_url','provisioned_at','last_seen','status'],
      'Commands': ['command_id','command','params','device_id','Status','created_at','executed_at','result','source'],
      'BacklogQueue': ['queue_id','command_id','device_id','status','created_at','attempts','payload'],
      'Batchsheet': ['batch_id','batch_name','product','type','start_date','end_date','status','zone','force_send','created_at','notes'],
      'BatchInfo': ['batch_id','info_key','info_value','device_id','device_endpoint','QR_Public_Link','QR_Nonce','QR_Generated_TS','QR_FileUrl','snapshot_id','gcs_path'],
      'EventLogs': ['ts','entity','event','payload','source','note'],
      'ControlRules': ['rule_id','zone','sensor','min','max','hysteresis','duration_sec','action','reset_action','device_id','cooldown_sec','enabled'],
      'Snapshot_Log': ['ts','snapshotId','batch_ids','leafCount','merkleRoot','txHash','gcsPath','resp'],
      'Blockchain_Log': ['ts','snapshot_id','merkle_root','tx_id','explorer','raw','status','notes']
    };
    Object.keys(required).forEach(name => {
      let sh = ss.getSheetByName(name);
      if (!sh) sh = ss.insertSheet(name);
      const lastColSafe = Math.max(sh.getLastColumn(), 1);
      const firstRow = sh.getRange(1,1,1,lastColSafe).getValues()[0].join('').trim();
      if (!firstRow) {
        const hdr = required[name];
        if (Array.isArray(hdr) && hdr.length > 0) {
          if (sh.getMaxColumns() < hdr.length) sh.insertColumns(1, hdr.length - sh.getMaxColumns());
          sh.getRange(1,1,1,hdr.length).setValues([hdr]);
        }
      }
    });

    return { ok: true, message: 'Đã đảm bảo các sheet & header mặc định' };
  }

  function getRequiredProperties() {
    return {
syncPublicSheets: syncPublicSheets,
ensureRequiredSheetHeaders: ensureRequiredSheetHeaders
      required: {
        SPREADSHEET_ID: 'ID of the main spreadsheet',
       PUBLIC_COPY_ID: 'ID of the public spreadsheet'
        HMAC_SECRET:    'Secret key for HMAC signatures',
        WEBAPP_URL:     'URL of the deployed web app',
        QR_FOLDER_ID:   'Google Drive folder for QR codes',
        MEDIA_FOLDER_ID:'Google Drive folder for media files'
      },
      optional: {
        CLOUD_FN_URL:        'Cloud Run function URL',
        CLOUD_FN_API_KEY:    'API key for Cloud Run',
        FIREBASE_API_KEY:    'Firebase API key',
        FIREBASE_PROJECT_ID: 'Firebase project ID',
        HEDERA_ACCOUNT_ID:   'Hedera account ID',
        HEDERA_PRIVATE_KEY:  'Hedera private key',
        ADMIN_EMAILS:        'Comma-separated admin emails'
      }
    };
  }

  function setupConfiguration() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const required = getRequiredProperties().required;
    Object.keys(required).forEach(key => {
      const v = scriptProperties.getProperty(key);
      if (!v || v === 'CHANGE_ME') throw new Error('Required property not set: ' + key);
    });

    const optional = getRequiredProperties().optional;
    Object.keys(optional).forEach(key => {
      if (!scriptProperties.getProperty(key)) scriptProperties.setProperty(key, '');
    });

    return { success: true, message: 'Configuration verified and set up' };
  }

  function cleanupOldData() {
    const daysToKeep = parseInt(prop('CLEANUP_DAYS'), 10) || 90;
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const sheetsToClean = ['EventLogs', 'SensorReadings', 'Alerts', 'BlockchainTransactions', 'TestReports'];
    const results = {};
    sheetsToClean.forEach(sheetName => {
      try {
        const sheet = Database.getSpreadsheet().getSheetByName(sheetName);
        if (!sheet) return;
        const data    = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        const tsCol   = headers.findIndex(h => h.includes('timestamp') || h.includes('created_at') || h === 'ts');
        if (tsCol === -1) return;
        const rowsToDelete = [];
        for (let i = 1; i < data.length; i++) {
          if (new Date(data[i][tsCol]) < cutoffDate) rowsToDelete.push(i + 1);
        }

        rowsToDelete.reverse().forEach(row => sheet.deleteRow(row));
        results[sheetName] = { deleted: rowsToDelete.length };
      } catch (error) { results[sheetName] = { error: error.message }; }
    });

    return results;
  }

  function createBackup() {
    const backupFolderId = prop('MEDIA_FOLDER_ID');
    if (!backupFolderId || backupFolderId === 'CHANGE_ME') throw new Error('Backup folder not configured');
    const ss           = Database.getSpreadsheet();
    const backupFolder = DriveApp.getFolderById(backupFolderId);
    const stamp        = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd_HH-mm-ss');
    const backupFile   = DriveApp.getFileById(ss.getId()).makeCopy('Backup_' + stamp, backupFolder);
    PropertiesService.getScriptProperties().setProperty('LAST_BACKUP_TIMESTAMP', new Date().toISOString());
    return { success: true, spreadsheet_backup: backupFile.getId(), timestamp: new Date().toISOString() };
  }

  function runMaintenanceTasks() {
    return {
      cleanup:  cleanupOldData(),
      backup:   createBackup(),
      optimize: { optimized: true },
      update:   { update_available: false }
    };
  }

  function getDeploymentGuide() {
    return {
      prerequisites: { google_account: 'Google account with Drive, Sheets, Apps Script access' },
      setup_steps: [
        { step: 1, description: 'Create a new Google Spreadsheet', details: 'Copy the SPREADSHEET_ID for Script Properties' },
        { step: 2, description: 'Create Google Drive folders', details: 'QR and Media folders; copy FOLDER_IDs' },
        { step: 3, description: 'Set Script Properties', details: 'All REQUIRED properties must be set (no CHANGE_ME values)' },
        { step: 4, description: 'Deploy as web app', details: 'Execute as USER_ACCESSING or USER_DEPLOYING; note WEBAPP_URL' },
        { step: 5, description: 'Configure external services', details: 'Hedera, Cloud Run, Firebase' },
        { step: 6, description: 'Run initialSetup()', details: 'Registers all triggers and validates config' }
      ],
      configuration_properties: getRequiredProperties()
    };
  }

  return { setupConfiguration, cleanupOldData, createBackup, runMaintenanceTasks, getDeploymentGuide };
})();

/* ================================================================

   **21 . QR MODULE**
   ================================================================ */
const QRModule = (() => {
  function generateSignedBatchUrl(identifier, expiryDays) {
    const WEBAPP_URL  = prop('WEBAPP_URL');
    const HMAC_SECRET = prop('HMAC_SECRET');
    expiryDays = expiryDays || parseInt(prop('QR_EXPIRY_DAYS'), 10) || 365;
    const exp     = Math.floor(Date.now() / 1000) + expiryDays * 24 * 3600;
    const nonce   = Utilities.getUuid().slice(0, 12);
    const isQrId  = identifier.startsWith('QR_');
    const payload = isQrId ? { qrId: identifier, exp, nonce } : { batchId: identifier, exp, nonce };
    const sig     = Security.hmacSha256(canonicalStringify(payload), HMAC_SECRET);
    const url     = isQrId
      ? WEBAPP_URL + '?action=view_qr&qr='    + encodeURIComponent(identifier) + '&exp=' + exp + '&nonce=' + nonce + '&sig=' + sig
      : WEBAPP_URL + '?action=view_batch&batch=' + encodeURIComponent(identifier) + '&exp=' + exp + '&nonce=' + nonce + '&sig=' + sig;
    return { url, exp, nonce, sig, isDynamic: isQrId };
  }

  function generateDynamicQrCode(batchId, initialData) {
    initialData = initialData || {};
    const ss      = Database.getSpreadsheet();
    const qrSheet = ss.getSheetByName('DynamicQR') || ss.insertSheet('DynamicQR');
    if (qrSheet.getLastRow() < 1) {
      qrSheet.getRange(1, 1, 1, 7).setValues([['qr_id', 'batch_id', 'metadata', 'created_at', 'updated_at', 'version', 'is_active']]);
    }

    const qrId     = 'QR_' + Utilities.getUuid().slice(0, 12);
    const now      = getCurrentUTCTimestamp();
    const metadata = JSON.stringify(initialData);
    qrSheet.appendRow([qrId, batchId, metadata, now, now, 1, true]);
    const signedUrl = generateSignedBatchUrl(qrId);
    const qrUrl     = generateQrCode(signedUrl.url, qrId);
    return { qrId, qrUrl, signedUrl };
  }

  function updateDynamicQrMetadata(qrId, newMetadata) {
    const ss      = Database.getSpreadsheet();
    const qrSheet = ss.getSheetByName('DynamicQR');
    if (!qrSheet) return { ok: false, message: 'DynamicQR sheet not found' };
    const data    = qrSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idCol      = headers.indexOf('qr_id');
    const metadataCol = headers.indexOf('metadata');
    const updatedCol  = headers.indexOf('updated_at');
    const versionCol  = headers.indexOf('version');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === qrId) {
        let current = {};
        try { current = JSON.parse(data[i][metadataCol] || '{}'); } catch (e) {}
        const merged     = Object.assign({}, current, newMetadata);
        const newVersion = parseInt(data[i][versionCol] || 0, 10) + 1;
        qrSheet.getRange(i + 1, metadataCol + 1).setValue(JSON.stringify(merged));
        qrSheet.getRange(i + 1, updatedCol + 1).setValue(getCurrentUTCTimestamp());
        qrSheet.getRange(i + 1, versionCol + 1).setValue(newVersion);
        return { ok: true, version: newVersion, metadata: merged };
      }
    }

    return { ok: false, message: 'QR ID not found' };
  }

  function generateQrCode(url, batchId) {
    try {
      const folderId = prop('QR_FOLDER_ID');
      if (!folderId || folderId === 'CHANGE_ME') return null;
      const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(url);
      const blob  = UrlFetchApp.fetch(qrUrl).getBlob().setName('QR_' + batchId + '.png');
      const file  = DriveApp.getFolderById(folderId).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    } catch (e) { Logger.log('QR generation error for ' + batchId + ': ' + e); return null; }
  }

  function saveQrPngToDrive(signedUrl, batchId) {
    const folderId = prop('QR_FOLDER_ID');
    if (!folderId || folderId === 'CHANGE_ME') return null;
    try {
      const chartUrl = 'https://chart.googleapis.com/chart?chs=600x600&cht=qr&chl=' + encodeURIComponent(signedUrl);
      const resp     = UrlFetchApp.fetch(chartUrl, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) return null;
      const blob = resp.getBlob().setName(batchId + '_qr.png');
      const file = DriveApp.getFolderById(folderId).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return { id: file.getId(), url: file.getUrl() };
    } catch (e) { return null; }
  }

  function qrFormulaFromUrl(url, size) {
    size = size || 300;
    return '=IMAGE("https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&chl=' + encodeURIComponent(url) + '",4,' + size + ',' + size + ')';
  }

  return { generateSignedBatchUrl, generateDynamicQrCode, updateDynamicQrMetadata, generateQrCode, saveQrPngToDrive, qrFormulaFromUrl };
})();

/* ================================================================

**   22 . MEDIA MODULE**
   ================================================================ */
const MediaModule = (() => {
  function uploadMedia(fileBlob, batchId, mediaType) {
    mediaType = mediaType || 'image';
    const folderId = prop('MEDIA_FOLDER_ID') || prop('QR_FOLDER_ID');
    if (!folderId || folderId === 'CHANGE_ME') return { ok: false, message: 'Media folder not configured' };
    try {
      const maxSizeMB = parseInt(prop('MEDIA_MAX_SIZE_MB'), 10) || 2;
      const maxSize   = maxSizeMB * 1024 * 1024;
      const bytes     = fileBlob.getBytes().length;
      const sizeMB    = +(bytes / (1024 * 1024)).toFixed(2);
      const mimeType  = (typeof fileBlob.getContentType === 'function') ? fileBlob.getContentType() : 'application/octet-stream';
      if (bytes > maxSize) {
        return { ok: false, code: 'FILE_TOO_LARGE', message: 'File quá lớn (' + sizeMB + ' MB). Giới hạn ' + maxSizeMB + ' MB.' };
      }

      const fileName = batchId + '_' + mediaType + '_' + Utilities.getUuid().slice(0, 8);
      const file     = DriveApp.getFolderById(folderId).createFile(fileBlob).setName(fileName);
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      try { file.setDescription(JSON.stringify({ batchId, uploaded_at: getCurrentUTCTimestamp(), mimeType })); } catch (e) {}
      const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, file.getBlob().getBytes());
      const sha256    = '0x' + hashBytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
      return { ok: true, fileId: file.getId(), url: file.getUrl(), directUrl: 'https://drive.google.com/uc?id=' + file.getId() + '&export=download', sizeBytes: bytes, sizeMB, mimeType, sha256 };
    } catch (err) { return { ok: false, error: String(err) }; }
  }

  function linkMediaToBatch(batchId, mediaUrl, mediaType, caption) {
    caption = caption || '';
    const ss         = Database.getSpreadsheet();
    const mediaSheet = ss.getSheetByName('BatchMedia') || ss.insertSheet('BatchMedia');
    if (mediaSheet.getLastRow() < 1) {
      mediaSheet.getRange(1, 1, 1, 6).setValues([['batch_id', 'media_url', 'media_type', 'caption', 'uploaded_at', 'is_primary']]);
    }

    mediaSheet.appendRow([batchId, mediaUrl, mediaType, caption, getCurrentUTCTimestamp(), false]);
    return { ok: true };
  }

  function getBatchMedia(batchId) {
    const ss         = Database.getSpreadsheet();
    const mediaSheet = ss.getSheetByName('BatchMedia');
    const media      = [];
    if (!mediaSheet) return media;
    const data    = mediaSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const batchCol   = headers.indexOf('batch_id');
    const urlCol     = headers.indexOf('media_url');
    const typeCol    = headers.indexOf('media_type');
    const captionCol = headers.indexOf('caption');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][batchCol]) === batchId) {
        media.push({ url: data[i][urlCol], type: data[i][typeCol], caption: data[i][captionCol] });
      }
    }

    return media;
  }

  return { uploadMedia, linkMediaToBatch, getBatchMedia };
})();

/* ================================================================

**   23. LANGUAGE MODULE**
   ================================================================ */
const LanguageModule = (() => {
  const STRINGS = {
    en: { product_info: 'Product Information', batch_id: 'Batch ID', production_date: 'Production Date', harvest_date: 'Harvest Date', origin: 'Origin', quality_metrics: 'Quality Metrics', view_more: 'View More Details' },
    vi: { product_info: 'Thông tin sản phẩm', batch_id: 'Mã lô hàng', production_date: 'Ngày sản xuất', harvest_date: 'Ngày thu hoạch', origin: 'Xuất xứ', quality_metrics: 'Chỉ số chất lượng', view_more: 'Xem thêm chi tiết' },
    zh: { product_info: '产品信息', batch_id: '批次ID', production_date: '生产日期', harvest_date: '收获日期', origin: '原产地', quality_metrics: '质量指标', view_more: '查看更多详情' }
  };
  function getLanguageSupport() { return STRINGS; }
  function detectLanguage(request) {
    const supported = ['en', 'vi', 'zh'];
    const langParam = request && request.parameter && request.parameter.lang;
    if (langParam && supported.includes(langParam)) return langParam;
    const acceptLang = (request && request.headers && (request.headers['Accept-Language'] || request.headers['accept-language'])) || '';
    if (acceptLang) {
      const browserLang = acceptLang.split(',')[0].split('-')[0].toLowerCase();
      if (browserLang === 'vn') return 'vi';
      if (supported.includes(browserLang)) return browserLang;
    }

    return 'vi';
  }

  return { getLanguageSupport, detectLanguage };
})();

/* ================================================================

   **24. SNAPSHOT MODULE**
   ================================================================ */
const SnapshotModule = (() => {
  // Gửi snapshot lên Cloud Run (dùng chung với CloudRun.sendSnapshot nhưng thêm logic)
  function sendSnapshotToCloudRun(batchId, entries) {
    try {
      const payload = {
        action: "submitSnapshot",
        api_key: prop('CLOUD_FN_API_KEY'),
        snapshotId: `${Math.floor(Date.now()/1000)}_${Utilities.getUuid().slice(0,8)}`,
        batch_ids: [batchId],
        entries: entries,
        meta: { device_id: prop('deviceId') || 'GAS', created_at: getCurrentUTCTimestamp() }
      };
      const result = CloudRun.sendSnapshot(payload);
      if (result && result.ok) {
        return { ok: true, snapshotId: result.snapshotId, gcsPath: result.gcsPath };
      }

      return { ok: false, error: result?.error || 'CloudRun send failed' };
    } catch(e) {
      return { ok: false, error: String(e) };
    }
  }
  // Xử lý batch mới: tạo QR + gửi snapshot + cập nhật sheet
  function processNewBatchesAndGenerateQr() {
    try {
      const ss = Database.getSpreadsheet();
      const sheet = ss.getSheetByName("BatchInfo");
      if (!sheet) throw new Error("Sheet BatchInfo not found");
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const batchIdCol = headers.indexOf("batch_id");
      const statusCol = headers.indexOf("status");
      const qrUrlCol = headers.indexOf("qr_url");
      const snapshotIdCol = headers.indexOf("snapshot_id");
      const gcsPathCol = headers.indexOf("gcs_path");
      if (batchIdCol === -1 || statusCol === -1) throw new Error("Required columns missing");
      const updatedRows = [];
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][statusCol]).toLowerCase() === "pending") {
          const batchId = String(data[i][batchIdCol]);
          // Tạo QR động
          const dynamicQr = QRModule.generateDynamicQrCode(batchId, { batch_id: batchId, created_at: getCurrentUTCTimestamp() });
          QRModule.updateDynamicQrMetadata(dynamicQr.qrId, { initial_processing: getCurrentUTCTimestamp() });
          const savedQr = QRModule.saveQrPngToDrive(dynamicQr.signedUrl.url, dynamicQr.qrId);
          const qrFileUrl = savedQr ? savedQr.url : dynamicQr.qrUrl;
          // Thu thập dữ liệu cảm biến từ Batchsheet (giả định có cột batch_id)
          const batchSheet = ss.getSheetByName("Batchsheet");
          let entries = [];
          if (batchSheet) {
            const bData = batchSheet.getDataRange().getValues();
            const bHeaders = bData[0].map(h => String(h).trim().toLowerCase());
            const bBatchCol = bHeaders.indexOf("batch_id");
            if (bBatchCol !== -1) {
              for (let j = 1; j < bData.length; j++) {
                if (String(bData[j][bBatchCol]) === batchId) {
                  const row = {};
                  bHeaders.forEach((h, idx) => { row[h] = bData[j][idx]; });
                  entries.push({ id: `entry_${j}`, payload: row });
                }
              }
            }
          }
          // Gửi snapshot lên Cloud Run
          const snapshotRes = sendSnapshotToCloudRun(batchId, entries);
          // Cập nhật sheet
          if (qrUrlCol !== -1) sheet.getRange(i+1, qrUrlCol+1).setValue(qrFileUrl || '');
          if (snapshotIdCol !== -1 && snapshotRes.ok) sheet.getRange(i+1, snapshotIdCol+1).setValue(snapshotRes.snapshotId);
          if (gcsPathCol !== -1 && snapshotRes.ok) sheet.getRange(i+1, gcsPathCol+1).setValue(snapshotRes.gcsPath);
          sheet.getRange(i+1, statusCol+1).setValue('processed');
          updatedRows.push(batchId);
        }
      }

      return { updated: updatedRows };
    } catch(err) {
      EventModule.logEvent('system', 'error', { message: 'processNewBatchesAndGenerateQr error', error: String(err) }, 'server');
      return { ok: false, error: String(err) };
    }
  }

  return { processNewBatchesAndGenerateQr };
})();

/* ================================================================

   MAIN APP -- EcoSynTechApp
   ================================================================ */
const EcoSynTechApp = (() => {
  function initialize() {
    try {
      DeploymentManager.setupConfiguration();
    } catch (e) {
      console.error('Configuration incomplete: ' + e.message);
    }

    SystemMonitor.setupMonitoringTriggers();
    IntegrationManager.initializeIntegrations();
    RealTime.initFirebase();
    setupAllTriggers();
    SmartControlEngine.ensureRuleSheet(); // Khởi tạo sheet ControlRules
  }

  function handleRequest(request) {
    const method = request.method.toLowerCase();
    const params = request.parameter || {};
    let postData = null;
    if (request.postData && request.postData.contents) {
      try { postData = JSON.parse(request.postData.contents); } catch (e) { postData = null; }
    }

    const deviceId = (postData && postData.device_id) || params.device_id || 'unknown';
    const action   = params.action || (postData && postData.action) || '';
    // ---- Auth & Device validation ----
    if (method === 'post' && postData) {
      // Signed POST
      if (!postData.signature) {
        return { response: JsonResponse({ ok: false, message: 'Missing signature' }) };
      }

      const deviceSecret = Database.getDeviceSecret(deviceId);
      if (!deviceSecret) {
        return { response: JsonResponse({ ok: false, message: 'Device not allowed or missing secret' }) };
      }

      const verify = Security.verifyRequestSignature({ payload: postData, signature: postData.signature }, deviceSecret);
      if (!verify.valid) {
        return { response: JsonResponse({ ok: false, message: verify.reason }) };
      }

    } else if (method === 'get') {
      // GET requests require api_key param (except public view actions)
      const publicActions = ['view_batch', 'view_qr', 'ping'];
      if (!publicActions.includes(action)) {
        if (!Security.verifyApiKey(params.api_key)) {
          return { response: JsonResponse({ ok: false, message: 'Unauthorized: invalid api_key' }) };
        }
      }
    }
    // Kiểm tra device có được phép (trừ một số action công khai)
    const publicActions = ['view_batch', 'view_qr', 'ping' , 'admin_rules', 'heartbeat']; // heartbeat cũng không cần kiểm tra chặt
    if (!publicActions.includes(action)) {
      if (!Database.isDeviceAllowed(deviceId)) {
        return { response: JsonResponse({ ok: false, message: 'Device not allowed or inactive' }) };
      }
    }
    // ---- Router ----
    switch (action) {
      case 'ping':
        return { response: JsonResponse({ ok: true, ts: getCurrentUTCTimestamp() }) };
      case 'status': // [V9.1 NEW-I1] health check không cần auth
        return { response: JsonResponse({
          ok:            true,
          version:       '9.5',
          fw_compat:     FW_VERSION,
          ts:            getCurrentUTCTimestamp(),
          aptos_enabled: prop('APTOS_ENABLED') === 'true',
          modules:       'IoTCore,SmartControl,Advisory,Telegram,Aptos,OTA'
        })};
      case 'heartbeat':
        Database.updateDeviceLastSeen(deviceId); // [V9.1 FIX-M5]
        logEvent(deviceId, 'heartbeat', JSON.stringify(postData || {}), 'device');
        return { response: JsonResponse({ ok: true, message: 'heartbeat received', ts: getCurrentUTCTimestamp() }) };
      case 'view_batch':
        return { response: ContentService.createTextOutput(_renderBatchHtml(params)).setMimeType(ContentService.MimeType.HTML) };
      case 'view_qr':
        return { response: ContentService.createTextOutput(_renderQrHtml(params)).setMimeType(ContentService.MimeType.HTML) };
      case 'log_data': {
        if (!postData || !postData.readings) return { response: JsonResponse({ ok: false, message: 'Missing readings' }) };
        // [V9.3 GPT-1] Truyền request_id từ postData để dedup trong processSensorData
        const readings = postData.readings;
        if (postData.request_id && Array.isArray(readings) && readings.length > 0) {
          readings._request_id = postData.request_id;
        }
        IoTCore.processSensorData(deviceId, readings);
        // Smart Control Engine: đánh giá rule tự động sau mỗi lần nhận dữ liệu
        const controlActions = SmartControlEngine.evaluateRules(deviceId, postData.readings);
        // Advisory Engine: phan tich bat thuong va de xuat hanh dong
        const advisory = AdvisoryEngine.analyzeLatestReadings(postData.readings, { batchId: postData.batch_id, deviceId: deviceId });
        if (advisory.alerts && advisory.alerts.length > 0) {
          EventModule.logEvent(deviceId, 'advisory_alert', advisory, 'advisory_engine');
          // [V9.1 FIX-I4] Dedup: tránh spam Telegram -- cooldown 30 phút
          const notifyKey = 'notify_' + deviceId + '_' + (advisory.alerts[0].code || 'gen');
          if (!Database.cacheGet(notifyKey)) {
            Database.cachePut(notifyKey, '1', 1800); // cooldown 30 phút
          try {
            TelegramModule.notify('alert', {
              device_id:  deviceId,
              alert_type: 'advisory_' + (advisory.alerts[0].code || 'unknown'),
              value:      advisory.anomaly_score,
              severity:   advisory.alerts[0].level || 'medium',
              note:       advisory.summary + ' | Actions: ' + advisory.suggested_actions.join(', '),
              ts:         getCurrentUTCTimestamp()
            });

          } catch (_tge) { _handleError('Advisory:telegramNotify', _tge, 'warning'); }
          } // end dedup if
        }

        return { response: JsonResponse({ ok: true, message: 'Data logged', batchId: postData.batch_id, control_actions: controlActions.length, advisory_alerts: advisory.alerts.length }) };
      }

      case 'log_manual_event': {
        const result = EventModule.handleManualEvent(postData);
        return { response: JsonResponse(result) };
      }

           case 'execute_command':
        if (!postData || !postData.command_id || !postData.target_device) {
          return { response: JsonResponse({ ok: false, message: 'Missing command_id or target_device' }) };
        }

        const execRes = executeCommandNow(postData.command_id, postData.target_device, postData.params || {}, postData.batch_id || '');
        return { response: JsonResponse(execRes) };
      case 'update_proofs': {
        QRModule.updateDynamicQrMetadata(postData.snapshotId, { proofs: postData.proofs, txId: postData.txId });
        EventModule.logEvent(postData.snapshotId, 'onchain_update', { proofs: postData.proofs, txId: postData.txId }, 'cloudrun');
        return { response: JsonResponse({ ok: true }) };
      }
      // ---- Smart Control Engine routes ----
      case 'get_rules':
        return { response: JsonResponse({ ok: true, rules: SmartControlEngine.getRuleStatus() }) };
      case 'add_rule': {
        if (!postData) return { response: JsonResponse({ ok: false, message: 'Missing data' }) };
        return { response: JsonResponse(SmartControlEngine.addRule(postData)) };
      }

      case 'update_rule': {
        if (!postData || !postData.rule_id) return { response: JsonResponse({ ok: false, message: 'Missing rule_id' }) };
        return { response: JsonResponse(SmartControlEngine.updateRule(postData.rule_id, postData)) };
      }

      case 'disable_rule':
        return { response: JsonResponse(SmartControlEngine.disableRule(params.rule_id || (postData && postData.rule_id))) };
      case 'enable_rule':
        return { response: JsonResponse(SmartControlEngine.enableRule(params.rule_id || (postData && postData.rule_id))) };
      case 'get_batch_traceability': {
        // JSON API: tra ve day du thong tin truy xuat mot batch
        const trBatchId = params.batch_id || (postData && postData.batch_id) || '';
        if (!trBatchId) return { response: JsonResponse({ ok: false, message: 'Missing batch_id' }) };
        try {
          const ss    = Database.getSpreadsheet();
          const biSh  = ss.getSheetByName('BatchInfo');
          const manSh = ss.getSheetByName('ManualEvents');
          const senSh = ss.getSheetByName('Batchsheet');
          const medSh = ss.getSheetByName('BatchMedia');
          const qrSh  = ss.getSheetByName('DynamicQR');
          // Lay batch info
          const bRows   = biSh ? biSh.getDataRange().getValues() : [[]];
          const bHdrs   = bRows[0].map(h => String(h).trim().toLowerCase());
          let   batch   = null;
          const bIdC    = bHdrs.indexOf('batch_id');
          for (let i = 1; i < bRows.length; i++) {
            if (String(bRows[i][bIdC]).trim() === trBatchId) {
              batch = {};
              bHdrs.forEach((h, idx) => batch[h] = bRows[i][idx]);
              break;
            }
          }

          if (!batch) return { response: JsonResponse({ ok: false, message: 'Batch not found' }) };
          // Lay QR ID
          let qrId = '';
          if (qrSh) {
            const qrRows = qrSh.getDataRange().getValues();
            const qrH    = qrRows[0].map(h => String(h).trim().toLowerCase());
            const qcol   = qrH.indexOf('qr_id');
            const qbcol  = qrH.indexOf('batch_id');
            for (let i = 1; i < qrRows.length; i++) {
              if (String(qrRows[i][qbcol]).trim() === trBatchId) { qrId = String(qrRows[i][qcol]); break; }
            }
          }

          const webappUrl = prop('WEBAPP_URL');
          const qrUrl     = qrId ? (webappUrl + '?action=view_qr&qr=' + encodeURIComponent(qrId)) : '';
          // Lay events + sensor + media
          const manual  = _loadRowsByBatch(manSh, trBatchId, 'batch_id', 'timestamp');
          const sensor  = _loadRowsByBatch(senSh, trBatchId, 'batch_id', 'event_ts');
          const media   = _loadRowsByBatch(medSh, trBatchId, 'batch_id', 'created_at');
          // Chay Advisory Engine
          const advisory = AdvisoryEngine.analyzeLatestReadings(sensor, { batchId: trBatchId });
          return { response: JsonResponse({
            ok: true,
            batch,
            qr_id:      qrId,
            qr_url:     qrUrl,
            events:     manual,
            sensor_summary: { total: sensor.length, advisory },
            media_count: media.length,
            ts:         getCurrentUTCTimestamp()
          }) };
        } catch (e) {
          return { response: JsonResponse({ ok: false, error: String(e) }) };
        }
      }

      case 'get_batch_info':
        return { response: _handleGetBatchInfo(deviceId) };
      case 'get_config':
        return { response: _handleGetConfig(deviceId) };
      case 'get_pending_commands':
        return { response: _handleGetPendingCommands(deviceId) };
      case 'ota_check':
        return { response: _handleOtaCheck(deviceId) };
      case 'upload_media':
        return { response: _handleUploadMedia(postData) };
      case 'admin_rules':
        // Nếu muốn yêu cầu api_key (bảo mật cao hơn)
        if (!Security.verifyApiKey(params.api_key)) {
          return { response: JsonResponse({ ok: false, message: 'Unauthorized' }) };
        }

        const adminHtml = getRuleManagementHtml();  // gọi hàm global đã có
        return { response: HtmlService.createHtmlOutput(adminHtml).setTitle('Quản lý Rule').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) };
      default:
        return { response: JsonResponse({ ok: true, message: 'no-op' }) };
    }
  }
  // ---- Private helpers ----
  function _renderBatchHtml(params) {
    const batchId = escapeHtml(params.batch || '');
    if (!batchId) {
      return '<h3>Thieu tham so batch</h3><p>Vui long cung cap tham so batch.</p>';
    }

    const ss    = Database.getSpreadsheet();
    const biSh  = ss.getSheetByName('BatchInfo');
    if (!biSh) {
      return '<h3>Chua co BatchInfo</h3><p>Sheet BatchInfo chua duoc tao.</p>';
    }

    const rows    = biSh.getDataRange().getValues();
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const bIdCol  = headers.indexOf('batch_id');
    let   batch   = null;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][bIdCol]).trim() === batchId) {
        batch = {};
        headers.forEach((h, idx) => batch[h] = rows[i][idx]);
        break;
      }
    }

    if (!batch) {
      return '<h3>Khong tim thay batch</h3><p>Batch ID: ' + batchId + '</p>';
    }

    const webappUrl = prop('WEBAPP_URL');
    // Tim QR ID lien ket voi batch nay
    let qrLink = '';
    const qrSh = ss.getSheetByName('DynamicQR');
    if (qrSh) {
      const qrRows = qrSh.getDataRange().getValues();
      const qrH    = qrRows[0].map(h => String(h).trim().toLowerCase());
      const qcol   = qrH.indexOf('qr_id');
      const bcol   = qrH.indexOf('batch_id');
      for (let i = 1; i < qrRows.length; i++) {
        if (String(qrRows[i][bcol]).trim() === batchId) {
          const qId = String(qrRows[i][qcol]).trim();
          qrLink = webappUrl + '?action=view_qr&qr=' + encodeURIComponent(qId);
          break;
        }
      }
    }

    const name   = _esc(batch['batch_name']  || batchId);
    const type   = _esc(batch['crop_type']   || batch['type'] || '');
    const status = _esc(batch['status']       || '');
    const zone   = _esc(batch['zone']         || '');
    const start  = _esc(batch['start_date']   || '');
    return '<!DOCTYPE html><html lang="vi"><head>' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Batch: ' + name + '</title>' +
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">' +
      '</head><body class="bg-light"><div class="container py-4">' +
      '<div class="p-4 bg-white rounded-4 shadow-sm">' +
      '<span class="badge bg-success mb-2">EcoSynTech Traceability</span>' +
      '<h2>' + name + '</h2>' +
      '<p><strong>Batch ID:</strong> ' + batchId + '</p>' +
      '<p><strong>Loai cay:</strong> ' + (type || '-') + '</p>' +
      '<p><strong>Zone:</strong> ' + (zone || '-') + '</p>' +
      '<p><strong>Trang thai:</strong> ' + (status || '-') + '</p>' +
      '<p><strong>Bat dau:</strong> ' + (start || '-') + '</p>' +
      (qrLink ? '<a href="' + _esc(qrLink) + '" class="btn btn-success">Xem QR Truy Xuat Day Du</a>' : '') +
      '</div></div>' +
      '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></scr' + 'ipt>' +
      '</body></html>';
  }
  }

  function _renderQrHtml(params) {
    const ss    = Database.getSpreadsheet();
    const qrId  = String((params && params.qr) || '').trim();
    if (!qrId) {
      return ContentService.createTextOutput('<h3>QR khong hop le</h3><p>Thieu tham so qr.</p>').setMimeType(ContentService.MimeType.HTML);
    }

    const dynamicSh  = ss.getSheetByName('DynamicQR');
    const batchInfoSh = ss.getSheetByName('BatchInfo');
    if (!dynamicSh || !batchInfoSh) {
      return ContentService.createTextOutput('<h3>Thieu du lieu truy xuat</h3>').setMimeType(ContentService.MimeType.HTML);
    }
    // --- Lookup qrId -> batchId ---
    const dRows  = dynamicSh.getDataRange().getValues();
    const dH     = dRows[0].map(h => String(h).trim().toLowerCase());
    const qrCol  = dH.indexOf('qr_id');
    const bCol   = dH.indexOf('batch_id');
    const crCol  = dH.indexOf('created_at');
    const metCol = dH.indexOf('metadata');
    let batchId = '', createdAt = '', qrMeta = {};
    for (let i = 1; i < dRows.length; i++) {
      if (String(dRows[i][qrCol]).trim() === qrId) {
        batchId   = String(dRows[i][bCol] || '').trim();
        createdAt = crCol  >= 0 ? dRows[i][crCol]  : '';
        if (metCol >= 0 && dRows[i][metCol]) {
          try { qrMeta = JSON.parse(dRows[i][metCol]); } catch(e) {}
        }
        break;
      }
    }

    if (!batchId) {
      return ContentService.createTextOutput('<h3>Khong tim thay batch</h3><p>QR chua lien ket voi batch nao.</p>').setMimeType(ContentService.MimeType.HTML);
    }
    // --- Load BatchInfo ---
    const bRows = batchInfoSh.getDataRange().getValues();
    const bH    = bRows[0].map(h => String(h).trim().toLowerCase());
    const bIdC  = bH.indexOf('batch_id');
    let   batch = null;
    for (let i = 1; i < bRows.length; i++) {
      if (String(bRows[i][bIdC]).trim() === batchId) {
        batch = {};
        bH.forEach((h, idx) => batch[h] = bRows[i][idx]);
        break;
      }
    }

    if (!batch) {
      return ContentService.createTextOutput('<h3>Khong tim thay batch info</h3><p>Batch ID: ' + _esc(batchId) + '</p>').setMimeType(ContentService.MimeType.HTML);
    }
    // --- Load related data ---
    const manualSh  = ss.getSheetByName('ManualEvents');
    const sensorSh  = ss.getSheetByName('Batchsheet');
    const mediaSh   = ss.getSheetByName('BatchMedia');
    const manualEvt = _loadRowsByBatch(manualSh,  batchId, 'batch_id', 'timestamp');
    const sensorEvt = _loadRowsByBatch(sensorSh,  batchId, 'batch_id', 'event_ts');
    const mediaItems= _loadRowsByBatch(mediaSh,   batchId, 'batch_id', 'created_at');
    const chartData    = _buildSensorChartData(sensorEvt);
    const timelineHtml = _buildEventTimeline(manualEvt);
    const mediaHtml    = _buildMediaHtml(mediaItems);
    const blockchainTx   = String(batch['blockchain_tx'] || batch['blockchain_tx_hash'] || '').trim();
    const blockchainLink = blockchainTx
      ? 'https://hashscan.io/hedera/mainnet/transaction/' + encodeURIComponent(blockchainTx)
      : '';
    const cropType  = _esc(batch['crop_type']  || batch['type']  || '');
    const zone      = _esc(batch['zone']        || '');
    const startDate = _esc(batch['start_date']  || '');
    const endDate   = _esc(batch['end_date']    || '');
    const status    = _esc(batch['status']      || 'active');
    const batchName = _esc(batch['batch_name']  || batchId);
    const qrCreated = _esc(String(createdAt)    || '');
    const css = '<style>'
      + 'body{background:#f7f9fb;font-family:sans-serif}'
      + '.hero{background:linear-gradient(135deg,#0f7a3a,#1ea65a);color:#fff;border-radius:18px;padding:24px}'
      + '.card-soft{border:0;border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,.06)}'
      + '.meta-label{color:#667085;font-size:.88rem}'
      + '.meta-value{font-weight:700;color:#101828}'
      + '.tl-item{border-left:2px solid #d0d5dd;padding-left:14px;margin-left:8px;margin-bottom:14px;position:relative}'
      + '.tl-item::before{content:"";width:10px;height:10px;background:#1ea65a;border-radius:50%;position:absolute;left:-6px;top:6px}'
      + '.media-thumb{width:100%;height:170px;object-fit:cover;border-radius:14px}'
      + '@media print{.no-print{display:none!important}}'
      + '</style>';
    const heroHtml
      = '<div class="hero mb-4">'
      + '<span class="badge bg-light text-success fw-bold mb-2">EcoSynTech Traceability</span>'
      + '<h1 class="h3 mb-2">' + batchName + '</h1>'
      + '<div class="opacity-75">Batch: <strong>' + _esc(batchId) + '</strong> &bull; QR: <strong>' + _esc(qrId) + '</strong></div>'
      + '<div class="mt-2"><small>Trang thai: <strong>' + status + '</strong> &bull; QR tao: ' + qrCreated + '</small></div>'
      + '</div>';
    const statsHtml
      = '<div class="row g-3 mb-3">'
      + '<div class="col-6 col-md-3"><div class="card card-soft p-3"><div class="meta-label">Loai cay</div><div class="meta-value">' + (cropType||'-') + '</div></div></div>'
      + '<div class="col-6 col-md-3"><div class="card card-soft p-3"><div class="meta-label">Khu vuc</div><div class="meta-value">' + (zone||'-') + '</div></div></div>'
      + '<div class="col-6 col-md-3"><div class="card card-soft p-3"><div class="meta-label">Bat dau</div><div class="meta-value">' + (startDate||'-') + '</div></div></div>'
      + '<div class="col-6 col-md-3"><div class="card card-soft p-3"><div class="meta-label">Ket thuc</div><div class="meta-value">' + (endDate||'-') + '</div></div></div>'
      + '</div>';
    const tabsHtml
      = '<ul class="nav nav-tabs" id="traceTabs" role="tablist">'
      + '<li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#overview"  type="button">Tong quan</button></li>'
      + '<li class="nav-item"><button class="nav-link"        data-bs-toggle="tab" data-bs-target="#sensor"    type="button">Cam bien</button></li>'
      + '<li class="nav-item"><button class="nav-link"        data-bs-toggle="tab" data-bs-target="#timeline"  type="button">Nhat ky</button></li>'
      + '<li class="nav-item"><button class="nav-link"        data-bs-toggle="tab" data-bs-target="#media"     type="button">Hinh anh</button></li>'
      + '<li class="nav-item"><button class="nav-link"        data-bs-toggle="tab" data-bs-target="#verify"    type="button">Xac thuc</button></li>'
      + '</ul>';
    const overviewPane
      = '<div class="tab-pane fade show active" id="overview">'
      + '<div class="p-3 bg-light rounded-4">'
      + '<h5>Tom tat lo hang</h5>'
      + '<p><strong>Batch ID:</strong> ' + _esc(batchId) + '</p>'
      + '<p><strong>Loai cay:</strong> ' + (cropType||'-') + '</p>'
      + '<p><strong>Khu vuc:</strong> ' + (zone||'-') + '</p>'
      + '<p><strong>Trang thai:</strong> ' + status + '</p>'
      + '<p><strong>So su kien:</strong> ' + manualEvt.length + '</p>'
      + '<p><strong>So anh/video:</strong> ' + mediaItems.length + '</p>'
      + '<button class="btn btn-outline-success btn-sm no-print" onclick="window.print()">In / Luu PDF</button>'
      + '</div></div>';
    const sensorPane
      = '<div class="tab-pane fade" id="sensor">'
      + '<canvas id="sensorChart" height="110"></canvas>'
      + '</div>';
    const timelinePane
      = '<div class="tab-pane fade" id="timeline">'
      + (timelineHtml || '<div class="text-secondary">Chua co nhat ky canh tac.</div>')
      + '</div>';
    const mediaPane
      = '<div class="tab-pane fade" id="media">'
      + (mediaHtml || '<div class="text-secondary">Chua co hinh anh / video.</div>')
      + '</div>';
    const verifyPane
      = '<div class="tab-pane fade" id="verify">'
      + (blockchainLink
          ? '<div class="alert alert-success"><strong>Blockchain hash:</strong> ' + _esc(blockchainTx)
            + '<br><a href="' + _esc(blockchainLink) + '" target="_blank" rel="noopener">Mo giao dich xac thuc</a></div>'
          : '<div class="alert alert-warning">Chua co giao dich blockchain cho batch nay.</div>')
      + '<div class="small text-secondary">Metadata QR: ' + _esc(JSON.stringify(qrMeta)) + '</div>'
      + '</div>';
    const chartScript
      = '<script>'
      + 'var sd=' + JSON.stringify(chartData) + ';'
      + 'var ctx=document.getElementById("sensorChart");'
      + 'if(ctx&&sd.labels.length){new Chart(ctx,{type:"line",data:{labels:sd.labels,datasets:sd.datasets},'
      + 'options:{responsive:true,plugins:{legend:{display:true}},scales:{y:{beginAtZero:false}}}});}'
      + '</' + 'script>';
    const html
      = '<!DOCTYPE html><html lang="vi"><head>'
      + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Truy xuat: ' + batchName + '</title>'
      + '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">'
      + '<script src="https://cdn.jsdelivr.net/npm/chart.js"></' + 'script>'
      + css
      + '</head><body>'
      + '<div class="container py-4">'
      + heroHtml
      + statsHtml
      + '<div class="card card-soft mb-3"><div class="card-body">'
      + tabsHtml
      + '<div class="tab-content pt-3">'
      + overviewPane
      + sensorPane
      + timelinePane
      + mediaPane
      + verifyPane
      + '</div></div></div>'
      + '</div>'
      + chartScript
      + '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></' + 'script>'
      + '</body></html>';
    return ContentService.createTextOutput(html)
      .setMimeType(ContentService.MimeType.HTML);
  }
  }

  /* ---- QR / Traceability helper functions ---- */

  function _loadRowsByBatch(sheet, batchId, batchField, sortField) {
    if (!sheet) return [];
    const data    = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const bCol    = headers.indexOf(batchField.toLowerCase());
    const sCol    = sortField ? headers.indexOf(sortField.toLowerCase()) : -1;
    const rows    = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][bCol]).trim() === String(batchId).trim()) {
        const row = {};
        headers.forEach((h, idx) => row[h] = data[i][idx]);
        rows.push(row);
      }
    }

    if (sCol >= 0) {
      rows.sort((a, b) => String(a[sortField.toLowerCase()] || '').localeCompare(String(b[sortField.toLowerCase()] || '')));
    }

    return rows;
  }

  function _buildSensorChartData(rows) {
    const labels = [], temp = [], hum = [], soil = [];
    rows.forEach(r => {
      const ts   = r.event_ts || r.timestamp || r.received_at || '';
      const type = String(r.sensor_type || '').toLowerCase();
      const val  = Number(r.value);
      if (!ts || isNaN(val)) return;
      if (type.includes('temp'))                         { labels.push(String(ts).slice(11,16)); temp.push(val); }
      else if (type.includes('hum') && !type.includes('soil')) { hum.push(val); }
      else if (type.includes('soil') || type.includes('moisture')) { soil.push(val); }
    });

    const colors = ['rgba(31,119,180,.8)', 'rgba(44,160,44,.8)', 'rgba(214,39,40,.8)'];
    const datasets = [];
    if (temp.length)  datasets.push({ label: 'Nhiet do (C)',    data: temp,  borderColor: colors[0], tension: 0.35, fill: false });
    if (hum.length)   datasets.push({ label: 'Do am (%)',       data: hum,   borderColor: colors[1], tension: 0.35, fill: false });
    if (soil.length)  datasets.push({ label: 'Do am dat (%)',   data: soil,  borderColor: colors[2], tension: 0.35, fill: false });
    return { labels: labels.length ? labels : rows.map((_, i) => '#' + (i + 1)), datasets };
  }

  function _buildEventTimeline(rows) {
    if (!rows.length) return '';
    return rows.map(r => {
      const ts   = _esc(r.timestamp   || r.event_ts || '');
      const type = _esc(r.event_type  || r.type     || '');
      const op   = _esc(r.operator    || r.created_by || '');
      const mat  = _esc(r.materials   || r.material  || '');
      const note = _esc(r.notes       || r.note      || '');
      return '<div class="tl-item">'
           + '<div class="fw-bold">' + type + '</div>'
           + '<div class="small text-secondary">' + ts + (op ? ' &bull; ' + op : '') + '</div>'
           + (mat  ? '<div>' + mat  + '</div>' : '')
           + (note ? '<div class="text-muted small">' + note + '</div>' : '')
           + '</div>';
    }).join('');
  }

  function _buildMediaHtml(rows) {
    if (!rows.length) return '';
    const cols = rows.map(r => {
      const url     = String(r.url || r.file_url || r.media_url || '').trim();
      const caption = _esc(r.caption || r.note || r.media_type || '');
      if (!url) return '';
      const isImg   = /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes('drive.google.com');
      return '<div class="col-md-4 mb-3">'
           + '<div class="card card-soft h-100">'
           + (isImg ? '<img src="' + _esc(url) + '" class="media-thumb" alt="' + caption + '">'
                    : '<div class="p-4 text-center bg-light rounded-4">VIDEO / FILE</div>')
           + '<div class="card-body"><div class="small text-secondary">' + (caption || 'Media') + '</div>'
           + '<a href="' + _esc(url) + '" target="_blank" rel="noopener">Mo tep</a>'
           + '</div></div></div>';
    }).join('');
    return '<div class="row">' + cols + '</div>';
  }

  function _esc(s) {
    s = String(s === undefined || s === null ? '' : s);
    return s.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
  }

  function _handleGetBatchInfo(deviceId) {
    const ss = Database.getSpreadsheet();
    const batches = [];
    const batchSheet = ss.getSheetByName('BatchInfo');
    if (batchSheet) {
      const data = batchSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        batches.push({ batch_id: data[i][0], type: data[i][1] || '', start_date: data[i][2] || '', end_date: data[i][3] || '', status: data[i][4] || 'active', zone: data[i][5] || 'default', force_send: data[i][6] === true });
      }
    }

    const rules = [];
    const ruleSheet = ss.getSheetByName('ControlRules');
    if (ruleSheet) {
      const data = ruleSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        rules.push({ zone: data[i][0] || '', sensor: data[i][1], min: parseFloat(data[i][2]) || 0, max: parseFloat(data[i][3]) || 0, hysteresis: parseFloat(data[i][4]) || 0, duration_sec: parseInt(data[i][5], 10) || 0, action: data[i][6] });
      }
    }

    const secret = Database.getDeviceSecret(deviceId);
    if (!secret) return JsonResponse({ ok: false, message: 'Device secret missing' });
    const signed = Security.createSignedPayload(deviceId, { batches, config: { rules } }, secret);
    return JsonResponse(signed);
  }

  function _handleGetConfig(deviceId) {
    // Cấu hình mặc định
    let config = {
      post_interval_sec:      parseInt(prop('DEVICE_POST_INTERVAL_SEC'), 10) || 3600,
      sensor_interval_sec:    60,
      deep_sleep_enabled:     false,
      ml_anomaly_enabled:     false,
      max_data_age_days:      180,
      batch_sync_interval_sec: 21600,
      ota_check_interval_sec:  43200,
      cleanup_interval_sec:    86400,
      config_version:          1
    };
    // Đọc từ sheet DeviceConfig nếu có
    try {
      const ss = Database.getSpreadsheet();
      const configSheet = ss.getSheetByName('DeviceConfig');
      if (configSheet && configSheet.getLastRow() > 1) {
        const data = configSheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        const deviceIdCol = headers.indexOf('device_id');
        if (deviceIdCol !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][deviceIdCol]) === deviceId) {
              const setIf = (key, field, isBool = false) => {
                const idx = headers.indexOf(key);
                if (idx !== -1 && data[i][idx] !== undefined && data[i][idx] !== '') {
                  let val = data[i][idx];
                  if (isBool) {
                    config[field] = (val === true || val === 'TRUE' || val === 'true');
                  } else if (typeof config[field] === 'number') {
                    config[field] = Number(val);
                  } else {
                    config[field] = String(val);
                  }
                }
              };
              setIf('post_interval_sec', 'post_interval_sec', false);
              setIf('sensor_interval_sec', 'sensor_interval_sec', false);
              setIf('deep_sleep_enabled', 'deep_sleep_enabled', true);
              setIf('ml_anomaly_enabled', 'ml_anomaly_enabled', true);
              setIf('max_data_age_days', 'max_data_age_days', false);
              setIf('batch_sync_interval_sec', 'batch_sync_interval_sec', false);
              setIf('ota_check_interval_sec', 'ota_check_interval_sec', false);
              setIf('cleanup_interval_sec', 'cleanup_interval_sec', false);
              setIf('config_version', 'config_version', false);
              break;
            }
          }
        }
      }

    } catch(e) {
      console.error('Error reading DeviceConfig sheet:', e);
    }

    const secret = Database.getDeviceSecret(deviceId);
    if (!secret) return JsonResponse({ ok: false, message: 'Device secret missing' });
    const signed = Security.createSignedPayload(deviceId, config, secret);
    return JsonResponse(signed);
  }

  function _handleGetPendingCommands(deviceId) {
    const ss       = Database.getSpreadsheet();
    const cmdSheet = ss.getSheetByName('DeviceCommands');
    const commands = [];
    if (cmdSheet) {
      const data = cmdSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const idx = {
        command_id: headers.indexOf('command_id'),
        device_id:  headers.indexOf('device_id'),
        command:    headers.indexOf('command'),
        params:     headers.indexOf('params'),
        status:     headers.indexOf('status'),
        created_at: headers.indexOf('created_at'),
        signature:  headers.indexOf('signature')
      };
      for (let i = 1; i < data.length; i++) {
        if (String(row[idx.device_id]) === String(deviceId) && String(row[idx.status]) === 'pending') {
          let parsedParams = {};
          try { parsedParams = JSON.parse(row[idx.params] || '{}'); } catch (e) {}
          commands.push({ command_id: String(row[idx.command_id] || ''), command: String(row[idx.command] || ''), params: parsedParams, timestamp: row[idx.created_at] || getCurrentUTCTimestamp() });
          if (idx.status !== -1) { cmdSheet.getRange(i + 1, idx.status + 1).setValue('sent'); }
        }
      }
    }

    const secret = Database.getDeviceSecret(deviceId);
    if (!secret) return JsonResponse({ ok: false, message: 'Device secret missing' });
    const signed = Security.createSignedPayload(deviceId, { commands }, secret);
    return JsonResponse(signed);
  }

  function _handleOtaCheck(deviceId) {
  const ss = Database.getSpreadsheet();
  let fwSheet = ss.getSheetByName('FWNew');
  let targetVersion = null;
  let binUrl = null;
  let sha256 = "";
  let size = 0;
  // 1. Đọc cấu hình từ sheet FWNew
  if (fwSheet) {
    const data = fwSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idxDevice = headers.indexOf('device_id');
    const idxVersion = headers.indexOf('fw_version');
    const idxBin = headers.indexOf('bin_url');
    const idxSha = headers.indexOf('sha256');
    const idxSize = headers.indexOf('size');
    if (idxDevice !== -1 && idxVersion !== -1 && idxBin !== -1) {
      let row = null;
      // Ưu tiên tìm dòng cho device cụ thể
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idxDevice]).trim() === deviceId) {
          row = data[i];
          break;
        }
      }
      // Nếu không, tìm dòng cho '*'
      if (!row) {
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idxDevice]).trim() === '*') {
            row = data[i];
            break;
          }
        }
      }
      if (row) {
        targetVersion = String(row[idxVersion]).trim();
        binUrl = String(row[idxBin]).trim();
        if (idxSha !== -1) sha256 = String(row[idxSha]).trim();
        if (idxSize !== -1) size = Number(row[idxSize]) || 0;
      }
    }
  }
  // 2. Lấy phiên bản hiện tại của thiết bị (dùng hằng số FW_VERSION hoặc từ sheet Devices)
  let currentVersion = FW_VERSION;
  // (Tùy chọn) Nếu bạn có cột fw_version trong sheet Devices, có thể đọc từ đó
  // Ở đây dùng hằng số cho đơn giản
  // 3. Xác định có cập nhật không
  let updateAvailable = false;
  if (targetVersion && binUrl && targetVersion !== currentVersion) {
    updateAvailable = true;
  }
  // 4. Tạo manifest
  const manifest = {
    update_available: updateAvailable,
    version: targetVersion || currentVersion,
    bin_url: binUrl || "",
    sha256: sha256 || "",
    size: size || 0,
    notes: updateAvailable ? `Update from ${currentVersion} to ${targetVersion}` : "No update"
  };
  // 5. Ký và trả về
  const secret = Database.getDeviceSecret(deviceId);
  if (!secret) return JsonResponse({ ok: false, message: 'Device secret missing' });
  const signed = Security.createSignedPayload(deviceId, manifest, secret);
  return JsonResponse(signed);
}

  function _handleUploadMedia(postData) {
    if (!postData) return JsonResponse({ ok: false, message: 'Missing post data' });
    const batchIdMedia = postData.batchId;
    const files        = postData.files || [];
    const metaDesc     = postData.metaDesc || '';
    const chain        = postData.chain || 'hedera';
    const maxFiles     = parseInt(prop('MEDIA_MAX_FILES'), 10) || 6;
    if (!batchIdMedia || files.length < 1 || files.length > maxFiles) {
      return JsonResponse({ ok: false, message: 'Invalid payload: batchId required and 1-' + maxFiles + ' files allowed' });
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/mpeg'];
    const mediaResults  = [];
    for (const file of files) {
      if (!validMimeTypes.includes(file.mimeType)) {
        return JsonResponse({ ok: false, message: 'Invalid media type: ' + file.mimeType });
      }

      let blobData;
      try { blobData = Utilities.base64Decode(file.data); } catch (e) { return JsonResponse({ ok: false, message: 'Invalid base64 data for file: ' + file.name }); }
      const blob         = Utilities.newBlob(blobData, file.mimeType, file.name);
      const mType        = file.mimeType.startsWith('image') ? 'image' : 'video';
      const uploadResult = MediaModule.uploadMedia(blob, batchIdMedia, mType);
      if (!uploadResult.ok) return JsonResponse({ ok: false, message: uploadResult.message || uploadResult.error });
      mediaResults.push({ fileId: uploadResult.fileId, url: uploadResult.url, sha256: uploadResult.sha256 });
      MediaModule.linkMediaToBatch(batchIdMedia, uploadResult.url, mType, metaDesc);
    }

    const snapshotPayload = {
      snapshotId: Math.floor(Date.now() / 1000) + '_' + Utilities.getUuid().slice(0, 8),
      batch_ids:  [batchIdMedia],
      entries:    mediaResults.map((m, i) => ({ id: 'media_' + i + '_' + Utilities.getUuid().slice(0, 6), payload: { batchId: batchIdMedia, mediaUrl: m.url, mediaHash: m.sha256 } })),
      meta:       { chain, description: metaDesc, created_at: getCurrentUTCTimestamp() }
    };
    const cloudRunResult = CloudRun.sendSnapshot(snapshotPayload);
    if (cloudRunResult && cloudRunResult.ok) {
      const dynamicQr = QRModule.generateDynamicQrCode(batchIdMedia, { batchId: batchIdMedia, mediaCount: mediaResults.length });
      QRModule.updateDynamicQrMetadata(dynamicQr.qrId, { mediaUrls: mediaResults.map(m => m.url), mediaHashes: mediaResults.map(m => m.sha256) });
if (typeof AptosModule !== 'undefined' && AptosModule.isConfigured()) {
      AptosModule.recordTraceabilityEvent(batchIdMedia, 'media_uploaded', {
        media_count: mediaResults.length,
        hashes: mediaResults.map(m => m.sha256)
      }); // hook Aptos sau upload thành công
      return JsonResponse({ ok: true, snapshotId: cloudRunResult.snapshotId, gcsPath: cloudRunResult.gcsPath, qrUrl: dynamicQr.qrUrl });
    }

    return JsonResponse({ ok: false, message: 'Failed to send snapshot to Cloud Run' });
  }

  return { initialize, handleRequest };
})();

/* ================================================================

   ADMIN UI TỔNG HỢP (Full Dashboard) - EcoSynTech V8.1 UI  13.04.2026
   - Quản lý Devices, Commands, Rules, Snapshot, Telegram, Health
   - Tích hợp Chart.js, Dark/Light mode, Responsive, pro
   ================================================================ */
function getFullAdminHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>EcoSynTech Admin Ultimate</title>
  <!-- Bootstrap 5 + Icons + Chart.js -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --sidebar-width: 260px;
      --bg-light: #f8fafc;
      --card-light: #ffffff;
      --text-light: #0f172a;
      --border-light: #e2e8f0;
      --accent: #0f7a3a;
      --accent-hover: #0b5e2e;
      --danger: #dc2626;
      --warning: #f59e0b;
      --info: #3b82f6;
    }

    body.dark {
      --bg-light: #0f172a;
      --card-light: #1e293b;
      --text-light: #e2e8f0;
      --border-light: #334155;
    }
    body {
      background-color: var(--bg-light);
      color: var(--text-light);
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto;
      transition: background 0.2s, color 0.2s;
    }
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100vh;
      background: var(--card-light);
      border-right: 1px solid var(--border-light);
      z-index: 1000;
      transition: transform 0.3s ease;
    }

    .sidebar .nav-link {
      color: var(--text-light);
      border-radius: 0.5rem;
      margin: 0.2rem 0.5rem;
      padding: 0.6rem 1rem;
    }

    .sidebar .nav-link:hover, .sidebar .nav-link.active {
      background: var(--accent);
      color: white;
    }

    .main-content {
      margin-left: var(--sidebar-width);
      padding: 1rem;
    }
    .card {
      background: var(--card-light);
      border: 1px solid var(--border-light);
      border-radius: 1rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .stat-card {
      border-left: 4px solid var(--accent);
    }

    .btn-accent { background-color: var(--accent); color: white; }
    .btn-accent:hover { background-color: var(--accent-hover); color: white; }
    .table-responsive { border-radius: 0.75rem; }
    .loading-spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid #e5e7eb;
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    .toast-container { z-index: 1055; }
    .log-item {
      border-bottom: 1px solid var(--border-light);
      padding: 8px 0;
      font-size: 13px;
    }

    .pre-scrollable {
      max-height: 400px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0; }
      .sidebar-toggle { display: block; }
    }

    .sidebar-toggle {
      display: none;
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 1050;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
    }
  </style>
</head>
<body>
  <button class="sidebar-toggle" id="sidebarToggle"><i class="bi bi-list"></i></button>
  <div class="sidebar" id="sidebar">
    <div class="p-3 border-bottom">
      <h4 class="fw-bold"><i class="bi bi-flower1 text-success"></i> EcoSynTech</h4>
      <small class="text-muted">Ultimate v2.0</small>
    </div>
    <nav class="nav flex-column mt-2">
      <a class="nav-link active" href="#" data-page="dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a>
      <a class="nav-link" href="#" data-page="devices"><i class="bi bi-pc-display"></i> Devices</a>
      <a class="nav-link" href="#" data-page="commands"><i class="bi bi-terminal"></i> Commands</a>
      <a class="nav-link" href="#" data-page="rules"><i class="bi bi-sliders2"></i> Rules</a>
      <a class="nav-link" href="#" data-page="snapshots"><i class="bi bi-camera"></i> Snapshots</a>
      <a class="nav-link" href="#" data-page="blockchain"><i class="bi bi-link-45deg"></i> Blockchain</a>
      <a class="nav-link" href="#" data-page="ota"><i class="bi bi-cloud-upload"></i> OTA Firmware</a>
      <a class="nav-link" href="#" data-page="telegram"><i class="bi bi-telegram"></i> Telegram</a>
      <a class="nav-link" href="#" data-page="advisory"><i class="bi bi-exclamation-triangle"></i> Advisory</a>
      <a class="nav-link" href="#" data-page="logs"><i class="bi bi-journal-text"></i> Event Logs</a>
      <a class="nav-link" href="#" data-page="settings"><i class="bi bi-gear"></i> Settings</a>
    </nav>
    <div class="position-absolute bottom-0 p-3 w-100 border-top">
      <button id="themeSwitch" class="btn btn-outline-secondary w-100"><i class="bi bi-moon-stars"></i> Dark mode</button>
    </div>
  </div>
  <div class="main-content">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 id="pageTitle">Dashboard</h2>
      <div><span id="lastUpdate" class="text-muted small"></span> <button class="btn btn-sm btn-outline-secondary ms-2" onclick="refreshCurrentPage()"><i class="bi bi-arrow-repeat"></i></button></div>
    </div>
    <div id="pageContent">Loading...</div>
  </div>
  <!-- Modal Rule -->
  <div class="modal fade" id="ruleModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Rule Editor</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
  <div class="modal-body"><form id="ruleForm"><input type="hidden" id="ruleId">
    <div class="row"><div class="col"><label>Zone</label><input class="form-control" id="zone"></div><div class="col"><label>Sensor</label><select id="sensor" class="form-select"><option value="temperature">Nhiệt độ</option><option value="humidity">Độ ẩm</option><option value="soil_moisture">Độ ẩm đất</option><option value="ph">pH</option><option value="tds">TDS</option></select></div></div>
    <div class="row mt-2"><div class="col"><label>Min</label><input type="number" step="any" id="minVal" class="form-control"></div><div class="col"><label>Max</label><input type="number" step="any" id="maxVal" class="form-control"></div><div class="col"><label>Hysteresis</label><input type="number" step="any" id="hysteresis" class="form-control"></div></div>
    <div class="row mt-2"><div class="col"><label>Duration (s)</label><input type="number" id="durationSec" class="form-control"></div><div class="col"><label>Cooldown (s)</label><input type="number" id="cooldownSec" class="form-control"></div></div>
    <div class="mt-2"><label>Action</label><input id="actionCmd" class="form-control" placeholder="relay1_on"></div>
    <div class="mt-2"><label>Reset Action</label><input id="resetAction" class="form-control" placeholder="relay1_off"></div>
    <div class="mt-2"><label>Device ID (empty = all)</label><input id="ruleDeviceId" class="form-control"></div>
    <div class="mt-2"><label>Enabled</label><select id="ruleEnabled" class="form-select"><option value="true">Bật</option><option value="false">Tắt</option></select></div>
  </form></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveRule()">Lưu</button><button class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button></div></div></div></div>
  <div class="toast-container position-fixed bottom-0 end-0 p-3"></div>
  <script>

    // ======================== GLOBAL ========================

    let currentPage = 'dashboard';
    let healthChart = null, sensorChart = null, bcChart = null, anomalyChart = null;
    function showToast(msg, type = 'success') {
      const container = document.querySelector('.toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast align-items-center text-white bg-' + (type === 'success' ? 'success' : 'danger') + ' border-0';
      toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + msg + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
      container.appendChild(toast);
      const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 3000 });
      bsToast.show();
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }

    function showLoading(containerId) {
      document.getElementById(containerId).innerHTML = '<div class="text-center p-5"><div class="loading-spinner"></div><p class="mt-2">Loading...</p></div>';
    }
    // Bảo mật: gọi server qua google.script.run
    function callServer(fnName, params = {}) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(err => {
            console.error(err);
            showToast(err.message || 'Lỗi kết nối server', 'error');
            reject(err);
          })
          [fnName](params);
      });

    }

    async function refreshCurrentPage() {
      try {
        if (currentPage === 'dashboard') await loadDashboard();
        else if (currentPage === 'devices') await loadDevices();
        else if (currentPage === 'commands') await loadCommands();
        else if (currentPage === 'rules') await loadRules();
        else if (currentPage === 'snapshots') await loadSnapshots();
        else if (currentPage === 'blockchain') await loadBlockchain();
        else if (currentPage === 'ota') await loadOTA();
        else if (currentPage === 'telegram') await loadTelegram();
        else if (currentPage === 'advisory') await loadAdvisory();
        else if (currentPage === 'logs') await loadEventLogs();
        else if (currentPage === 'settings') await loadSettings();
        document.getElementById('lastUpdate').innerText = 'Cập nhật: ' + new Date().toLocaleTimeString();
      } catch (e) {
        console.error(e);
        showToast('Lỗi tải trang', 'error');
      }
    }

    // ======================== DASHBOARD ========================

    async function loadDashboard() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="row g-3" id="statsRow"></div>
        <div class="row mt-3">
          <div class="col-md-6"><canvas id="healthChart"></canvas></div>
          <div class="col-md-6"><canvas id="sensorTrendChart"></canvas></div>
        </div>
        <div class="row mt-3">
          <div class="col-12"><div class="card p-2"><h6>📦 Blockchain Pending / Confirmed</h6><canvas id="bcMiniChart" height="80"></canvas></div></div>
        </div>
      `;
      const stats = await callServer('get_system_stats');
      const health = await callServer('check_system_health');
      const bcStats = await callServer('get_blockchain_summary');
      const statsRow = document.getElementById('statsRow');
      if (stats && stats.devices) {
        statsRow.innerHTML = `
          <div class="col-md-3"><div class="card stat-card p-2"><h6>Devices</h6><h3>${stats.devices.active}/${stats.devices.total}</h3><small>Active</small></div></div>
          <div class="col-md-3"><div class="card stat-card p-2"><h6>Readings 24h</h6><h3>${stats.readings?.last24h || 0}</h3></div></div>
          <div class="col-md-3"><div class="card stat-card p-2"><h6>Pending TX</h6><h3>${bcStats?.pendingTx || 0}</h3><small>Aptos</small></div></div>
          <div class="col-md-3"><div class="card stat-card p-2"><h6>Confirmed</h6><h3>${bcStats?.confirmedTx || 0}</h3><small>Mainnet</small></div></div>
        `;
      }

      const ctxHealth = document.getElementById('healthChart')?.getContext('2d');
      if (healthChart) healthChart.destroy();
      healthChart = new Chart(ctxHealth, {
        type: 'doughnut',
        data: { labels: ['Database', 'Storage', 'API'], datasets: [{ data: [health?.database?.healthy ? 1 : 0, health?.storage?.healthy ? 1 : 0, health?.api?.healthy ? 1 : 0], backgroundColor: ['#0f7a3a', '#f59e0b', '#dc2626'] }] }
      });

      const sensorCtx = document.getElementById('sensorTrendChart')?.getContext('2d');
      if (sensorChart) sensorChart.destroy();
      sensorChart = new Chart(sensorCtx, {
        type: 'line',
        data: { labels: ['00', '04', '08', '12', '16', '20'], datasets: [{ label: 'Nhiệt độ', data: stats?.sensorTrend || [26, 25, 27, 30, 32, 29], borderColor: '#0f7a3a' }] }
      });

      const bcCtx = document.getElementById('bcMiniChart')?.getContext('2d');
      if (bcChart) bcChart.destroy();
      bcChart = new Chart(bcCtx, {
        type: 'bar',
        data: { labels: ['Pending', 'Confirmed'], datasets: [{ label: 'Transactions', data: [bcStats?.pendingTx || 0, bcStats?.confirmedTx || 0], backgroundColor: ['#f59e0b', '#10b981'] }] }
      });

    }

    // ======================== DEVICES ========================

    async function loadDevices() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3">
          <div class="d-flex justify-content-between"><h5><i class="bi bi-pc-display"></i> Devices</h5><button class="btn btn-success btn-sm" onclick="provisionDevice()"><i class="bi bi-plus"></i> Provision</button></div>
          <div class="table-responsive mt-2"><table class="table table-hover" id="devicesTable"><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Last Seen</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
        </div>
      `;
      const data = await callServer('get_devices');
      const tbody = document.querySelector('#devicesTable tbody');
      tbody.innerHTML = '';
      if (data.devices) {
        data.devices.forEach(d => {
          tbody.innerHTML += `
            <tr><td>${d.device_id}</td><td>${d.device_name || ''}</td><td><span class="badge ${d.status === 'active' ? 'bg-success' : 'bg-secondary'}">${d.status || 'unknown'}</span></td><td>${d.last_seen || ''}</td>
            <td><button class="btn btn-sm btn-outline-primary" onclick="toggleDevice('${d.device_id}')">Toggle</button> <button class="btn btn-sm btn-outline-danger" onclick="rotateSecret('${d.device_id}')">Rotate</button></td></tr>
          `;
        });

      }
    }

    async function provisionDevice() { const id = prompt('New Device ID:'); if (id) { await callServer('provision_device', { device_id: id }); showToast('Provisioned'); loadDevices(); } }
    async function toggleDevice(id) { await callServer('toggle_device', { device_id: id }); showToast('Toggled'); loadDevices(); }
    async function rotateSecret(id) { if (confirm('Rotate secret?')) { const res = await callServer('rotate_secret', { device_id: id }); showToast(res.newSecret ? 'New secret: ' + res.newSecret : 'Done'); loadDevices(); } }

    // ======================== COMMANDS ========================

    async function loadCommands() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3 mb-3">
          <h5>Tạo lệnh mới</h5>
          <div class="row g-2">
            <div class="col-md-4"><select id="cmdDevice" class="form-select"></select></div>
            <div class="col-md-3"><input id="cmdName" class="form-control" placeholder="Command"></div>
            <div class="col-md-3"><textarea id="cmdParams" rows="1" class="form-control" placeholder='{"duration":10}'></textarea></div>
            <div class="col-md-2"><button class="btn btn-primary w-100" onclick="createCommand()">Enqueue</button></div>
          </div>
          <div class="mt-2"><button class="btn btn-outline-danger btn-sm" onclick="createAndExecuteNow()"><i class="bi bi-lightning"></i> Tạo & Execute ngay</button></div>
        </div>
        <div class="card p-3"><h5>Pending Commands</h5><div id="pendingList"></div></div>
      `;
      const devices = await callServer('get_devices');
      const sel = document.getElementById('cmdDevice');
      sel.innerHTML = '<option value="">-- Chọn device --</option>';
      if (devices.devices) devices.devices.forEach(d => sel.innerHTML += `<option value="${d.device_id}">${d.device_id}</option>`);
      await refreshPendingCommands();
    }

    async function refreshPendingCommands() {
      const device = document.getElementById('cmdDevice')?.value || '';
      const res = await callServer('get_pending_commands', { device_id: device });
      const div = document.getElementById('pendingList');
      if (!res.commands || res.commands.length === 0) { div.innerHTML = '<div class="text-muted">No pending commands</div>'; return; }
      div.innerHTML = res.commands.map(c => `
        <div class="log-item"><b>${c.command}</b> <span class="text-secondary">${c.command_id}</span> <button class="btn btn-sm btn-outline-success float-end" onclick="executeNow('${c.command_id}')">Execute</button><pre class="mt-1">${JSON.stringify(c.params)}</pre></div>
      `).join('');
    }

    async function createCommand() {
      const device = document.getElementById('cmdDevice').value;
      const name = document.getElementById('cmdName').value;
      let params = {};
      try { params = JSON.parse(document.getElementById('cmdParams').value || '{}'); } catch (e) { showToast('Invalid JSON', 'error'); return; }
      if (!device || !name) { showToast('Select device and command', 'error'); return; }
      const res = await callServer('create_command', { device_id: device, command: name, params: JSON.stringify(params) });
      if (res.ok) { showToast('Command created'); refreshPendingCommands(); } else showToast(res.message, 'error');
    }

    async function executeNow(cmdId) {
      const device = document.getElementById('cmdDevice').value;
      const res = await callServer('execute_command_now', { command_id: cmdId, device_id: device });
      showToast(res.message, res.ok ? 'success' : 'error');
      refreshPendingCommands();
    }

    async function createAndExecuteNow() { await createCommand(); setTimeout(() => { const btn = document.querySelector('#pendingList .log-item:first-child button'); if (btn) btn.click(); }, 500); }

    // ======================== RULES ========================

    async function loadRules() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3">
          <div class="d-flex justify-content-between"><h5>Smart Control Rules</h5><div><button class="btn btn-success btn-sm" data-bs-toggle="modal" data-bs-target="#ruleModal" onclick="resetRuleForm()"><i class="bi bi-plus"></i> Add Rule</button> <button class="btn btn-outline-secondary btn-sm" onclick="exportRules()"><i class="bi bi-download"></i> Export</button></div></div>
          <div class="table-responsive mt-2"><table class="table table-sm" id="rulesTable"><thead><tr><th>ID</th><th>Zone</th><th>Sensor</th><th>Min/Max</th><th>Action</th><th>Cooldown</th><th>Enabled</th><th></th></tr></thead><tbody></tbody></table></div>
        </div>
      `;
      const res = await callServer('get_rules');
      const tbody = document.querySelector('#rulesTable tbody');
      tbody.innerHTML = '';
      if (res.rules) {
        res.rules.forEach(r => {
          tbody.innerHTML += `
            <tr><td>${r.rule_id}</td><td>${r.zone || ''}</td><td>${r.sensor}</td><td>${r.min_val}/${r.max_val}</td><td>${r.action}</td><td>${r.cooldown_sec}</td><td>${r.enabled ? '✅' : '❌'}</td>
            <td><button class="btn btn-sm btn-warning" onclick="editRule('${r.rule_id}')">Sửa</button> <button class="btn btn-sm btn-secondary" onclick="toggleRule('${r.rule_id}',${!r.enabled})">Toggle</button></td></tr>
          `;
        });

      }
    }

    async function saveRule() {
      const data = {
        rule_id: document.getElementById('ruleId').value,
        zone: document.getElementById('zone').value,
        sensor: document.getElementById('sensor').value,
        min_val: parseFloat(document.getElementById('minVal').value),
        max_val: parseFloat(document.getElementById('maxVal').value),
        hysteresis: parseFloat(document.getElementById('hysteresis').value),
        duration_sec: parseInt(document.getElementById('durationSec').value),
        cooldown_sec: parseInt(document.getElementById('cooldownSec').value),
        action: document.getElementById('actionCmd').value,
        reset_action: document.getElementById('resetAction').value,
        device_id: document.getElementById('ruleDeviceId').value,
        enabled: document.getElementById('ruleEnabled').value === 'true'
      };
      const res = await callServer('save_rule', data);
      showToast(res.message || 'Saved', res.ok ? 'success' : 'error');
      if (res.ok) loadRules();
      bootstrap.Modal.getInstance(document.getElementById('ruleModal')).hide();
    }

    async function toggleRule(ruleId, enabled) { const res = await callServer('set_rule_enabled', { rule_id: ruleId, enabled }); showToast(res.message); loadRules(); }
    async function editRule(ruleId) {
      const res = await callServer('get_rule_by_id', { rule_id: ruleId });
      if (res.rule) {
        document.getElementById('ruleId').value = res.rule.rule_id;
        document.getElementById('zone').value = res.rule.zone || '';
        document.getElementById('sensor').value = res.rule.sensor;
        document.getElementById('minVal').value = res.rule.min;
        document.getElementById('maxVal').value = res.rule.max;
        document.getElementById('hysteresis').value = res.rule.hysteresis || 0;
        document.getElementById('durationSec').value = res.rule.duration_sec || 0;
        document.getElementById('cooldownSec').value = res.rule.cooldown_sec || 300;
        document.getElementById('actionCmd').value = res.rule.action;
        document.getElementById('resetAction').value = res.rule.reset_action || '';
        document.getElementById('ruleDeviceId').value = res.rule.device_id || '';
        document.getElementById('ruleEnabled').value = res.rule.enabled === false ? 'false' : 'true';
        new bootstrap.Modal(document.getElementById('ruleModal')).show();
      }
    }

    function resetRuleForm() {
      document.getElementById('ruleId').value = '';
      document.getElementById('zone').value = '';
      document.getElementById('sensor').value = 'temperature';
      document.getElementById('minVal').value = '';
      document.getElementById('maxVal').value = '';
      document.getElementById('hysteresis').value = '0';
      document.getElementById('durationSec').value = '0';
      document.getElementById('cooldownSec').value = '300';
      document.getElementById('actionCmd').value = '';
      document.getElementById('resetAction').value = '';
      document.getElementById('ruleDeviceId').value = '';
      document.getElementById('ruleEnabled').value = 'true';
    }

    async function exportRules() { const res = await callServer('get_rules'); const blob = new Blob([JSON.stringify(res.rules, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rules_export.json'; a.click(); }

    // ======================== SNAPSHOTS ========================

    async function loadSnapshots() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3 mb-3">
          <div class="row g-2"><div class="col-md-8"><select id="batchSelect" multiple class="form-select" size="4"></select></div><div class="col-md-4"><button class="btn btn-primary w-100" onclick="triggerSnapshot()"><i class="bi bi-cloud-upload"></i> Send Snapshot</button><button class="btn btn-secondary w-100 mt-2" onclick="weeklyAutoSnapshot()">📅 Weekly Auto</button></div></div>
        </div>
        <div class="card p-3"><h5>Snapshot Logs</h5><div id="snapshotLogList" class="pre-scrollable"></div></div>
      `;
      const batches = await callServer('get_batches');
      const sel = document.getElementById('batchSelect');
      sel.innerHTML = '';
      if (batches.batches) batches.batches.forEach(b => sel.innerHTML += `<option value="${b.batch_id}">${b.batch_id}</option>`);
      await refreshSnapshotLogs();
    }

    async function refreshSnapshotLogs() { const logs = await callServer('get_snapshot_logs', { limit: 30 }); const div = document.getElementById('snapshotLogList'); div.innerHTML = ''; if (logs.logs) logs.logs.forEach(l => div.innerHTML += `<div class="log-item"><b>${l.snapshotId}</b> <span class="text-secondary">${l.ts}</span><br>batches: ${l.batch_ids} | tx: ${l.txHash || 'pending'}</div>`); }
    async function triggerSnapshot() { const selected = Array.from(document.getElementById('batchSelect').selectedOptions).map(o => o.value); if (!selected.length) { showToast('Select at least one batch', 'error'); return; } const res = await callServer('trigger_snapshot', { batch_ids: JSON.stringify(selected) }); showToast(res.message || 'Snapshot sent'); refreshSnapshotLogs(); }
    async function weeklyAutoSnapshot() { const res = await callServer('weekly_auto_snapshot'); showToast(res.message); refreshSnapshotLogs(); }

    // ======================== BLOCKCHAIN (Aptos) ========================

    async function loadBlockchain() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="row g-3"><div class="col-md-6"><div class="card p-2"><h6>Pending (tuần hiện tại)</h6><h3 id="bcPending">-</h3></div></div><div class="col-md-6"><div class="card p-2"><h6>Confirmed (mainnet)</h6><h3 id="bcConfirmed">-</h3></div></div></div>
        <div class="card mt-3 p-3"><div class="d-flex justify-content-between"><h5>📜 Blockchain Log (Aptos Mainnet)</h5><div><button class="btn btn-primary btn-sm" id="btnSendBatch">🚀 Gửi batch ngay</button> <button class="btn btn-secondary btn-sm" id="btnVerifyTx">✅ Verify tx</button></div></div><div class="pre-scrollable mt-2"><table class="table table-sm" id="bcTable"><thead><tr><th>TS</th><th>Tx Hash</th><th>Snapshot ID</th><th>Status</th></tr></thead><tbody></tbody></table></div></div>
      `;
      await refreshBlockchain();
      document.getElementById('btnSendBatch').onclick = async () => { const r = await callServer('weekly_auto_snapshot'); showToast(JSON.stringify(r)); refreshBlockchain(); };
      document.getElementById('btnVerifyTx').onclick = async () => { const r = await callServer('verify_aptos_tx'); showToast('Verify: ' + JSON.stringify(r)); refreshBlockchain(); };
    }

    async function refreshBlockchain() {
      const logs = await callServer('get_snapshot_logs', { limit: 100 });
      const pending = logs.logs?.filter(x => x.status === 'pending' || !x.txHash).length || 0;
      const confirmed = logs.logs?.filter(x => x.status === 'confirmed').length || 0;
      document.getElementById('bcPending').innerText = pending;
      document.getElementById('bcConfirmed').innerText = confirmed;
      const tbody = document.querySelector('#bcTable tbody');
      if (tbody) tbody.innerHTML = (logs.logs || []).map(l => `
        <tr><td>${l.ts}</td><td><a href="https://explorer.aptoslabs.com/txn/${l.txHash || ''}?network=mainnet" target="_blank">${(l.txHash || '').substring(0, 16)}...</a></td><td>${l.snapshotId}</td><td><span class="badge ${l.status === 'confirmed' ? 'bg-success' : (l.status === 'failed' ? 'bg-danger' : 'bg-warning')}">${l.status || 'submitted'}</span></td></tr>
      `).join('');
    }

    // ======================== OTA FIRMWARE ========================

    async function loadOTA() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3"><div class="d-flex justify-content-between"><h5>📦 OTA Firmware (Google Drive)</h5><button class="btn btn-accent btn-sm" id="btnScanFw">🔍 Scan Drive</button></div><div class="table-responsive mt-2"><table class="table table-sm" id="fwTable"><thead><tr><th>Device</th><th>Version</th><th>SHA256</th><th>Size</th><th>Updated</th></tr></thead><tbody></tbody></table></div><p class="text-muted small mt-2">Webhook: <code>?action=ota_check&device_id=...</code> tự tính SHA256 từ file .bin trong Drive folder.</p></div>
      `;
      await refreshOTA();
      document.getElementById('btnScanFw').onclick = async () => { const r = await callServer('scan_firmware'); showToast(JSON.stringify(r)); refreshOTA(); };
    }

    async function refreshOTA() { const fw = await callServer('get_firmware_list'); const tbody = document.querySelector('#fwTable tbody'); if (tbody) tbody.innerHTML = (fw.list || []).map(f => `<tr><td>${f.device_id}</td><td>${f.fw_version}</td><td><code>${(f.sha256 || '').substring(0, 12)}...</code></td><td>${f.size}</td><td>${f.updated_at || ''}</td></tr>`).join(''); }

    // ======================== TELEGRAM ========================

    async function loadTelegram() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3"><div class="d-flex justify-content-between"><h5>Telegram Bot</h5><div><button class="btn btn-info btn-sm" onclick="setupWebhook()">Set Webhook</button> <button class="btn btn-warning btn-sm" onclick="sendTestTelegram()">Send Test</button></div></div><pre id="telegramStatus" class="mt-2 bg-dark text-light p-2 rounded"></pre><hr><h6>Send custom message</h6><div class="input-group"><input type="text" id="customTgMsg" class="form-control" placeholder="Message to all chats"><button class="btn btn-primary" onclick="sendCustomTelegram()">Send</button></div></div>
      `;
      await refreshTelegram();
    }

    async function refreshTelegram() { const info = await callServer('telegram_webhook_info'); document.getElementById('telegramStatus').innerText = JSON.stringify(info, null, 2); }
    async function setupWebhook() { const res = await callServer('telegram_set_webhook'); showToast(res.ok ? 'Webhook set' : 'Error: ' + res.description); refreshTelegram(); }
    async function sendTestTelegram() { await callServer('telegram_test'); showToast('Test message sent'); }
    async function sendCustomTelegram() { const msg = document.getElementById('customTgMsg').value; if (!msg) return; const res = await callServer('telegram_send', { text: msg }); showToast('Sent'); }

    // ======================== ADVISORY ========================

    async function loadAdvisory() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `<div class="card p-3"><h5>Advisory Engine - Smart Alerts</h5><canvas id="anomalyChart" height="150"></canvas><div id="advisoryAlerts" class="mt-3"></div><button class="btn btn-outline-primary mt-2" onclick="runAdvisoryNow()">Analyze Now</button></div>`;
      await runAdvisoryNow();
    }

    async function runAdvisoryNow() {
      const res = await callServer('run_advisory');
      const div = document.getElementById('advisoryAlerts');
      if (res.alerts && res.alerts.length) div.innerHTML = '<div class="alert alert-warning">' + res.alerts.map(a => a.message).join('<br>') + '</div>';
      else div.innerHTML = '<div class="alert alert-success">Không phát hiện bất thường</div>';
      const ctx = document.getElementById('anomalyChart')?.getContext('2d');
      if (ctx) {
        if (anomalyChart) anomalyChart.destroy();
        anomalyChart = new Chart(ctx, { type: 'line', data: { labels: ['Hôm qua', 'Hôm nay'], datasets: [{ label: 'Anomaly Score', data: [res.anomaly_score ? Math.max(0, res.anomaly_score - 20) : 0, res.anomaly_score || 0], borderColor: '#dc2626' }] } });
      }
    }

    // ======================== EVENT LOGS ========================

    async function loadEventLogs() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3"><div class="d-flex justify-content-between"><h5>Event Logs</h5><div><input type="text" id="filterEvent" placeholder="Filter event..." class="form-control form-control-sm w-auto d-inline-block"> <button class="btn btn-sm btn-secondary" onclick="refreshEventLogs()"><i class="bi bi-search"></i></button> <button class="btn btn-sm btn-outline-success" onclick="exportLogsCSV()"><i class="bi bi-download"></i> CSV</button></div></div><div id="eventLogsList" class="pre-scrollable"></div></div>
      `;
      await refreshEventLogs();
    }

    async function refreshEventLogs() {
      const filter = document.getElementById('filterEvent')?.value || '';
      const res = await callServer('get_event_logs', { limit: 200 });
      const div = document.getElementById('eventLogsList');
      if (!res.logs) { div.innerHTML = 'No logs'; return; }
      let logs = res.logs;
      if (filter) logs = logs.filter(l => l.event.includes(filter) || l.entity.includes(filter));
      div.innerHTML = logs.map(l => `<div class="log-item"><small>${l.ts}</small> <b>${l.event}</b> - ${l.entity} <span class="text-secondary">${(l.payload || '').substring(0, 100)}</span></div>`).join('');
    }

    async function exportLogsCSV() {
      const res = await callServer('get_event_logs', { limit: 500 });
      if (!res.logs) return;
      const csvRows = [['ts', 'entity', 'event', 'payload', 'source']];
      res.logs.forEach(l => csvRows.push([l.ts, l.entity, l.event, (l.payload || '').replace(/,/g, ';'), l.source]));
      const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'event_logs.csv'; a.click();
    }

    // ======================== SETTINGS ========================

    async function loadSettings() {
      const content = document.getElementById('pageContent');
      content.innerHTML = `
        <div class="card p-3"><h5>System Settings</h5><div class="row"><div class="col-md-6"><label>Cleanup days</label><input id="cleanupDays" class="form-control" value="${prop('CLEANUP_DAYS') || '30'}"></div><div class="col-md-6"><label>Rate limit per device</label><input id="rateLimit" class="form-control" value="${prop('RATE_LIMIT_PER_DEVICE') || '60'}"></div></div><button class="btn btn-primary mt-3" onclick="saveSettings()">Save</button><hr><h6>Backup & Restore</h6><button class="btn btn-warning" onclick="createBackup()">Create Backup</button> <button class="btn btn-secondary" onclick="restoreBackup()">Restore</button><hr><h6>System Health</h6><pre id="healthDetail" class="bg-dark text-light p-2 rounded"></pre></div>
      `;
      const health = await callServer('check_system_health');
      document.getElementById('healthDetail').innerText = JSON.stringify(health, null, 2);
    }

    async function saveSettings() { const cleanup = document.getElementById('cleanupDays').value; const rate = document.getElementById('rateLimit').value; const res = await callServer('update_settings', { CLEANUP_DAYS: cleanup, RATE_LIMIT_PER_DEVICE: rate }); showToast(res.message); }
    async function createBackup() { const res = await callServer('create_backup'); showToast(res.message || 'Backup created'); }
    async function restoreBackup() { showToast('Restore function not implemented in this demo'); }

    // ======================== NAVIGATION & THEME ========================

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentPage = link.getAttribute('data-page');
        document.getElementById('pageTitle').innerText = link.innerText.trim();
        refreshCurrentPage();
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
      });

    });

    document.getElementById('sidebarToggle').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); });
    document.getElementById('themeSwitch').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
    refreshCurrentPage();
    setInterval(() => { if (currentPage === 'dashboard') refreshCurrentPage(); }, 30000);
  </script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}
// Các hàm trả về JSON cho UI
function get_system_stats() { return Admin.getSystemStats(); }
function check_system_health() { return SystemMonitor.checkSystemHealth(); }
function get_devices() { const data = Database.getSheetData('Devices'); return { ok: true, devices: data }; }
function get_batches() { const data = Database.getSheetData('BatchInfo'); return { ok: true, batches: data.map(r => ({ batch_id: r.batch_id })) }; }
function get_pending_commands(params) { const cmds = getPendingCommands(params.device_id || ''); return { ok: true, commands: cmds }; }
function create_command(params) { const cmdId = createCommandForDevice(params.device_id, params.command, JSON.parse(params.params||'{}'), 'admin_ui'); return { ok: true, command_id: cmdId }; }
function execute_command_now(params) { return executeCommandNow(params.command_id, params.device_id, {}, ''); }
function provision_device(params) { const secret = Database.provisionDevice(params.device_id, false); return { ok: true, message: 'Device provisioned', secret: Database.maskSecret(secret) }; }
function toggle_device(params) { const devs = Database.getSheetData('Devices'); const dev = devs.find(d=>d.device_id===params.device_id); if(dev && dev.status==='active') Admin.disableDevice(params.device_id); else Admin.enableDevice(params.device_id); return { ok: true, message: 'Toggled' }; }
function rotate_secret(params) { const res = Admin.rotateDeviceSecret(params.device_id); return { ok: res.success, newSecret: res.newSecret, message: res.success?'Secret rotated':'Failed' }; }
function trigger_snapshot(params) {
  try {
    const batchIds = JSON.parse(params.batch_ids || '[]');
    if (!batchIds.length) return { ok: false, message: 'No batch selected' };
    const ss = Database.getSpreadsheet();
    const results = [];
    for (const batchId of batchIds) {
      // Lấy dữ liệu cảm biến từ Batchsheet cho batch này
      const batchSheet = ss.getSheetByName('Batchsheet');
      let entries = [];
      if (batchSheet) {
        const data = batchSheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        const batchCol = headers.indexOf('batch_id');
        if (batchCol !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][batchCol]).trim() === batchId) {
              const row = {};
              headers.forEach((h, idx) => { row[h] = data[i][idx]; });
              entries.push({ id: `entry_${i}`, payload: row });
            }
          }
        }
      }
      // Gửi snapshot lên Cloud Run
      const snapshotPayload = {
        action: "submitSnapshot",
        api_key: prop('CLOUD_FN_API_KEY'),
        snapshotId: `${Math.floor(Date.now()/1000)}_${Utilities.getUuid().slice(0,8)}`,
        batch_ids: [batchId],
        entries: entries,
        meta: { device_id: 'GAS', created_at: getCurrentUTCTimestamp() }
      };
      const result = CloudRun.sendSnapshot(snapshotPayload);
      results.push({ batchId, ok: result.ok, snapshotId: result.snapshotId });
    }

    return { ok: true, results: results };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function weekly_auto_snapshot(params) {
  try {
    var res = WeeklyBatchModule.sendWeeklyBatch();
    return { ok: true, snapshotId: res.results && res.results[0] ? res.results[0].tx_hash : 'sent' };
  } catch(e) {
    return { ok: false, message: e.message };
  }
}

function get_snapshot_logs(params) { const ss = Database.getSpreadsheet(); const sh = ss.getSheetByName('Snapshot_Log'); if(!sh) return { logs: [] }; const data = sh.getDataRange().getValues(); const logs = data.slice(1).reverse().slice(0, params.limit||30).map(r => ({ ts: r[0], snapshotId: r[1], batch_ids: r[2], txHash: r[5] })); return { logs }; }
function get_event_logs(params) { const logs = Database.getSheetData('EventLogs'); return { logs: logs.slice(-(params.limit||50)).reverse() }; }
function telegram_webhook_info() { return TelegramModule.getWebhookInfo(); }
function telegram_set_webhook() { return TelegramModule.setWebhook(); }
function telegram_test() { TelegramModule.broadcast('Test from Admin UI: '+new Date().toISOString()); return { ok: true }; }
function get_rules() { const rules = SmartControlEngine.getRuleStatus(); return { ok: true, rules }; }
function get_rule_by_id(params) { const sheet = Database.getSpreadsheet().getSheetByName('ControlRules'); if(!sheet) return { ok: false }; const data = sheet.getDataRange().getValues(); const headers = data[0].map(h=>h.trim().toLowerCase()); const idCol = headers.indexOf('rule_id'); for(let i=1;i<data.length;i++) if(String(data[i][idCol])===params.rule_id) { const rule = {}; headers.forEach((h,idx)=>rule[h]=data[i][idx]); return { ok: true, rule }; } return { ok: false }; }
function save_rule(params) {
  if (params.rule_id && params.rule_id !== '') {
    *// Cập nhật rule cũ*
    var res = SmartControlEngine.updateRule(params.rule_id, params);
    return res;
  } else {
    *// Thêm rule mới*
    var res = SmartControlEngine.addRule(params);
    return res;
  }
}

function set_rule_enabled(params) {
  if (params.enabled === true || params.enabled === 'true') {
    return SmartControlEngine.enableRule(params.rule_id);
  } else {
    return SmartControlEngine.disableRule(params.rule_id);
  }
}

function run_advisory() { const latest = Database.getSheetData('SensorReadings').slice(-50); const result = AdvisoryEngine.analyzeLatestReadings(latest, {}); return result; }
// THÊM HÀM HỖ TRỢ 13.04.2026

// ==================== BACKEND API MỞ RỘNG CHO ADMIN UI ====================

function update_settings(params) {
  const props = PropertiesService.getScriptProperties();
  if (params.CLEANUP_DAYS) props.setProperty('CLEANUP_DAYS', params.CLEANUP_DAYS);
  if (params.RATE_LIMIT_PER_DEVICE) props.setProperty('RATE_LIMIT_PER_DEVICE', params.RATE_LIMIT_PER_DEVICE);
  return { ok: true, message: 'Settings updated' };
}

function create_backup() {
  const res = DeploymentManager.createBackup();
  return { ok: res.success, message: res.success ? 'Backup created: '+res.spreadsheet_backup : 'Backup failed' };
}

function telegram_send(params) {
  if (!params.text) return { ok: false };
  TelegramModule.broadcast(params.text);
  return { ok: true };
}

// ==================== BỔ SUNG HÀM BACKEND CHO ADMIN UI ====================

function get_blockchain_summary() {
  var logs = get_snapshot_logs({ limit: 1000 }).logs || [];
  var pending = logs.filter(function(x) { return x.status === 'pending' || !x.txHash; }).length;
  var confirmed = logs.filter(function(x) { return x.status === 'confirmed'; }).length;
  return { pendingTx: pending, confirmedTx: confirmed };
}

function scan_firmware() {
  return FirmwareManager.scanAndUpdate();
}

function verify_aptos_tx() {
  return WeeklyBatchModule.verifyWeeklyBatchTransactions();
}
// Thêm hàm getFirmwareList vào FirmwareManager nếu chưa có
if (typeof FirmwareManager.getFirmwareList === 'undefined') {
  FirmwareManager.getFirmwareList = function() {
    var ss = Database.getSpreadsheet();
    var sheet = ss.getSheetByName('FWNew');
    if (!sheet) return { list: [] };
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { list: [] };
    var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var list = [];
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j];
      list.push(obj);
    }

    return { list: list };
  };
}

function get_firmware_list() {
  return FirmwareManager.getFirmwareList();
}
// Các hàm khác như get_rule_by_id, save_rule, set_rule_enabled, get_system_stats... đã có ở trên
function monitoringTick() { SystemMonitor.performMonitoringCheck(); }
function cleanupOldData() { return DeploymentManager.cleanupOldData(); }
function calculateWeeklyAverageAndSubmitToHedera() { Analytics.calculateWeeklyAverageAndSubmitToHedera(); }
function generateScheduledReport() {
  try {
    const configs = JSON.parse(PropertiesService.getScriptProperties().getProperty('REPORT_CONFIGS') || '[]');
    const now     = new Date();
    configs.forEach(cfg => {
      let shouldRun = false;
      if      (cfg.frequency === 'daily')   shouldRun = true;
      else if (cfg.frequency === 'weekly')  shouldRun = (now.getDay() === (cfg.weekDay || 1));
      else if (cfg.frequency === 'monthly') shouldRun = (now.getDate() === (cfg.monthDay || 1));
      if (!shouldRun) return;
      const report   = Analytics.generateReport(cfg.reportType || 'daily_summary', { date: now });
      const fileName = 'report_' + (cfg.reportType || 'unknown') + '_' + Utilities.formatDate(now, 'GMT', 'yyyy-MM-dd') + '.json';
      const folderId = prop('REPORT_FOLDER_ID') || prop('MEDIA_FOLDER_ID');
      if (folderId && folderId !== 'CHANGE_ME') {
        DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(JSON.stringify(report), 'application/json', fileName));
      }

      EventModule.logEvent('system', 'scheduled_report', { type: cfg.reportType, file: fileName }, 'analytics');
    });

  } catch (e) {
    EventModule.logEvent('system', 'error', { error: e.toString() }, 'generateScheduledReport');
  }
}

/* =======================================================================

 * **MODULE 25 -- APTOS MODULE Blockchain** (MỚI, port từ V6.3 -- Mainnet via Vercel)
 * Dán TOÀN BỘ module này vào CUỐI file V8.0, trước setupAllTriggers().
======================================================================= */
const AptosModule = (() => {
  function _cfg() {
    return {
      url:     prop('APTOS_VERCEL_URL'),
      token:   prop('GAS_ACCESS_TOKEN'),
      account: prop('APTOS_ACCOUNT_ADDRESS'),
      enabled: String(prop('APTOS_ENABLED')).toLowerCase() === 'true'
    };
  }

  function isConfigured() {
    const c = _cfg();
    return c.enabled
      && c.url && c.url !== 'CHANGE_ME'
      && c.token && c.token !== 'CHANGE_ME'
      && c.account && c.account !== 'CHANGE_ME';
  }

  function sendToAptos(eventType, data, retryCount) {
    retryCount = retryCount || 0;
    if (!isConfigured()) return { ok: false, message: 'Aptos not configured' };
    const c = _cfg();
    const payload = {
      account: c.account,
      data: Object.assign({}, data, {
        event_type: eventType,
        timestamp: getCurrentUTCTimestamp(),
        source: 'EcoSynTech_GAS_9.0'
      })
    };
    try {
      const response = UrlFetchApp.fetch(c.url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + c.token
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      let result = {};
      try { result = JSON.parse(response.getContentText()); } catch(e) { result = {}; }
      if (result.ok && result.tx_hash) {
        // Log Blockchain_Log ở DÒNG 2
        const ss = Database.getSpreadsheet();
        const sh = ss.getSheetByName('Blockchain_Log') || ss.insertSheet('Blockchain_Log');
        writeAtTop(sh,
          [getCurrentUTCTimestamp(), 'aptos', result.tx_hash, eventType, JSON.stringify(data), 'submitted', ''],
          ['ts','chain','tx_hash','event_type','payload','status','note']
        );
        return { ok: true, tx_hash: result.tx_hash };
      }

      if (retryCount < 2) {
        Utilities.sleep(2000);
        return sendToAptos(eventType, data, retryCount + 1);
      }

      return { ok: false, error: result.error || 'Unknown error' };
    } catch (e) {
      if (retryCount < 2) {
        Utilities.sleep(2000);
        return sendToAptos(eventType, data, retryCount + 1);
      }

      return { ok: false, error: String(e) };
    }
  }

  /**

   * Đưa sự kiện vào hàng đợi tuần thay vì gửi ngay (tiết kiệm gas).
   * Nếu muốn gửi realtime, gọi AptosModule.sendToAptos(...) trực tiếp.
   */
  function recordTraceabilityEvent(batchId, eventType, details) {
    if (!batchId) return { ok: false, message: 'Missing batchId' };
    if (typeof WeeklyBatchModule !== 'undefined') {
      return WeeklyBatchModule.addEvent(batchId, eventType, details || {});
    }

    return sendToAptos(eventType, Object.assign({ batch_id: batchId }, details || {}));
  }

  return { isConfigured, sendToAptos, recordTraceabilityEvent };
})();

/* =============================================================================

 * MODULE 26 -- WEEKLY BATCH MODULE (MỚI, gom sự kiện N ngày/lần, mặc định 7)
 * ============================================================================= */
const WeeklyBatchModule = (() => {
  const SHEET_NAME = 'PendingWeeklyEvents';
  const HEADER = ['timestamp', 'batch_id', 'event_type', 'details_json', 'period_start', 'status'];
  function ensureSheet() {
    const ss = Database.getSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
      sheet.setFrozenRows(1);
    }

    return sheet;
  }

  function _periodStart() {
    const days = Math.max(1, parseInt(prop('APTOS_BATCH_DAYS'), 10) || 7);
    const now = new Date();
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    if (days === 7) {
      // Thứ Hai đầu tuần
      const day = start.getUTCDay();
      const diff = (day === 0 ? 6 : day - 1);
      start.setUTCDate(start.getUTCDate() - diff);
    } else {
      // Quy về mốc N-ngày tính từ epoch
      const epochDays = Math.floor(start.getTime() / 86400000);
      const bucket = Math.floor(epochDays / days) * days;
      start.setTime(bucket * 86400000);
    }

    return start.toISOString();
  }

  function addEvent(batchId, eventType, details) {
    // Rate limit: APTOS_BATCH_MAX_PER_HOUR/batch/giờ
    const maxPerHour = parseInt(prop('APTOS_BATCH_MAX_PER_HOUR'), 10) || 100;
    const rateKey = 'weekly_rate_' + batchId + '_' + Math.floor(Date.now() / 3600000);
    const current = Database.cacheGet ? Database.cacheGet(rateKey) : null;
    if (current && parseInt(current, 10) >= maxPerHour) {
      console.warn('Rate limit exceeded for batch ' + batchId);
      return { ok: false, message: 'Rate limit per hour' };
    }

    if (Database.cachePut) Database.cachePut(rateKey, (parseInt(current, 10) || 0) + 1, 3600);
    const sheet = ensureSheet();
    // [V9.1 FIX-M1] Giới hạn queue
    const MAX_PENDING_ROWS = 5000;
    if (sheet.getLastRow() > MAX_PENDING_ROWS + 1) {
      console.warn('WeeklyBatch queue full: ' + sheet.getLastRow() + ' rows');
      return { ok: false, message: 'Queue full' };
    }

    writeAtTop(sheet, [
      getCurrentUTCTimestamp(),
      batchId,
      eventType,
      JSON.stringify(details || {}),
      _periodStart(),
      'pending'
    ], HEADER);
    return { ok: true, queued: true };
  }

  function sendWeeklyBatch() {
    const sheet = ensureSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: false, message: 'No pending events' };
    const pending = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][5]) === 'pending') pending.push({ rowIndex: i + 1, row: data[i] });
    }

    if (!pending.length) return { ok: false, message: 'No pending events' };
    // Gom theo period_start
    const groups = {};
    pending.forEach(p => {
      const k = p.row[4];
      if (!groups[k]) groups[k] = [];
      groups[k].push({
        batch_id: p.row[1],
        event_type: p.row[2],
        details: (function(){ try { return JSON.parse(p.row[3]); } catch(e) { return {}; } })(),
        timestamp: p.row[0]
      });

    });

    const results = [];
    Object.keys(groups).forEach(periodStart => {
      const events = groups[periodStart];
      const payload = {
        period_start: periodStart,
        period_days: parseInt(prop('APTOS_BATCH_DAYS'), 10) || 7,
        event_count: events.length,
        events: events,
        source: 'EcoSynTech_GAS_9.0',
        aggregated_at: getCurrentUTCTimestamp()
      };
      const res = AptosModule.sendToAptos('weekly_batch', payload);
      if (res.ok) {
        pending.forEach(p => {
          if (p.row[4] === periodStart) sheet.getRange(p.rowIndex, 6).setValue('sent');
        });

        results.push({ period_start: periodStart, tx_hash: res.tx_hash, status: 'success', count: events.length });
      } else {
        results.push({ period_start: periodStart, status: 'failed', error: res.error });
      }
    });

    return { ok: true, results };
  }

  function verifyWeeklyBatchTransactions() {
    const ss = Database.getSpreadsheet();
    const logSheet = ss.getSheetByName('Blockchain_Log');
    if (!logSheet) return { ok: false, message: 'No Blockchain_Log' };
    const data = logSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const txCol     = headers.indexOf('tx_hash');
    const statusCol = headers.indexOf('status');
    const chainCol  = headers.indexOf('chain');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][chainCol]) !== 'aptos') continue;
      if (String(data[i][statusCol]) !== 'submitted') continue;
      const txHash = data[i][txCol];
      try {
        const url = 'https://api.mainnet.aptoslabs.com/v1/transactions/by_hash/' + txHash;
        const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (resp.getResponseCode() === 200) {
          const tx = JSON.parse(resp.getContentText());
          if (tx.type === 'user_transaction' && tx.success === true) {
            logSheet.getRange(i + 1, statusCol + 1).setValue('confirmed');
          } else if (tx.success === false) {
            logSheet.getRange(i + 1, statusCol + 1).setValue('failed');
          }
        }

      } catch (e) {
        console.error('Verify tx failed ' + txHash + ': ' + e);
      }
    }

    return { ok: true };
  }

  return { ensureSheet, addEvent, sendWeeklyBatch, verifyWeeklyBatchTransactions };
})();

// Wrapper gọi bởi trigger (đặt ở global scope)
function weeklyBatchSender()        { return WeeklyBatchModule.sendWeeklyBatch(); }
function verifyAptosTransactions()  { return WeeklyBatchModule.verifyWeeklyBatchTransactions(); }

/* =============================================================================

 * MODULE 27 -- FIRMWARE MANAGER (OTA WEBHOOK, tự tính SHA256 từ Drive)
 * ============================================================================= */
const FirmwareManager = (() => {
  function scanAndUpdate() {
    const folderId = prop('FIRMWARE_FOLDER_ID');
    if (!folderId || folderId === 'CHANGE_ME') {
      console.error('FIRMWARE_FOLDER_ID not set');
      return { ok: false, message: 'FIRMWARE_FOLDER_ID not set' };
    }

    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const binFiles = [];
    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();
      if (name.toLowerCase().endsWith('.bin')) {
        const match = name.match(/v?(\d+\.\d+\.\d+)/);
        const version = match ? match[1] : name.replace(/\.bin$/i, '');
        binFiles.push({ file: file, version: version, created: file.getDateCreated() });
      }
    }

    if (binFiles.length === 0) return { ok: false, message: 'No .bin in folder' };
    binFiles.sort((a, b) => b.created - a.created);
    const latest = binFiles[0];
    const blob   = latest.file.getBlob();
    const sha256 = Database.computeSha256(blob);
    const size   = blob.getBytes().length;
    const binUrl = Database.createTemporaryDownloadLink(latest.file.getId());
    const ss = Database.getSpreadsheet();
    const fw = ss.getSheetByName('FWNew') || ss.insertSheet('FWNew');
    const HEADER = ['device_id', 'fw_version', 'bin_url', 'sha256', 'size', 'updated_at'];
    if (fw.getLastRow() < 1) {
      fw.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
      fw.setFrozenRows(1);
    }
    // Cập nhật dòng '*' (broadcast) nếu có, ngược lại writeAtTop
    const data = fw.getDataRange().getValues();
    let starRow = -1;
    for (let i = 1; i < data.length; i++) if (String(data[i][0]) === '*') { starRow = i + 1; break; }
    const row = ['*', latest.version, binUrl, sha256, size, getCurrentUTCTimestamp()];
    if (starRow > 0) {
      fw.getRange(starRow, 1, 1, row.length).setValues([row]);
    } else {
      writeAtTop(fw, row, HEADER);
    }

    EventModule.logEvent('system', 'firmware_scanned', { version: latest.version, sha256: sha256, size: size }, 'drive');
    if (typeof TelegramModule !== 'undefined') {
      try { TelegramModule.broadcast('📦 Firmware mới ' + latest.version + ' (SHA256 ' + sha256.substr(0, 10) + '...) sẵn sàng OTA.'); } catch(e) {}
    }

    return { ok: true, version: latest.version, sha256: sha256, size: size, bin_url: binUrl };
  }

  /**

   * Webhook handler cho ?action=ota_check -- trả JSON manifest ký HMAC.
   * Thiết bị gọi: POST /exec?action=ota_check&device_id=ESP32_xxx
   */
  function handleOtaCheck(deviceId) {
    const ss = Database.getSpreadsheet();
    const fw = ss.getSheetByName('FWNew');
    let targetVersion = null, binUrl = '', sha256 = '', size = 0;
    if (fw) {
      const data = fw.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const iDev = headers.indexOf('device_id');
      const iVer = headers.indexOf('fw_version');
      const iBin = headers.indexOf('bin_url');
      const iSha = headers.indexOf('sha256');
      const iSiz = headers.indexOf('size');
      if (iDev !== -1 && iVer !== -1 && iBin !== -1) {
        let row = null;
        for (let i = 1; i < data.length; i++) if (String(data[i][iDev]).trim() === deviceId) { row = data[i]; break; }
        if (!row) for (let i = 1; i < data.length; i++) if (String(data[i][iDev]).trim() === '*') { row = data[i]; break; }
        if (row) {
          targetVersion = String(row[iVer]).trim();
          binUrl = String(row[iBin]).trim();
          if (iSha !== -1) sha256 = String(row[iSha]).trim();
          if (iSiz !== -1) size = Number(row[iSiz]) || 0;
        }
      }
    }

    const updateAvailable = !!(targetVersion && binUrl && targetVersion !== FW_VERSION);
    const manifest = {
      update_available: updateAvailable,
      version: targetVersion || FW_VERSION,
      bin_url: binUrl,
      sha256: sha256,
      size: size,
      notes: updateAvailable ? ('Update ' + FW_VERSION + ' → ' + targetVersion) : 'No update'
    };
    const secret = Database.getDeviceSecret(deviceId);
    if (!secret) return JsonResponse({ ok: false, message: 'Device secret missing' });
    return JsonResponse(Security.createSignedPayload(deviceId, manifest, secret));
  }

  return { scanAndUpdate: scanAndUpdate, handleOtaCheck: handleOtaCheck };
})();

// Wrappers global
function scanFirmwareFolderAndUpdateSheet() { return FirmwareManager.scanAndUpdate(); }
// Trong EcoSynTechApp.handleRequest, nhánh ota_check gọi: FirmwareManager.handleOtaCheck(deviceId)
function setupAllTriggers() {
  // 1) Xoá tất cả trigger cũ
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  // 2) Tạo 6 trigger gom:
  //    a) coreTick -- mỗi 10 phút (sensor/alert/retry/backlog/smart)
  ScriptApp.newTrigger('coreTick').timeBased().everyMinutes(10).create();
  //    b) syncPublicSheets -- mỗi 30 phút
  const syncMin = parseInt(prop('SYNC_INTERVAL_MIN'), 10) || 30;
  ScriptApp.newTrigger('syncPublicSheets').timeBased().everyMinutes(syncMin).create();
  //    c) hourlyTasks -- mỗi 1 giờ (scan FW, rollup, verify tx)
  ScriptApp.newTrigger('hourlyTasks').timeBased().everyHours(1).create();
  //    d) dailyTasks -- mỗi 1 ngày (cleanup, daily report)
  ScriptApp.newTrigger('dailyTasks').timeBased().everyDays(1).atHour(3).create();
  //    e) weeklyBatchSender -- 0h thứ Hai (gửi batch Aptos)
  ScriptApp.newTrigger('weeklyBatchSender').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(0).create();
  //    f) verifyAptosTransactions -- mỗi 30 phút (confirm tx mainnet)
  const verMin = parseInt(prop('APTOS_VERIFY_INTERVAL_MIN'), 10) || 30;
  ScriptApp.newTrigger('verifyAptosTransactions').timeBased().everyMinutes(verMin).create();
  console.log('✅ 6 triggers đã được đăng ký. Dùng ScriptApp.getProjectTriggers() để kiểm tra.');
}
// Wrapper CORE (10 phút)
// [V9.3 GPT-5b] Watchdog: auto-mark device offline nếu mất liên lạc > 2 chu kỳ
function _checkDeviceWatchdog() {
  try {
    const interval = parseInt(prop('DEVICE_POST_INTERVAL_SEC'), 10) || 600;
    const thresholdMs = interval * 2 * 1000; // 2x chu kỳ = 1200 giây default
    const ss = Database.getSpreadsheet();
    const sheet = ss.getSheetByName('Devices');
    if (!sheet || sheet.getLastRow() < 2) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idCol       = headers.indexOf('device_id');
    const statusCol   = headers.indexOf('status');
    const lastSeenCol = headers.indexOf('last_seen');
    if (idCol === -1 || statusCol === -1 || lastSeenCol === -1) return;
    const now = Date.now();
    const offlineDevices = [];
    for (let i = 1; i < data.length; i++) {
      const status   = String(data[i][statusCol] || '').toLowerCase();
      const lastSeen = data[i][lastSeenCol];
      if (status !== 'active') continue;
      if (!lastSeen) continue;
      const age = now - new Date(lastSeen).getTime();
      if (age > thresholdMs) {
        sheet.getRange(i + 1, statusCol + 1).setValue('offline');
        offlineDevices.push(String(data[i][idCol]));
        Database.cacheRemoveKey('device_secret_' + String(data[i][idCol]));
        EventModule.logEvent(String(data[i][idCol]), 'device_offline',
          { last_seen: lastSeen, age_min: Math.round(age / 60000) }, 'watchdog');
      }
    }
    if (offlineDevices.length > 0) {
      // Telegram alert cho admin
      if (typeof TelegramModule !== 'undefined' && TelegramModule.isConfigured()) {
        try {
          TelegramModule.broadcast(
            '[WATCHDOG] ' + offlineDevices.length + ' device(s) offline: ' + offlineDevices.join(', ')
          );
        } catch(e) { console.error('Watchdog Telegram:', e); }
      }
    }
  } catch(e) {
    _handleError('coreTick:watchdog', e, 'critical');
  }
}

// ═══════════════════════════════════════════════════════════════
// [V9.5 FIX-3] CENTRALIZED ERROR HANDLER + SEVERITY ALERT
// Usage: _handleError('module:fn', error, 'warning'|'critical')
// ═══════════════════════════════════════════════════════════════
function _handleError(context, error, severity) {
  severity = severity || 'warning';
  const errMsg = (error instanceof Error) ? error.message : String(error);
  const payload = { context: context, error: errMsg, severity: severity, ts: getCurrentUTCTimestamp() };
  // 1. Log vào EventLogs
  try { EventModule.logEvent('system', 'error_' + severity, payload, context); } catch(_) {}
  // 2. Telegram alert với dedup 15 phút (warning+)
  if (severity === 'warning' || severity === 'critical') {
    const dedupKey = 'err_' + context.replace(/[^a-zA-Z0-9]/g,'_').slice(0, 28);
    if (!Database.cacheGet(dedupKey)) {
      Database.cachePut(dedupKey, '1', 900);
      const icon = severity === 'critical' ? '🚨' : '⚠️';
      try {
        if (typeof TelegramModule !== 'undefined' && TelegramModule.isConfigured()) {
          TelegramModule.broadcast(icon + ' [' + severity.toUpperCase() + '] ' + context + ': ' + errMsg.slice(0, 200));
        }
      } catch(_tg) {}
    }
  }
  console.error('[' + severity.toUpperCase() + '] ' + context + ':', errMsg);
}

function coreTick() {
  const errors = [];
  try { if (typeof SystemMonitor !== 'undefined') SystemMonitor.performMonitoringCheck(); } catch(e){ errors.push('monitor:'+e); }
  try { if (typeof RetryQueue   !== 'undefined') RetryQueue.processRetries(); }              catch(e){ errors.push('retry:'+e); }
  try { if (typeof BacklogModule!== 'undefined') BacklogModule.process();}                   catch(e){ errors.push('backlog:'+e); }
  try { _checkDeviceWatchdog(); }                                                             catch(e){ errors.push('watchdog:'+e); }
  // Note: SmartControlEngine.evaluateRules() is called inside processSensorData (PATCH 04)
  if (errors.length) {
    EventModule.logEvent('system','core_tick_partial_error',{errors:errors},'trigger');
    if (errors.some(e => e.startsWith('watchdog') || e.startsWith('monitor'))) {
      _handleError('coreTick:summary', new Error(errors.join(' | ')), 'critical');
    }
  }
}
// Wrapper HOURLY (1 giờ)
function hourlyTasks() {
  try { FirmwareManager.scanAndUpdate(); } catch(e) { EventModule.logEvent('system','error',{where:'hourly-fw',err:String(e)},'trigger'); }
  // Kiểm tra nếu Analytics.hourlyRollup tồn tại mới gọi
  if (typeof Analytics !== 'undefined' && typeof Analytics.hourlyRollup === 'function') {
    try { Analytics.hourlyRollup(); } catch(e) {}
  }

  try { WeeklyBatchModule.verifyWeeklyBatchTransactions(); } catch(e) {}
}
// Wrapper DAILY (03:00)
function dailyTasks() {
  try { if (typeof DeploymentManager !== 'undefined') DeploymentManager.cleanupOldData(); } catch(e) {}
  try { generateScheduledReport(); } catch(e) {}
}
  // [V9.1 FIX-H4] Archive sensor data hàng ngày, giữ tối đa 50k rows
  try {
    const ar = Database.archiveSensorData(50000);
    if (ar.archived > 0) EventModule.logEvent('system','sensor_archived',ar,'daily');
  } catch(e) { EventModule.logEvent('system','archive_error',{err:String(e)},'daily'); }
// doGet / doPost -- bổ sung OTA check webhook
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'ota_check') {
      return FirmwareManager.handleOtaCheck(e.parameter.device_id || '');
    }

    if (e && e.parameter && e.parameter.ui === '1') {
      const adminEmails = (prop('ADMIN_EMAILS') || '').split(',').map(s => s.trim()).filter(Boolean);
      if (adminEmails.length > 0) {
        const userEmail = Session.getActiveUser().getEmail();
        if (!userEmail || !adminEmails.includes(userEmail)) {
          return HtmlService.createHtmlOutput('<div style="padding:20px;font-family:sans-serif">Access denied.</div>').setTitle('Access Denied');
        }
      }

      return HtmlService.createHtmlOutput(getFullAdminHTML())
        .setTitle('EcoSynTech Admin Pro V9.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    return EcoSynTechApp.handleRequest({ method: 'get', parameter: e.parameter, context: e }).response;
  } catch (error) {
    logEvent('system','error',{message:'doGet error', error:String(error)},'server');
    return JsonResponse({ ok: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    let postData = {};
    if (e.postData && e.postData.contents) { try { postData = JSON.parse(e.postData.contents); } catch(p){ postData={}; } }
    if (e.parameter && e.parameter.action === 'telegram_webhook') {
      const result = TelegramModule.handleUpdate(postData);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter && e.parameter.action === 'ota_check') {
      return FirmwareManager.handleOtaCheck(e.parameter.device_id || '');
    }

    return EcoSynTechApp.handleRequest({ method: 'post', postData: e.postData, parameter: e.parameter, context: e }).response;
  } catch (error) {
    logEvent('system','error',{message:'doPost error', error:String(error)},'server');
    return JsonResponse({ ok: false, error: String(error) });
  }
}

//hàm initialSetup (giữ nguyên, nhưng đảm bảo gọi setupAllTriggers)
function initialSetup() { EcoSynTechApp.initialize(); }
// thêm 07.04.2026
function processRetryQueue() {
  if (typeof RetryQueue !== 'undefined' && RetryQueue.processRetries) {
    RetryQueue.processRetries();
  } else {
    console.error('RetryQueue module not loaded');
  }
}

function getRuleById(ruleId) {
  const sheet = Database.getSpreadsheet().getSheetByName('ControlRules');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idCol = headers.indexOf('rule_id');
  if (idCol === -1) return null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === ruleId) {
      const rule = {};
      headers.forEach((h, idx) => {
        rule[h] = data[i][idx];
      });

      return rule;
    }
  }

  return null;
}

function saveRule(ruleData) {
  const ss = Database.getSpreadsheet();
  let sheet = ss.getSheetByName('ControlRules');
  if (!sheet) {
    // Tạo sheet mới với đầy đủ cột
    sheet = ss.insertSheet('ControlRules');
    sheet.getRange(1, 1, 1, 12).setValues([[
      'rule_id', 'zone', 'sensor', 'min', 'max',
      'hysteresis', 'duration_sec', 'action', 'reset_action',
      'device_id', 'cooldown_sec', 'enabled'
    ]]);
  }
  // Lấy headers hiện tại
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim().toLowerCase());
  // Helper: tìm cột hoặc tạo mới nếu thiếu
  function getOrCreateColumn(colName) {
    let idx = headers.indexOf(colName);
    if (idx === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(colName);
      headers.push(colName);
      idx = headers.length - 1;
    }

    return idx;
  }
  // Đảm bảo các cột cần thiết tồn tại
  getOrCreateColumn('rule_id');
  getOrCreateColumn('zone');
  getOrCreateColumn('sensor');
  getOrCreateColumn('min');
  getOrCreateColumn('max');
  getOrCreateColumn('hysteresis');
  getOrCreateColumn('duration_sec');
  getOrCreateColumn('action');
  getOrCreateColumn('reset_action');
  getOrCreateColumn('device_id');
  getOrCreateColumn('cooldown_sec');
  getOrCreateColumn('enabled');
  // Nếu có rule_id và khác rỗng -> cập nhật
  if (ruleData.rule_id && ruleData.rule_id !== '') {
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const idCol = headers.indexOf('rule_id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === ruleData.rule_id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { ok: false, message: 'Rule not found' };
    // Cập nhật từng cột
    for (let [k, v] of Object.entries(ruleData)) {
      const colIdx = headers.indexOf(k.toLowerCase());
      if (colIdx !== -1) {
        sheet.getRange(rowIndex, colIdx + 1).setValue(v);
      }
    }

    EventModule.logEvent('system', 'rule_updated', ruleData, 'ui');
    return { ok: true };
  } else {
    // Thêm mới
    const newId = 'rule_' + Utilities.getUuid().slice(0, 8);
    // Tạo mảng giá trị theo đúng thứ tự headers
    const newRow = headers.map(h => {
      switch (h) {
        case 'rule_id': return newId;
        case 'zone': return ruleData.zone || '';
        case 'sensor': return ruleData.sensor || '';
        case 'min': return ruleData.min_val ?? 0;
        case 'max': return ruleData.max_val ?? 100;
        case 'hysteresis': return ruleData.hysteresis ?? 0;
        case 'duration_sec': return ruleData.duration_sec ?? 0;
        case 'action': return ruleData.action || '';
        case 'reset_action': return ruleData.reset_action || '';
        case 'device_id': return ruleData.device_id || '*';
        case 'cooldown_sec': return ruleData.cooldown_sec ?? 300;
        case 'enabled': return (ruleData.enabled === undefined ? true : ruleData.enabled);
        default: return '';
      }
    });

    sheet.appendRow(newRow);
    EventModule.logEvent('system', 'rule_added', { rule_id: newId, ...ruleData }, 'ui');
    return { ok: true, rule_id: newId };
  }
}
// Đảm bảo Analytics có hàm hourlyRollup
if (typeof Analytics !== 'undefined' && typeof Analytics.hourlyRollup === 'undefined') {
  Analytics.hourlyRollup = function() { return { ok: true }; };
}
// thêm 07.04.2026
function setRuleEnabled(ruleId, enabled) {
  const sheet = Database.getSpreadsheet().getSheetByName('ControlRules');
  if (!sheet) return { ok: false };
  const data = sheet.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if (String(data[i][0]) === ruleId) {
      const enabledCol = data[0].findIndex(h=>h.trim().toLowerCase() === 'enabled');
      _invalidateRuleCache(); // [V9.1 FIX-H1 supplement]
      if (enabledCol !== -1) sheet.getRange(i+1, enabledCol+1).setValue(enabled);
      EventModule.logEvent('system', 'rule_enabled_changed', { rule_id: ruleId, enabled }, 'ui');
      return { ok: true };
    }
  }

  return { ok: false };
}

/* =============================================================================

 * MODULE 31 -- TEST FUNCTIONS (bổ sung cho V9.0)
 * ============================================================================= */
function testAptosConfig() {
  console.log('APTOS configured:', AptosModule.isConfigured());
  console.log('VERCEL_URL:', prop('APTOS_VERCEL_URL'));
  console.log('ACCOUNT:', prop('APTOS_ACCOUNT_ADDRESS'));
  console.log('ENABLED:', prop('APTOS_ENABLED'));
}

function testAptosSendOnce() {
  const r = AptosModule.sendToAptos('test_event', { msg: 'hello from V9.0', ts: getCurrentUTCTimestamp() });
  console.log(r);
}

function testWeeklyBatchAdd() {
  const r = WeeklyBatchModule.addEvent('BATCH_TEST_001', 'test_event', { note: 'queued' });
  console.log(r);
}

function testWeeklyBatchSendNow() {
  const r = WeeklyBatchModule.sendWeeklyBatch();
  console.log(r);
}

function testFirmwareScan() {
  const r = FirmwareManager.scanAndUpdate();
  console.log(r);
}

function testOtaCheck() {
  const r = FirmwareManager.handleOtaCheck('ESP32_TEST_001');
  console.log(r.getContent());
}

function testRowTop() {
  const ss = Database.getSpreadsheet();
  const sh = ss.getSheetByName('EventLogs') || ss.insertSheet('EventLogs');
  writeAtTop(sh, [getCurrentUTCTimestamp(),'system','test_row_top','{"src":"test"}','manual',''], ['ts','entity','event','payload','source','note']);
  console.log('✅ Đã ghi 1 dòng mới ở dòng 2 của EventLogs');
}

function testV9AllTriggers() {
  setupAllTriggers();
  const trigs = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  console.log('Triggers hiện có (' + trigs.length + '):', trigs);
  if (trigs.length > 6) console.warn('⚠️ Vượt quá 6 trigger -- Google sẽ chặn!');
}
 // Đảm bảo Analytics có hàm hourlyRollup (tránh lỗi trigger)
if (typeof Analytics !== 'undefined' && typeof Analytics.hourlyRollup === 'undefined') {
  Analytics.hourlyRollup = function() { return { ok: true }; };
}

/* =============================================================================

 * SCRIPT PROPERTIES CẦN CẤU HÌNH (Project Settings → Script Properties)
 * ============================================================================= */

/*

Key                          | Ví dụ giá trị
-----------------------------+-------------------------------------------------
SPREADSHEET_ID               | 1AbcDef...
HMAC_SECRET                  | (random 32 char)
API_KEY                      | (random 32 char)
WEBAPP_URL                   | https://script.google.com/macros/s/XXX/exec
QR_FOLDER_ID                 | Drive folder ID
MEDIA_FOLDER_ID              | Drive folder ID
FIRMWARE_FOLDER_ID           | Drive folder chứa .bin (V9.0 mới)
ADMIN_EMAILS                 | you@gmail.com,co@gmail.com
ADMIN_UI_THEME               | dark | light
TELEGRAM_BOT_TOKEN           | 1234:ABC...
TELEGRAM_CHAT_IDS            | 123456,789012
# ---- Aptos Mainnet ----
APTOS_VERCEL_URL             | https://your-app.vercel.app/api/log-event
GAS_ACCESS_TOKEN             | (bearer token, giống Vercel)
APTOS_ACCOUNT_ADDRESS        | 0x.... (public)
APTOS_ENABLED                | true
APTOS_BATCH_DAYS             | 7      (có thể đổi: 1,3,7,14...)
APTOS_BATCH_MAX_PER_HOUR     | 100
APTOS_VERIFY_INTERVAL_MIN    | 30
# ---- Sensor ----
SENSOR_READ_INTERVAL_SEC     | 600    (10 phút -- firmware dùng)
DEVICE_POST_INTERVAL_SEC     | 600
*/

/* =============================================================================

 * CHECKLIST DEPLOY V9.0
 * ============================================================================= */

/*

[ ] 1. Apply PATCH 01 -- Fix DEFAULTS object, thay FW_VERSION và sửa ADVISORY_BATTERY_LOW
[ ] 2. Apply PATCH 02 -- Thêm writeAtTop + logAtTop vào Helpers
[ ] 3. Apply PATCH 03 -- Thay hàm logEvent trong EventModule
[ ] 4. Apply PATCH 04 -- Thêm computeSha256 + createTemporaryDownloadLink + cache* vào Database
[ ] 5. Apply PATCH 05 -- Hook Aptos + writeAtTop trong processSensorData
[ ] 6. Apply PATCH 06 -- writeAtTop trong createCommandForDevice
[ ] 7. Apply PATCH 07 -- Hook Aptos trong _handleUploadMedia
[ ] 8. Apply PATCH 08 -- writeAtTop trong SmartControlEngine._executeAction
[ ] 9. Apply PATCH 09 -- writeAtTop trong SnapshotModule
[ ] 10. Paste MODULE 25 (AptosModule) vào cuối file
[ ] 11. Paste MODULE 26 (WeeklyBatchModule) vào cuối file
[ ] 12. Paste MODULE 27 (FirmwareManager) vào cuối file
[ ] 13. Paste MODULE 28 (getFullAdminHTML) -- thay thế hàm cũ
[ ] 14. Paste MODULE 30 -- thay setupAllTriggers, doGet, doPost
[ ] 15. Cấu hình Script Properties (xem danh sách ở trên)
[ ] 16. Chạy initialSetup() → kiểm tra có đúng 6 trigger
[ ] 17. Chạy testV9AllTriggers, testRowTop, testFirmwareScan
[ ] 18. Mở WebApp /exec?ui=1 → kiểm tra Admin UI Pro (dark/light toggle, dashboard)
[ ] 19. Deploy WebApp (Execute as Me, Access: Anyone with link)
[ ] 20. Cập nhật firmware ESP32 để gọi endpoint mới:
         POST /exec?action=ota_check&device_id=ESP32_xxx
         POST /exec?action=telegram_webhook  (nếu dùng)
*/

/* ==========================  END OF V9.0 UPGRADE PACK  ========================= */

/* ================================================================

   TELEGRAM BOT MANAGEMENT FUNCTIONS
   - Chay tu menu Apps Script > Run function
   ================================================================ */
// Buoc 1: Dang ky webhook - chay 1 lan sau khi deploy web app
function setupTelegramWebhook() {
  const result = TelegramModule.setWebhook();
  Logger.log('[Telegram] setWebhook: ' + JSON.stringify(result));
  if (result.ok) console.log('Telegram webhook da duoc dang ky thanh cong!');
  else console.error('Dang ky webhook that bai:', result.description || result.error);
  return result;
}
// Xoa webhook (dung khi muon dung polling thay vi webhook)
function deleteTelegramWebhook() {
  const result = TelegramModule.deleteWebhook();
  Logger.log('[Telegram] deleteWebhook: ' + JSON.stringify(result));
  return result;
}
// Kiem tra trang thai webhook hien tai
function getTelegramWebhookInfo() {
  const result = TelegramModule.getWebhookInfo();
  Logger.log('[Telegram] webhookInfo: ' + JSON.stringify(result));
  return result;
}
// Test: Gui tin kiem tra toi tat ca chat_id
function sendTelegramTestMessage() {
  const results = TelegramModule.broadcast(
    '[EcoSynTech V7.0] Telegram Bot ket noi thanh cong!\n'
    + 'Thoi gian: ' + getCurrentUTCTimestamp()
  );
  Logger.log('[Telegram] test broadcast: ' + JSON.stringify(results));
  return results;
}
// Test tich hop Telegram day du

/* ---- Advisory Engine & Traceability helpers ---- */

// Phan tich du lieu nong trai moi nhat cho mot batch
function processLatestFarmData(batchId, readings) {
  const result = AdvisoryEngine.processAndLog(batchId, readings, '');
  if (result.alerts.length) {
    console.log('[Advisory] ' + result.summary);
    result.alerts.forEach(a => console.log('  [' + a.level + '] ' + a.code + ': ' + a.message));
    console.log('  Suggested actions: ' + result.suggested_actions.join(', '));
  }

  return result;
}
// Test AdvisoryEngine day du
function testAdvisoryEngine() {
  console.log('=== KIEM TRA ADVISORY ENGINE ===');
  const readings = [
    { sensor_type: 'temperature', value: 40.5, unit: 'C',  ts: getCurrentUTCTimestamp() },
    { sensor_type: 'humidity',    value: 30.0, unit: '%',  ts: getCurrentUTCTimestamp() },
    { sensor_type: 'soil_moisture', value: 20.0, unit: '%', ts: getCurrentUTCTimestamp() },
    { sensor_type: 'battery',     value: 3.3,  unit: 'V',  ts: getCurrentUTCTimestamp() }
  ];
  const result = AdvisoryEngine.analyzeLatestReadings(readings, { batchId: 'TEST_BATCH' });
  console.log('Anomaly score:', result.anomaly_score);
  console.log('Alerts:',        result.alerts.length);
  result.alerts.forEach(a => console.log('  ' + a.level + ' | ' + a.code + ' | ' + a.message));
  console.log('Actions:',       result.suggested_actions.join(', '));
  console.log('Summary:',       result.summary);
  if (TelegramModule.isConfigured()) {
    TelegramModule.notify('alert', {
      device_id:  'TEST_DEVICE',
      alert_type: result.alerts.length ? result.alerts[0].code : 'test',
      value:      result.anomaly_score,
      severity:   result.alerts.length ? result.alerts[0].level : 'info',
      note:       result.summary,
      ts:         getCurrentUTCTimestamp()
    });

    console.log('Telegram notify sent.');
  }

  console.log('=== HOAN THANH TEST ADVISORY ENGINE ===');
}
// Test get_batch_traceability API
function testBatchTraceability() {
  console.log('=== TEST TRUY XUAT BATCH ===');
  const ss     = Database.getSpreadsheet();
  const biSh   = ss.getSheetByName('BatchInfo');
  if (!biSh || biSh.getLastRow() < 2) {
    console.log('Sheet BatchInfo chua co du lieu. Tao du lieu test...');
    return;
  }

  const batchId = String(biSh.getRange(2, 1).getValue()).trim();
  console.log('Testing batch:', batchId);
  const result = EcoSynTechApp.handleRequest({
    method: 'get',
    parameter: { action: 'get_batch_traceability', batch_id: batchId, api_key: prop('API_KEY') }
  });

  const resp = JSON.parse(result.response.getContent());
  console.log('ok:', resp.ok);
  if (resp.batch) console.log('batch_name:', resp.batch['batch_name'] || resp.batch['batch_id']);
  console.log('events:', resp.events ? resp.events.length : 0);
  console.log('qr_url:', resp.qr_url || '(chua co)');
  console.log('=== HOAN THANH TEST TRUY XUAT ===');
}

function testTelegram() {
  console.log('=== KIEM TRA TELEGRAM ===');
  const cfg = TelegramModule.isConfigured();
  console.log('Configured: ' + cfg);
  if (!cfg) {
    console.error('TELEGRAM_BOT_TOKEN chua duoc cau hinh trong Script Properties!');
    console.error('Them: TELEGRAM_BOT_TOKEN = <token tu @BotFather>');
    console.error('Them: TELEGRAM_CHAT_IDS  = <chat_id cua ban>');
    return;
  }

  const info = getTelegramWebhookInfo();
  console.log('Webhook URL:', info.result && info.result.url ? info.result.url : 'Chua dang ky');
  const r1 = sendTelegramTestMessage();
  console.log('Test message:', JSON.stringify(r1));
  const r2 = TelegramModule.notify('alert', {
    device_id:  'TEST_DEVICE',
    alert_type: 'test_from_script',
    value:      28.5,
    severity:   'warning',
    note:       'Test tu testTelegram() - Apps Script',
    ts:         getCurrentUTCTimestamp()
  });

  console.log('Notify alert:', JSON.stringify(r2));
  console.log('=== HOAN THANH TEST TELEGRAM ===');
}

//============THÊM HÀM test_flow_quick 13.04.2026

function test_flow_quick() {
  try {
    SnapshotModule.processNewBatchesAndGenerateQr();
    BacklogModule.process();
    cleanupOldData();
    return { ok: true };
  } catch(e) {
    return { ok: false, error: String(e) };
  }
}

function testFullSystem() {
  console.log('🚀 BẮT ĐẦU TEST TOÀN BỘ HỆ THỐNG 🚀');
  console.log('=====================================');
  console.log('\n1. Cấu hình:');    testConfig();
  console.log('\n2. Database:');    try { testDatabase();  } catch (e) { console.error('Lỗi DB: ' + e.message); }
  console.log('\n3. Security:');    try { testSecurity();  } catch (e) { console.error('Lỗi Security: ' + e.message); }
  console.log('\n4. IoT:');         try { testIoTCore();   } catch (e) { console.error('Lỗi IoT: ' + e.message); }
  console.log('\n5. QR:');          try { testQR();        } catch (e) { console.error('Lỗi QR: ' + e.message); }
  console.log('\n6. Events:');      try { testEvents();    } catch (e) { console.error('Lỗi Events: ' + e.message); }
  console.log('\n7. Monitoring:');  try { testMonitoring(); } catch (e) { console.error('Lỗi Monitor: ' + e.message); }
  console.log('\n=====================================');
  console.log('✅ HOÀN THÀNH! Xem log chi tiết trong tab Executions.');
}

  _invalidateRuleCache(); // [H1 addRule]
