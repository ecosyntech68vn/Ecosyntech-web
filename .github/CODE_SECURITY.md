# Secure Coding Guidelines

## Mục tiêu
Tuân thủ ISO 27001 A.8.3 - Phát triển hệ thống an toàn

## 1. INPUT VALIDATION

### ✅ ALWAYS validate
```javascript
// ❌ NGUY HIỂM - SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ AN TOÀN - Parameterized
db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

### ✅ Type checking
```javascript
// Validate types
if (typeof id !== 'string' || id.length > 36) {
  return res.status(400).json({ error: 'Invalid input' });
}
```

## 2. AUTHENTICATION

### ✅ Password storage
```javascript
// ✅ Dùng bcrypt với cost ≥ 10
const hash = await bcrypt.hash(password, 12);
```

### ✅ JWT generation
```javascript
// ✅ Include expiration
jwt.sign(payload, secret, { expiresIn: '1h' });
```

### ✅ Never hardcode secrets
```javascript
// ❌ NGUY HIỂM
const API_KEY = 'my-secret-key';

// ✅ AN TOÀN
const API_KEY = process.env.API_KEY;
```

## 3. ERROR HANDLING

### ✅ Don't expose stack traces
```javascript
// ❌ NGUY HIỂM - Production
res.status(500).json({ error: err.stack });

// ✅ AN TOÀN
if (process.env.NODE_ENV === 'production') {
  res.status(500).json({ error: 'Internal server error' });
} else {
  res.status(500).json({ error: err.message });
}
```

## 4. CRYPTOGRAPHY

### ✅ Use strong algorithms
```javascript
// ✅ TLS 1.2+
const https = require('https');

// ✅ AES-256-GCM for encryption
crypto.createCipheriv('aes-256-gcm', key, iv);

// ❌ KHÔNG DÙNG
crypto.createCipher('aes-128-cbc'); // Yếu
MD5.hash(data); // Lỗ thời gian
SHA1.hash(data); // Lỗ thời gian
```

## 5. SESSION MANAGEMENT

### ✅ Secure sessions
```javascript
// ✅ Set secure cookie options
res.cookie('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 60 * 1000 // 30 min
});
```

## 6. RATE LIMITING

### ✅ Always use rate limiting
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // limit each IP
});
app.use('/api/', limiter);
```

## 7. LOGGING

### ✅ Don't log sensitive data
```javascript
// ❌ NGUY HIỂM
logger.info(`User login: ${email} ${password}`);

// ✅ AN TOÀN
logger.info(`User login attempt: ${email}`);
```

## 8. FILE UPLOADS

### ✅ Validate file types
```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
```

## 9. DEPENDENCIES

### ✅ Keep updated
```bash
# Check vulnerabilities
npm audit

# Update regularly
npm update
```

## 10. CODE REVIEW CHECKLIST

- [ ] Input validated?
- [ ] SQL parameterized?
- [ ] No hardcoded secrets?
- [ ] Errors handled safely?
- [ ] Sensitive data logged?
- [ ] Rate limited?
- [ ] Auth required?
- [ ] HTTPS enforced?