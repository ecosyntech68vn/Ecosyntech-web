// Phase 9 migration test: ensure phase9_sensor_schema is applied
const { initDatabase, closeDatabase, getOne } = require('../../src/config/database');

describe('Phase 9 Migration', () => {
  beforeAll(async () => {
    // Reinitialize DB to trigger migrations
    try { await closeDatabase(); } catch (e) { /* ignore */ }
    await initDatabase();
  });

  afterAll(async () => {
    try { await closeDatabase(); } catch (e) { /* ignore */ }
  });

  test('phase9_sensor_schema applied', async () => {
    const mig = await (async () => {
      return getOne('SELECT name FROM migrations WHERE name = ?', ['phase9_sensor_schema']);
    })();
    expect(mig).not.toBeNull();
    expect(mig.name).toBe('phase9_sensor_schema');
  });
});
