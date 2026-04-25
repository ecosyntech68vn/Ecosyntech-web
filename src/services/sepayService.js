/**
 * SePay (SEP Vietnam) Payment Integration
 * 
 * SePay: https://sepay.vn
 * API Docs: https://docs.sepay.vn
 * 
 * Supported banks: Vietcombank, Techcombank, ACB, BIDV, VietinBank, MB, SHB, LPBank
 */

const crypto = require('crypto');
const https = require('https');

const sepayConfig = {
  partnerId: process.env.SEPAY_PARTNER_ID || 'YOUR_PARTNER_ID',
  partnerKey: process.env.SEPAY_PARTNER_KEY || 'YOUR_PARTNER_KEY',
  apiUrl: process.env.SEPAY_API_URL || 'https://api.sepay.vn',
  checksumKey: process.env.SEPAY_CHECKSUM_KEY || 'YOUR_CHECKSUM_KEY'
};

/**
 * Generate payment link from SePay
 */
async function createSepayPayment(orderId, amount, content, bankId = 'VCB') {
  const timestamp = Date.now().toString();
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  // Build payment data
  const paymentData = {
    partner_id: sepayConfig.partnerId,
    partner_key: sepayConfig.partnerKey,
    receiver_account: bankId,  // Bank code: VCB, TCB, ACB, BIDV, CTG, MB, SHB, LPB
    request_id: orderId,
    amount: amount,
    content: content || `EcoSynTech_${orderId}`,
    return_url: process.env.SEPAY_RETURN_URL || 'http://localhost:3000/api/payment/sepay-return',
    cancel_url: process.env.SEPAY_CANCEL_URL || 'http://localhost:3000/api/payment/cancel',
    notify_url: process.env.SEPAY_NOTIFY_URL || 'http://localhost:3000/api/payment/sepay-ipn',
    request_time: timestamp,
    expire_time: (Date.now() + 15 * 60 * 1000).toString(),  // 15 minutes
  };
  
  // Generate checksum
  const checksumData = Object.keys(paymentData)
    .sort()
    .map(key => key + '=' + paymentData[key])
    .join('&');
  
  paymentData.checksum = crypto
    .createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');

  // Make request to SePay API
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(paymentData);
    
    const options = {
      hostname: sepayConfig.apiUrl.replace('https://', ''),
      port: 443,
      path: '/payment/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ error: 'PARSE_ERROR', message: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Verify SePay callbacksignature
 */
function verifySepayCallback(params) {
  const { checksum, ...data } = params;
  
  const checksumData = Object.keys(data)
    .sort()
    .map(key => key + '=' + data[key])
    .join('&');
  
  const expectedChecksum = crypto
    .createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');

  return checksum === expectedChecksum;
}

/**
 * Check payment status from SePay
 */
async function checkSepayStatus(requestId) {
  const timestamp = Date.now().toString();
  
  const checkData = {
    partner_id: sepayConfig.partnerId,
    partner_key: sepayConfig.partnerKey,
    request_id: requestId,
    request_time: timestamp
  };
  
  const checksumData = Object.keys(checkData)
    .sort()
    .map(key => key + '=' + checkData[key])
    .join('&');
  
  checkData.checksum = crypto
    .createHmac('sha256', sepayConfig.checksumKey)
    .update(checksumData)
    .digest('hex');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(checkData);
    
    const options = {
      hostname: sepayConfig.apiUrl.replace('https://', ''),
      port: 443,
      path: '/payment/check',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ error: 'PARSE_ERROR', message: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Get list of supported banks
 */
function getSupportedBanks() {
  return [
    { code: 'VCB', name: 'Vietcombank', logo: 'vcb.png' },
    { code: 'TCB', name: 'Techcombank', logo: 'tcb.png' },
    { code: 'ACB', name: 'ACB', logo: 'acb.png' },
    { code: 'BIDV', name: 'BIDV', logo: 'bidv.png' },
    { code: 'CTG', name: 'VietinBank', logo: 'ctg.png' },
    { code: 'MB', name: 'MB Bank', logo: 'mb.png' },
    { code: 'SHB', name: 'SHB', logo: 'shb.png' },
    { code: 'LPB', name: 'LienViet Post Bank', logo: 'lpb.png' }
  ];
}

class SepayService {
  async createPayment(orderId, plan) {
    const planPricing = {
      BASE: 0,
      PRO: 99000,
      PRO_MAX: 199000,
      PREMIUM: 299000
    };
    
    const amount = planPricing[plan] || 99000;
    const content = `EcoSynTech ${plan}`;
    
    // Default to Vietcombank
    const bankId = process.env.SEPAY_DEFAULT_BANK || 'VCB';
    
    return createSepayPayment(orderId, amount, content, bankId);
  }

  async checkStatus(orderId) {
    return checkSepayStatus(orderId);
  }

  handleCallback(params) {
    if (!verifySepayCallback(params)) {
      return { ok: false, error: 'INVALID_CHECKSUM' };
    }

    if (params.status === 'success') {
      return {
        ok: true,
        orderId: params.request_id,
        amount: params.amount,
        bankTransactionId: params.trans_id,
        message: 'Thanh toán thành công'
      };
    }

    return {
      ok: false,
      error: 'PAYMENT_PENDING',
      message: 'Chờ thanh toán'
    };
  }

  getBanks() {
    return getSupportedBanks();
  }
}

module.exports = {
  sepayConfig,
  createSepayPayment,
  verifySepayCallback,
  checkSepayStatus,
  getSupportedBanks,
  SepayService
};