# EcoSynTech PCB v6.3 Final — Design Review Report
# vs Original Docx Requirements — Date: 2026-04-15
# ==============================================================

## SECTION 1: CRITICAL ISSUES FOUND (Must Fix)

### ✅ ALREADY CORRECT IN MY DESIGN
- ESP32-WROOM-32E (replaces deprecated -D) ✓
- GND_STAR single ground strategy ✓
- Surge protection order: Fuse → GDT → MOV → TVS → P-MOSFET ✓
- RC snubbers on relay contacts ✓
- Hardware watchdog TPL5010 ✓
- ADS1115 4-channel ADC ✓
- Conformal coating zones ✓
- 2-layer 200x150mm board ✓
- MicroSD SPI interface ✓
- Ferrite bead separation for ESP/analog ✓
- 7.62mm for relay connectors, 5.08mm for signal ✓
- Split power rails (+3V3_ESP, +3V3_ANA) ✓

### ❌ MISSING / WRONG IN MY DESIGN — CRITICAL FIXES NEEDED

#### 1.1 TWO MP1584 BUCK REGULATORS (Not LDO!)
**Original spec (B4):** Uses a SEPARATE MP1584 to generate +3V3_MAIN
- My design: Used LDO (AMS1117) ← WRONG! LDOs derate badly at high temp
- The spec explicitly calls this a "Derating fix" — 105°C rated LDO can fail
- Fix: Add SECOND MP1584EN-LF-Z for 12V→3.3V rail

#### 1.2 WRONG GPIO ASSIGNMENTS
**Original spec (B7):** Pin mapping is DIFFERENT from what I wrote

| Signal | My Design | Original Spec | Status |
|--------|-----------|---------------|--------|
| RELAY1_DRV | GPIO12 | GPIO26 | ❌ WRONG |
| RELAY2_DRV | GPIO13 | GPIO27 | ❌ WRONG |
| RELAY3_DRV | GPIO14 | GPIO25 | ❌ WRONG |
| RELAY4_DRV | GPIO15 | GPIO14 | ❌ WRONG |
| DHT22_RAW | GPIO4 | GPIO33 | ❌ WRONG |
| DS18B20_RAW | GPIO2 | GPIO32 | ❌ WRONG |
| WATCHDOG_KICK | GPIO16 | GPIO4 | ❌ WRONG |
| LED_WIFI | GPIO16 | GPIO16 | ✓ But active-HIGH in my design |
| LED_MQTT | GPIO17 | GPIO17 | ✓ But active-HIGH in my design |
| LED_ERROR | GPIO13 | GPIO13 | ✓ But active-HIGH in my design |
| VIN_SENSE | — | GPIO35 | ❌ MISSING |
| BOOT_OK | — | GPIO1 (via firmware) | ❌ MISSING |

**Fix:** Update all ESP32 GPIO assignments per spec B7

#### 1.3 WRONG LED POLARITY (Active-LOW required)
**Original spec (B17, C):** LEDs are active-LOW (current sinks to GND through GPIO)
- My design: Active-HIGH (GPIO → resistor → LED → GND) ← WRONG
- The spec says LEDs are "active-low" — GPIO pulls LOW to turn ON
- Fix: GPIO → 1.5kΩ resistor → LED anode, LED cathode → GPIO
  Or: GPIO → LED → 1.5kΩ resistor → GND (ESP32 sinks current when LOW)

#### 1.4 MISSING NETS
| Missing Net | Purpose | Original Section |
|-------------|---------|-----------------|
| +5V_SYS | After OR-ing diodes (USB + main) | B5 |
| +5V_RELAY_RAW | After 0.5Ω current limiting, before relay coils | B9 |
| SOIL_RAW | Direct connection to ADS_A3 (not scaled) | B12 |
| RELAY_EN | Hardware relay lockout (firmware-controlled) | B8 |
| BOOT_OK | Signal from ESP32 indicating boot complete | B8 |
| POWER_GOOD | Power stable indicator | B8 |
| WATCHDOG_RST | TPL5010 → EN_ESP (hardware reset) | B8 |

#### 1.5 MISSING RELAY POWER SECTION (B9)
**Original spec B9:** Relay coils get power through a dedicated path:
```
+5V_MAIN → R_RELAY_LIM (0.5Ω 1W 2512) → +5V_RELAY_RAW → C_RELAY_BULK (1000µF)
```
- My design: Relays connected directly to +5V_MAIN ← WRONG
- Without current limiting, relay inrush current can collapse the 5V rail
- Fix: Add 0.5Ω 1W resistor and 1000µF 16V bulk cap

#### 1.6 MISSING AUTO-RESET CIRCUIT (B8)
**Original spec B8:** CP2102 DTR/RTS → BC847 transistors → EN_ESP, BOOT_ESP
- My design: No auto-reset circuit for firmware programming ← MISSING
- Without this, manual button press needed to flash firmware
- Fix: Add Q_RST (BC847), Q_BOOT (BC847), R_DTR (1k), R_RTS (1k)

#### 1.7 MISSING TVS ON SIGNAL LINES
**Original spec (B10-B16):** TVS SMBJ5.0A on all external signal lines:
- DHT22: SMBJ5.0A on DATA pin
- DS18B20: SMBJ5.0A on DATA pin
- SOIL: SMBJ5.0A on signal pin
- All analog inputs: SMBJ5.0A each
- I2C bus: SMBJ5.0A on SDA and SCL

#### 1.8 MISSING BAT54S CLAMPING DIODE (B13)
**Original spec (B13):** BAT54S dual Schottky on VIN_SENSE_RAW
- Protects GPIO35 from overvoltage when ESP32 is off

#### 1.9 WRONG CAPACITOR VALUES FOR RELAY BULK (B9)
**Original spec (B9):** C_RELAY_BULK = 1000µF 16V Low-ESR 105°C
- My design: Missing entirely ← MUST ADD
- Required because 4 relays switching simultaneously draw ~1A peak

#### 1.10 MISSING C_BST CAPACITORS (B3, B4)
**Original spec:** Bootstrap capacitors on MP1584 BST pins:
- C_BST_5V = 100nF 25V X7R 0603 between BST and SW
- C_BST_3V3 = 100nF 25V X7R 0603 between BST and SW

#### 1.11 MISSING BAT54S ON WATCHDOG RESET PATH (B8)
**Original spec:** D_RST (BAT54S) between WATCHDOG_RST and EN_ESP
- Prevents conflict when manual reset button is pressed

#### 1.12 WRONG PULL-UP VALUE FOR I2C (B7, B15)
**Original spec:** I2C pull-ups should be to +3V3_ANA, not +3V3_ESP
- Analog rail is cleaner for sensor I2C bus

#### 1.13 MISSING SERIES RESISTORS ON DHT22/DS18B20 (B7)
**Original spec:** 100Ω series resistor on DHT22_RAW (GPIO33)
**Original spec:** 100Ω series resistor on DS18B20_RAW (GPIO32)
- My design: Missing ← ADD

#### 1.14 MISSING 22Ω SERIES ON I2C BUS (B15)
**Original spec:** 22Ω series resistor on I2C_SCL and I2C_SDA
- Protects against latch-up and reduces ringing

#### 1.15 MISSING 22Ω SERIES ON MICROSD (B16)
**Original spec:** 22Ω series on MOSI, MISO, SCK, CS

#### 1.16 WRONG CONVERTER FOR USB POWER PATH (B5)
**Original spec:** OR-ing using TWO Schottky SS34 diodes
- D_USB: USB_5V_FUSED → +5V_SYS (cathode)
- D_MAIN: +5V_MAIN → +5V_SYS (cathode)
- My design: Missing +5V_SYS and OR-ing diodes ← ADD

#### 1.17 WRONG LED RESISTOR VALUE (B17)
**Original spec:** LED resistors = 1.5kΩ (not 470Ω)
- ESP32 GPIO sources limited current in active-LOW config

#### 1.18 MISSING BAT54S DIODE ON WATCHDOG RESET (B8)
**Original spec:** D_RST (BAT54S) in series with WATCHDOG_RST path to EN_ESP
- Prevents voltage conflict between TPL5010 and manual reset

---

## SECTION 2: LAYOUT ISSUES

### ❌ MISSING PCB FEATURES

| Issue | Original Spec | Fix |
|-------|--------------|-----|
| Via stitching along relay isolation slot | D3: "VIA Stitching dọc slot cách ly" | ADD stitching vias |
| Thermal vias under MP1584 | D6: "vùng copper tản nhiệt rộng + via nhiệt" | ADD thermal vias |
| 2 oz copper on bottom under relay zone | H1: "ưu tiên 2 oz mặt dưới vùng Relay" | Specify in fab notes |
| 6-8mm clearance for relay slot | D3: "clearance 6–8mm" | My design has 3mm ← TOO NARROW |
| Ferrite bead on I2C pull-ups (to +3V3_ANA) | B7: Pull-ups to +3V3_ANA | Fix pull-up rail |
| Antenna keepout | D3: Must be clear | Verify and mark |
| Test points | B17: +12V_PROTECTED, +5V_SYS, +3V3_ESP, +3V3_ANA, GND_STAR, UART, EN, BOOT, I2C, WATCHDOG, POWER_GOOD, RELAY_EN, BOOT_OK | Add all missing test points |

---

## SECTION 3: SILKSCREEN ISSUES

### ❌ MISSING REQUIRED SILKSCREEN LABELS

Per spec Section E, these are MANDATORY:
- [ ] "EcoSynTech V6.3 Industrial Pro" (my design: "EcoSynTech PCB v6.3 Final")
- [ ] "F1 (2A Slow)" — near fuse
- [ ] "TVS1" — near TVS diode
- [ ] "MOV1" — near varistor
- [ ] "GDT1" — near GDT
- [ ] "CAUTION: HIGH VOLTAGE 220VAC ONLY" (relay area)
- [ ] "THAY ĐÚNG GIÁ TRỊ CẦU CHÌ. KIỂM TRA CỰC TÍNH TRƯỚC KHI CẤP NGUỒN."
- [ ] "BATTERY / VIN (12-24V)" — near battery terminal
- [ ] "BOOT" — near boot pin
- [ ] "RESET" — near reset pin
- [ ] Relay pinout: COM / NO / NC with arrow diagram

---

## SECTION 4: BOM ISSUES

### ❌ WRONG/MISSING COMPONENTS

| My BOM | Should Be | Original Spec |
|--------|-----------|---------------|
| AMS1117-3.3 (LDO) | MP1584EN-LF-Z (second) | B4 |
| (Missing) | 0.5Ω 1W 2512 resistor | B9 |
| (Missing) | 1000µF 16V Low-ESR 105°C cap | B9 |
| (Missing) | 2× BC847 SOT-23 (auto-reset) | B8 |
| (Missing) | 2× BAT54S SOT-23 (reset clamp, VIN sense) | B8, B13 |
| (Missing) | 6× TVS SMBJ5.0A (signal lines) | B10-B15 |
| (Missing) | C_BST_5V, C_BST_3V3 (100nF 0603) | B3, B4 |
| (Missing) | 2× Schottky SS34 (OR-ing diodes) | B5 |
| 470Ω LED resistors | 1.5kΩ LED resistors | B17 |
| +3V3_ESP pull-ups | Pull-ups to +3V3_ANA | B7 |
| (Missing) | 22Ω × 7 (I2C + SD series) | B15, B16 |
| (Missing) | 100Ω × 2 (DHT/DS series) | B7 |
| (Missing) | Ferrite bead BLM18PG121SN1 × 2 | B6 |
| 1 oz copper | 2 oz copper bottom (relay zone) | H1 |

---

## SECTION 5: FABRICATION ISSUES

| Issue | Original Spec | Status |
|-------|--------------|--------|
| ENIG surface finish | "ENIG bắt buộc" | ❌ I specified HASL |
| 2 oz copper bottom relay zone | "ưu tiên 2 oz mặt dưới vùng Relay" | ❌ I specified 1 oz |
| FR-4 Tg ≥130°C | D1: "Tg ≥ 130°C" | ✓ OK |
| Flying probe 100% | H1: "test flying probe 100%" | Add to fab notes |

---

## SECTION 6: WATER/DUST/MOISTURE PROTECTION REVIEW
### For ABS Enclosure + Conformal Coating + Desiccant

### ✅ Already covered in my design:
- Conformal coating zones (exclude connectors) ✓
- TVS and ESD protection on all external connectors ✓
- Wide temperature rated caps (105°C) ✓
- FR-4 Tg ≥130°C ✓

### ⚠️ RECOMMENDATIONS FOR ABS ENCLOSURE + DESICCANT

Given your plan: ABS plastic enclosure + conformal coating + desiccant packs + waterproofing reinforcement

1. **Enclosure Entry Points** — All cable penetrations should use:
   - Waterproof cable glands (IP67 rated)
   - Silicone gaskets around perimeter
   - Epoxy potting of connector back-fill

2. **Board-Level Protection** — Already designed:
   - Conformal coating on all SMD components
   - Exclude zones: connectors, SD slot, USB, boot/reset buttons, test points
   - Exclude ESP32 antenna area for heat/moisture escape

3. **Desiccant Integration**:
   - Place 5g desiccant pack inside enclosure
   - Use moisture indicator card (blue gel)
   - Seal enclosure with silicone gasket

4. **Conformal Coating Thickness**:
   - Original spec: 50–70µm acrylic
   - For outdoor with ABS: Consider 80–100µm for extra protection
   - UV inspection required per spec

5. **USB Connector**:
   - Use waterproof USB cover when not in use
   - Consider IP67 USB connector with gasket

6. **Additional Recommendations for Outdoor Use** (beyond spec):
   - Add silicone conformal coating on bottom (between board and enclosure mounting)
   - Use Gore-Tex vent membrane (e.g., eVent) to equalize pressure without moisture ingress
   - Add epoxy bead around all through-hole solder joints on bottom

7. **Power Entry**:
   - Use cable gland with strain relief
   - Apply silicone sealant around wire entry point

8. **UV Protection**:
   - ABS enclosures degrade under UV — add UV stabilizer or paint with UV-resistant coating
   - Or use polycarbonate (PC) enclosure instead of ABS for outdoor

---

## SECTION 7: CORRECTED DESIGN — SUMMARY OF FIXES NEEDED

### 7.1 Replace LDO with Second MP1584
- Add U3_3V3 (MP1584EN-LF-Z) for +3V3_MAIN
- Add CIN_3V31, CIN_3V32, L_3V3, COUT_3V31, COUT_3V32, COUT_3V33
- Add R_FB1_3V3, R_FB2_3V3, R_EN_3V3, C_BST_3V3
- Add SW_3V3, FB_3V3, EN_3V3, BST_3V3 nets

### 7.2 Add Ferrite Beads for Rail Splitting
- FB_ESP (BLM18PG121SN1) between +3V3_MAIN and +3V3_ESP
- FB_ANA (BLM18PG121SN1) between +3V3_MAIN and +3V3_ANA
- Capacitors on each side of ferrite beads

### 7.3 Add OR-ing Diodes (+5V_SYS)
- D_USB (SS34) cathode → +5V_SYS
- D_MAIN (SS34) cathode → +5V_SYS
- C_SYS1 (47µF), C_SYS2 (100nF) on +5V_SYS

### 7.4 Add Relay Power Limiting
- R_RELAY_LIM (0.5Ω 1W 2512) between +5V_MAIN and +5V_RELAY_RAW
- C_RELAY_BULK (1000µF 16V Low-ESR) on +5V_RELAY_RAW
- TVS SMBJ5.0A on +5V_RELAY_RAW → GND

### 7.5 Fix ESP32 GPIO Assignments
- RELAY1_DRV → GPIO26
- RELAY2_DRV → GPIO27
- RELAY3_DRV → GPIO25
- RELAY4_DRV → GPIO14
- DHT22_DATA → GPIO33 (via 100Ω series)
- DS18B20_DATA → GPIO32 (via 100Ω series)
- WATCHDOG_KICK → GPIO4
- VIN_SENSE_RAW → GPIO35
- LED_WIFI → GPIO16 (active-LOW)
- LED_MQTT → GPIO17 (active-LOW)
- LED_ERROR → GPIO13 (active-LOW)

### 7.6 Change LED Circuit to Active-LOW
- Remove R_LED_PWR from GPIO → LED → GND path
- New circuit: GPIO → 1.5kΩ → LED → GPIO (or GPIO sinks to GND through LED + resistor)

### 7.7 Add Auto-Reset Circuit
- Q_RST (BC847): B from DTR_USB via 1k → C to EN_ESP → E to GND
- Q_BOOT (BC847): B from RTS_USB via 1k → C to BOOT_ESP → E to GND

### 7.8 Add TVS on All Signal Lines
- 1× SMBJ5.0A on DHT22 data line
- 1× SMBJ5.0A on DS18B20 data line
- 1× SMBJ5.0A on SOIL signal
- 4× SMBJ5.0A on ADS1115 A0-A3 inputs
- 2× SMBJ5.0A on I2C SDA/SCL

### 7.9 Add BAT54S Diodes
- D_RST (BAT54S) in WATCHDOG_RST → EN_ESP path
- D_VSENSE_CLAMP (BAT54S) on VIN_SENSE_RAW → GPIO35

### 7.10 Add Missing Resistors
- 100Ω series on DHT22_RAW (GPIO33)
- 100Ω series on DS18B20_RAW (GPIO32)
- 22Ω series on I2C_SCL, I2C_SDA
- 22Ω series on SD_MOSI, SD_MISO, SD_SCK, SD_CS
- Change LED resistors from 470Ω to 1.5kΩ

### 7.11 Change I2C Pull-ups to +3V3_ANA
- All I2C pull-ups should go to +3V3_ANA (not +3V3_ESP)

### 7.12 Fix PCB Layout
- Increase relay isolation slot to 6-8mm (currently 3mm)
- Add thermal vias under MP1584 packages
- Add via stitching along relay isolation slot
- Add all missing test points (POWER_GOOD, RELAY_EN, BOOT_OK, etc.)
- Add all missing silkscreen labels

### 7.13 Fix Fabrication Specifications
- Change surface finish to ENIG (mandatory per spec)
- Add note for 2 oz copper bottom under relay zone
- Add flying probe 100% test requirement

---

## SECTION 8: OVERALL VERDICT

### Score: 6/10 — Needs significant corrections before production

| Category | Score | Issues |
|----------|-------|--------|
| Power architecture | 5/10 | LDO instead of 2nd buck, missing relay power limiting |
| GPIO assignments | 2/10 | Almost all GPIO pins are wrong |
| Signal protection | 5/10 | Missing TVS on sensor lines |
| Relay driver circuit | 4/10 | Missing bulk cap, TVS, current limiting |
| LED circuit | 2/10 | Wrong polarity (active-HIGH vs active-LOW) |
| Auto-reset circuit | 0/10 | Completely missing |
| Layout | 6/10 | Slot too narrow, missing thermal vias |
| Silkscreen | 3/10 | Missing most mandatory labels |
| BOM | 5/10 | Missing ~15 critical components |
| DFM for outdoor | 6/10 | Good overall but surface finish wrong |
| Expandability | 8/10 | MCP23017 expansion is solid |
| Conformal coating | 7/10 | Exclude zones defined, but need thicker coat for outdoor |
| Moisture/dust/water | 7/10 | Board design OK, enclosure + desiccant plan needed |

### PRIORITY ORDER FOR FIXES:
1. 🔴 CRITICAL: Fix ESP32 GPIO assignments (B7)
2. 🔴 CRITICAL: Replace LDO with 2nd MP1584 buck (B4)
3. 🔴 CRITICAL: Add relay power limiting (R_RELAY_LIM + C_RELAY_BULK) (B9)
4. 🔴 CRITICAL: Fix LED polarity to active-LOW (C)
5. 🔴 CRITICAL: Add auto-reset circuit (B8)
6. 🟡 IMPORTANT: Add missing TVS diodes on all sensor lines (B10-B16)
7. 🟡 IMPORTANT: Add OR-ing diodes and +5V_SYS (B5)
8. 🟡 IMPORTANT: Add BAT54S clamping diodes (B8, B13)
9. 🟡 IMPORTANT: Fix PCB slot to 6-8mm (D3)
10. 🟡 IMPORTANT: Add all missing BOM items
11. 🟢 RECOMMENDED: Fix silkscreen labels (E)
12. 🟢 RECOMMENDED: Change to ENIG finish
