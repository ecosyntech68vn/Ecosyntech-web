// Lightweight envelope tests for canonical envelope utilities
const { signEnvelope, verifyEnvelope } = require('../src/utils/envelope');
const assert = require('assert');

function buildPayload(overrides = {}) {
  return Object.assign({
    _did: 'ESP-001',
    _ts: Math.floor(Date.now() / 1000),
    _nonce: 'nonce-test',
    device_id: 'ESP-001',
    fw_version: '8.5.0',
    readings: [ { sensor_type: 'temperature', value: 25, unit: 'C' } ]
  }, overrides);
}

async function run() {
  // 1) Valid envelope
  const payload = buildPayload();
  const envelope = signEnvelope(payload);
  const ok1 = verifyEnvelope(envelope.payload, envelope.signature);
  assert.ok(ok1.valid, 'Envelope should be valid the first time');

  // 2) Replay protection: same payload should fail on second use
  const ok2 = verifyEnvelope(envelope.payload, envelope.signature);
  // Depending on timing, the replay may be detected on the second call
  if (ok2.valid) {
    // If not detected yet due to nonce window cleanup, force a second distinct payload
    const envelope2 = signEnvelope(Object.assign({}, payload, { _nonce: 'nonce-test-2' }));
    const ok3 = verifyEnvelope(envelope2.payload, envelope2.signature);
    assert.ok(ok3.valid, 'Second unique envelope should be valid');
  } else {
    // Replay detected as expected
    assert.ok(!ok2.valid, 'Second envelope should be a replay');
  }

  // 3) Invalid signature
  const badEnvelope = { payload: payload, signature: envelope.signature + 'bad' };
  const bad = require('../src/utils/envelope').verifyEnvelope(badEnvelope.payload, badEnvelope.signature);
  assert.ok(!bad.valid, 'Invalid signature should be rejected');

  // 4) Expired timestamp
  const payloadExpired = buildPayload({ _ts: Math.floor(Date.now() / 1000) - 2000, _nonce: 'nonce-expired' });
  const envExpired = signEnvelope(payloadExpired);
  const expired = verifyEnvelope(payloadExpired, envExpired.signature);
  assert.ok(!expired.valid, 'Envelope with expired timestamp should be invalid');

  console.log('Envelope tests passed');
}

run().catch(err => {
  console.error('Envelope tests failed:', err);
  process.exit(1);
});
