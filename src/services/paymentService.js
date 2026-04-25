/**
 * VNPay Payment Integration
 * 
 * VNPay API: https://sandbox.vnpayment.vn/apis/vnpay
 * Reference: https://sandbox.vnpayment.vn/kingdomcomedemo/widget?token=abc126c9d65e4e5888dad6c55a61e34f
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const config = {
  vnp_TmnCode: process.env.VNPAY_TMNCODE || 'ECOSYN02',  // Terminal ID
  vnp_HashSecret: process.env.VNP_HASH_SECRET || '',      // Secret key
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/payv2/vpcpay.html',
  vnp_Api: process.env.VNPAY_API || 'https://sandbox.vnpayment.vn/apis/vnpay',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payment/return',
  vnp_Command: 'pay',
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
  vnp_Version: '2.1.0'
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function createPaymentUrl(orderId, amount, orderInfo) {
  const date = new Date();
  const vnp_CreateDate = date.getFullYear().toString() +
    ((date.getMonth() + 1).toString().padStart(2, '0')) +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    date.getSeconds().toString().padStart(2, '0');

  const vnp_ExpireDate = new Date(date.getTime() + 15 * 60 * 1000);
  const vnp_Expire = vnp_ExpireDate.getFullYear().toString() +
    ((vnp_ExpireDate.getMonth() + 1).toString().padStart(2, '0')) +
    vnp_ExpireDate.getDate().toString().padStart(2, '0') +
    vnp_ExpireDate.getHours().toString().padStart(2, '0') +
    vnp_ExpireDate.getMinutes().toString().padStart(2, '0') +
    vnp_ExpireDate.getSeconds().toString().padStart(2, '0');

  const params = {
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: amount * 100,  // VND * 100
    vnp_Command: config.vnp_Command,
    vnp_CreateDate: vnp_CreateDate,
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_ExpireDate: vnp_Expire,
    vnp_IpAddr: '127.0.0.1',
    vnp_Locale: config.vnp_Locale,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_TxnRef: orderId,
    vnp_Version: config.vnp_Version
  };

  // Sort and create hash data
  const sortedKeys = Object.keys(params).sort();
  const hashData = sortedKeys.reduce((acc, key) => {
    return acc + (acc ? '&' : '') + key + '=' + params[key];
  }, '');

  // Create secure hash
  const vnp_SecureHash = md5(hashData + config.vnp_HashSecret);

  // Build URL
  const paymentUrl = config.vnp_Url + '?' + 
    querystring.stringify({ ...params, vnp_SecureHash });

  return {
    paymentUrl,
    orderId,
    amount,
    expireTime: vnp_ExpireDate.toISOString()
  };
}

function verifyCallback(vnp_SecureHashType, vnp_SecureHash, params) {
  // Remove vnp_SecureHash and vnp_SecureHashType from params
  const verifyParams = { ...params };
  delete verifyParams.vnp_SecureHashType;
  delete verifyParams.vnp_SecureHash;

  // Sort and create hash data
  const sortedKeys = Object.keys(verifyParams).sort();
  const hashData = sortedKeys.reduce((acc, key) => {
    return acc + (acc ? '&' : '') + key + '=' + (verifyParams[key] || '');
  }, '');

  // Create secure hash
  const mySecureHash = md5(hashData + config.vnp_HashSecret);

  return mySecureHash === vnp_SecureHash;
}

async function queryTransaction(transactionId) {
  const date = new Date();
  const vnp_CreateDate = date.getFullYear().toString() +
    ((date.getMonth() + 1).toString().padStart(2, '0')) +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    date.getSeconds().toString().padStart(2, '0');

  const params = {
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Command: 'querydr',
    vnp_Version: config.vnp_Version,
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_IpAddr: '127.0.0.1',
    vnp_OrderInfo: 'Query transaction ' + transactionId,
    vnp_TransRef: transactionId,
    vnp_TransactionNo: '',
    vnp_CreateDate: vnp_CreateDate
  };

  const sortedKeys = Object.keys(params).sort();
  const hashData = sortedKeys.reduce((acc, key) => {
    return acc + (acc ? '&' : '') + key + '=' + params[key];
  }, '');

  const vnp_SecureHash = md5(hashData + config.vnp_HashSecret);
  params.vnp_SecureHash = vnp_SecureHash;

  return new Promise((resolve, reject) => {
    const data = querystring.stringify(params);
    
    const options = {
      hostname: config.vnp_Api.replace('https://', ''),
      port: 443,
      path: '/apis/payment/querydr',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function handleReturn(params) {
  const vnp_ResponseCode = params.vnp_ResponseCode;
  const vnp_TxnRef = params.vnp_TxnRef;
  const vnp_Amount = params.vnp_Amount / 100;
  const vnp_TransactionNo = params.vnp_TransactionNo;
  
  const isValid = verifyCallback(
    params.vnp_SecureHashType,
    params.vnp_SecureHash,
    params
  );

  if (!isValid) {
    return {
      ok: false,
      error: 'INVALID_SIGNATURE'
    };
  }

  if (vnp_ResponseCode === '00') {
    // Transaction successful
    return {
      ok: true,
      transactionId: vnp_TxnRef,
      amount: vnp_Amount,
      bankTransactionId: vnp_TransactionNo,
      message: 'Thanh toán thành công'
    };
  } else {
    // Transaction failed
    return {
      ok: false,
      error: 'PAYMENT_FAILED',
      code: vnp_ResponseCode,
      message: 'Thanh toán thất bại'
    };
  }
}

class PaymentService {
  async createPayment(orderId, plan, userId) {
    const planPricing = {
      BASE: 0,
      PRO: 99000,
      PRO_MAX: 199000,
      PREMIUM: 299000
    };
    
    const amount = planPricing[plan] || 99000;
    const orderInfo = `EcoSynTech ${plan} - User: ${userId}`;
    
    return createPaymentUrl(orderId, amount, orderInfo);
  }

  handleCallback(params) {
    return handleReturn(params);
  }

  async queryTransaction(transactionId) {
    return queryTransaction(transactionId);
  }
}

module.exports = {
  config,
  createPaymentUrl,
  verifyCallback,
  queryTransaction,
  handleReturn,
  PaymentService
};