/**
 * MoMo Payment Integration
 * 
 * MoMo API: https://momo.vn
 * Reference: https://developers.momo.vn
 */

const crypto = require('crypto');
const https = require('https');

const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO1234567890',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  accessKey: process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/api/payment/momo-return',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/payment/momo-ipn'
};

async function sendToMoMo(endpoint, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: momoConfig.endpoint.replace('https://', ''),
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createMoMoPayment(orderId, amount, orderInfo) {
  const requestId = orderId + '_' + Date.now();
  const requestType = 'captureWallet';
  
  const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&ipAddr=127.0.0.1&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  
  const signature = crypto.createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');

  const data = JSON.stringify({
    partnerCode: momoConfig.partnerCode,
    partnerName: 'EcoSynTech',
    storeId: 'EcoSynTech_FarmOS',
    requestId,
    amount: amount.toString(),
    orderId,
    orderInfo,
    orderExpireTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    redirectUrl: momoConfig.redirectUrl,
    ipnUrl: momoConfig.ipnUrl,
    requestType,
    signature,
    lang: 'vi',
    autoCapture: true
  });

  return sendToMoMo('/v2/gateway/api/create', data);
}

async function verifyMoMoCallback(signature, params) {
  const rawData = `accessKey=${momoConfig.accessKey}&amount=${params.amount}&message=${params.message}&orderId=${params.orderId}&partnerCode=${momoConfig.partnerCode}&requestId=${params.requestId}&resultCode=${params.resultCode}&transId=${params.transId}`;
  
  const expectedSignature = crypto.createHmac('sha256', momoConfig.secretKey)
    .update(rawData)
    .digest('hex');

  return signature === expectedSignature;
}

class MoMoService {
  async createPayment(orderId, plan, amount) {
    const planPricing = {
      BASE: 0,
      PRO: 99000,
      PRO_MAX: 199000,
      PREMIUM: 299000
    };
    
    const price = planPricing[plan] || 99000;
    const orderInfo = `EcoSynTech ${plan}`;
    
    return createMoMoPayment(orderId, price, orderInfo);
  }

  async verifyCallback(signature, params) {
    return verifyMoMoCallback(signature, params);
  }
}

module.exports = {
  momoConfig,
  MoMoService,
  createMoMoPayment,
  verifyMoMoCallback
};