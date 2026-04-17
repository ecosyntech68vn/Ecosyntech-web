---
name: iot-debug
description: "Debug IoT device issues and ESP32 connectivity"
user-invocable: true
agent: explore
---

# IoT Debug Skill for EcoSynTech-web

Debug ESP32 devices and IoT sensor connectivity issues.

## 1. Device Status
- List all registered devices
- Check device types (ESP32, sensors)
- Verify device configuration

## 2. MQTT Debug
- Check MQTT message flow
- Verify topic subscriptions
- Test message publish/subscribe
- Check MQTT authentication

## 3. Sensor Data
- Check latest sensor readings
- Verify DHT22 temperature/humidity
- Verify DS18B20 temperature
- Verify soil moisture readings

## 4. Webhook Debug
- Test webhook endpoints
- Verify payload signature
- Check webhook logs

## 5. ESP32 Issues
Common ESP32 problems:
- WiFi connection failure
- MQTT broker connection
- Deep sleep wake issues
- ADC reading errors

Execute diagnostics:

```bash
# Check MQTT topics
mosquitto_sub -t 'ecosyntech/#' -v

# Test webhook
curl -X POST http://localhost:3000/api/v1/webhook/esp32 \
  -H "Content-Type: application/json" \
  -H "X-Signature: test" \
  -d '{"device_id":"test","data":{"temp":25}}'

# Check device API
curl http://localhost:3000/api/v1/devices
```

Provide diagnostic report:

```
## IoT Debug Report

### Devices
- Total: X
- Online: X
- Offline: X

### MQTT
- Broker: CONNECTED/DISCONNECTED
- Messages/min: X

### Sensors
- DHT22: OK/FAIL (last reading: X)
- DS18B20: OK/FAIL (last reading: X)
- Soil: OK/FAIL (last reading: X)

### Webhooks
- Last successful: timestamp
- Last failed: timestamp

### Recommended Actions
```