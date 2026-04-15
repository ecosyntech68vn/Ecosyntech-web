# EcoSynTech PCB v6.3 Final — PCB Layout Guide
# ==============================================================
# 2-Layer 200mm x 150mm | ESP32-WROOM-32E | Expandable
# ==============================================================

## BOARD OUTLINE & MECHANICAL

Board dimensions: 200.0 mm x 150.0 mm
Board thickness: 1.6 mm
Min routing width: 0.25 mm (signal), 0.6 mm (power), 1.0 mm (heavy power)
Min clearance: 0.2 mm (default), 0.4 mm (high voltage)
Corner routing: 45-degree chamfer recommended
Fiducials: 3x3mm cross fiducials at corners (Top side)

Mounting holes: 4x M3 holes at corners
  - Hole 1: (5.0, 5.0) mm from top-left corner
  - Hole 2: (195.0, 5.0) mm from top-right corner
  - Hole 3: (5.0, 145.0) mm from bottom-left corner
  - Hole 4: (195.0, 145.0) mm from bottom-right corner
  - Drill diameter: 3.2 mm (M3 clearance)
  - Annular ring: 1.5 mm minimum

Board edge keep-out: 0.5 mm from board edge for all traces
Silkscreen margin: 0.2 mm from board edge

## LAYER STACK-UP

Layer 1 (F.Cu - Top): Signal routing + Components + Silkscreen
Layer 2 (B.Cu - Bottom): Primary ground plane + Power planes + Heavy routing

## ZONE PARTITIONING STRATEGY

### Zone 1 — POWER INPUT (Top-left area, ~40x50mm)
Located at: X: 5–45 mm, Y: 5–55 mm
Components: TB1, F1, GDT1, MOV1, R_SURGE1, L_SURGE1, D_TVS1, Q_PROTECT, R_G1, R_G2, DZ_G1, C1, C2, C3
Purpose: Surge protection, reverse-polarity protection, bulk decoupling
Keep-out: No components from other zones within 10mm
Trace classes: +12V_IN, +12V_FUSED, +12V_SURGE, +12V_PROTECTED (HighVoltage netclass)
Ground connection: Via to GND_STAR plane near C1 negative terminal

### Zone 2 — BUCK REGULATOR 12V→5V (Top-left, adjacent to Zone 1)
Located at: X: 50–100 mm, Y: 5–50 mm
Components: U2_5V, CIN_5V1, CIN_5V2, L_5V, COUT_5V1, COUT_5V2, COUT_5V3, R_FB1_5V, R_FB2_5V, R_EN_5V, D_OUT5V
Purpose: Convert 12V to stable 5V rail
Separation from Zone 1: 3mm minimum gap
Trace classes: SW_5V, +5V_MAIN (Power netclass)
Ground: Solid copper pour on bottom connecting CIN and COUT grounds

### Zone 3 — LDO REGULATORS 5V→3.3V (Center-top)
Located at: X: 105–145 mm, Y: 5–50 mm
Components: U_3V3_ESP, U_3V3_ANA, C_3V3_ESP1, C_3V3_ESP2, C_3V3_ANA1, C_3V3_ANA2, C_3V3_ANA3
Purpose: Split 3.3V rails — one for ESP32, one for analog sensors
Critical: Physical separation between analog and digital LDO outputs
Trace classes: +3V3_ESP, +3V3_ANA (Power netclass)

### Zone 4 — ESP32 MODULE + MEMORY (Center)
Located at: X: 50–145 mm, Y: 55–115 mm
Components: U_ESP32, C_ESP_DEC1, C_ESP_DEC2, C_ESP_DEC3, R_EN_PU, R_BOOT_PU, R_GPIO0_PD, U_SDCARD, C_SD_DEC1, R_SD_CS, R_SD_MOSI_PU, R_SD_MISO_PU, R_SD_DET_PU, U_WD, R_WD_DONE_PU, C_WD_FILT, R_WD_WAKE, J_WD_DQ
Purpose: Core MCU, flash storage, hardware watchdog
Keep-out RF: 15mm radius around antenna area (if module has on-board antenna)
Ground: Solid GND pour on bottom directly under ESP32 module

### Zone 5 — STATUS LEDs (Top-center, near ESP32)
Located at: X: 150–190 mm, Y: 55–75 mm
Components: LED_POWER, R_LED_PWR, LED_WIFI, R_LED_WIFI, LED_MQTT, R_LED_MQTT, LED_ERROR, R_LED_ERR
Purpose: Visual status indicators on enclosure panel
Silkscreen labels: "PWR", "WIFI", "MQTT", "ERR"

### Zone 6 — USB-UART (Top-right)
Located at: X: 155–195 mm, Y: 5–45 mm
Components: U_USB_UART, C_USB_DEC1, C_USB_DEC2, R_USB_PU_D+, R_USB_PU_D-, J_USB, F_USB, D_USB_OVP, C_USB_Bulk
Purpose: Firmware loading and debug interface
Keep-out: 3mm from board edge for USB connector
Trace classes: UART0_TX, UART0_RX (default), USB_5V

### Zone 7 — ADS1115 + ANALOG SENSOR INTERFACE (Center-right)
Located at: X: 150–195 mm, Y: 55–110 mm
Components: U_ADS1115, C_ADS_VDD, C_ADS_VDD2, R_ADS_SCL_PU, R_ADS_SDA_PU
Purpose: 4-channel precision ADC for pH, TDS, DO, VIN sense
Critical: Analog ground (GND_STAR) only, no digital switching noise
Input connectors: J_ANALOG_IN (5.08mm header)
Divider networks: R_VIN_DIV1/R_VIN_DIV2, R_PH_DIV1/R_PH_DIV2, etc.
Filter caps: C_VIN_FILT, C_PH_FILT, C_TDS_FILT, C_DO_FILT

### Zone 8 — CORE SENSORS (Center-right, below ADS1115)
Located at: X: 150–195 mm, Y: 115–145 mm
Components: U_DHT22, R_DHT_PU, U_DS18B20, R_DS18B20_PU, J_SOIL, R_SOIL_DIV1, R_SOIL_DIV2, C_SOIL_FILT
Purpose: Temperature, humidity, soil moisture sensors
Connector: J_DS18B20_EXT for external DS18B20
Trace classes: DHT22_DATA, DS18B20_DATA, SOIL_RAW

### Zone 9 — I2C EXPANSION BUS (Bottom-right)
Located at: X: 155–195 mm, Y: 120–145 mm
Components: J_I2C_EXP, R_I2C_SCL_PU, R_I2C_SDA_PU, U_BME280 (optional), U_OLED (optional)
Purpose: I2C peripherals — BME280, OLED, external sensors
Connector: J_I2C_EXT (5.08mm header)
Trace classes: I2C_SCL, I2C_SDA (default)

### Zone 10 — 4 RELAYS (Bottom-left, physically isolated)
Located at: X: 5–95 mm, Y: 95–145 mm
Components: Q_RLY1-4, R_RLY1_BASE-4, D_RLY1_FW/RV-4, RELAY1-4, R_RLY1_SNUB-4, C_RLY1_SNUB-4
Purpose: 4 relay drivers for controlling external loads
Isolation slot: 3mm routed slot between relay zone and digital zone
Output connectors: J_RELAY_OUT1-4 (7.62mm headers, 3P each)
Clearance from digital: Minimum 5mm to prevent EMI coupling
Trace classes: RELAY1_DRV..RELAY4_DRV (default), +5V_MAIN (Power)

### Zone 11 — IO EXPANDERS + EXPANSION RELAYS (Bottom-center)
Located at: X: 100–155 mm, Y: 95–145 mm
Components: U_EXP1, U_EXP2, C_EXP1_DEC1-2, C_EXP2_DEC1-2
Purpose: MCP23017 IO expanders for adding 4+ relays and sensors
Expansion connectors: J_EXP_HEADER (2x5 5.08mm), J_PWR_EXT (7.62mm)
Trace classes: EXP1_GPIO0-7, EXP2_GPIO0-7, I2C_SCL, I2C_SDA

### Zone 12 — EXTERNAL CONNECTORS (Right edge)
Located at: X: 195–200 mm, Y: 5–145 mm (0.5mm strip)
Components: J_USB, J_RELAY_OUT1-4, J_DS18B20_EXT, J_ANALOG_IN, J_I2C_EXT, J_UART_EXT, J_EXP_HEADER, J_PWR_EXT
Purpose: All field-wiring connections
Pitch: 5.08mm for signal, 7.62mm for relay and power outputs
Keep-out from edge: 0.2mm for silkscreen

## COMPONENT PLACEMENT PRIORITY

### Tier 1 — Critical placement (do first)
1. ESP32 module: Center-top area, antenna at top-right or top-left (no metal below antenna)
2. Buck regulator: Near power input, away from sensitive analog
3. Power input protection: At the entry point
4. Ground pour: Establish GND_STAR plane on bottom layer first

### Tier 2 — High priority
5. USB connector: At board edge for firmware loading
6. ADS1115: Near analog inputs, away from switching noise
7. MicroSD socket: Near ESP32, accessible for prototyping

### Tier 3 — Medium priority
8. Status LEDs: Near board edge, visible from enclosure panel
9. Relay modules: Physically isolated, near output connectors
10. IO expanders: Near expansion headers

### Tier 4 — Lower priority
11. Core sensors (DHT22, DS18B20): Near sensor connectors
12. Watchdog: Near ESP32 reset/enable pins
13. I2C peripherals (BME280, OLED): Near I2C headers

## ROUTING STRATEGY

### Ground Routing (Bottom Layer)
1. Fill entire bottom layer with GND_STAR copper pour
2. Use thermal relief pads for all through-hole vias to ground
3. Place GND vias every 5mm in the ground pour
4. No routing under ESP32 module (use solid ground there)
5. Create isolation gap (3mm) between relay zone ground and digital zone ground

### Power Routing
1. Route +12V_IN on top layer, 1.5mm width, keep away from signals
2. Route +5V_MAIN on top layer, 1.0mm width, near buck regulator
3. Route +3V3_ESP on top layer, 0.6mm width, near LDO
4. Route +3V3_ANA on top layer, 0.6mm width, separate from digital
5. Use bottom layer for heavy power plane segments

### Signal Routing
1. I2C_SCL/SDA: Top layer, 0.25mm, keep away from switching nodes
2. SPI bus: Top layer, 0.25mm, length-matched within 2mm
3. UART: Top layer, 0.25mm, short and direct
4. ADC inputs: Top layer, 0.25mm, guarded by ground pour
5. Relay drive signals: Top layer, 0.4mm, separate from signal traces

### High Voltage Routing (Relay Outputs)
1. Route relay COM/NO/NC traces on top layer, 0.8mm minimum
2. Maintain 2mm clearance between relay traces and low-voltage signals
3. Use solder mask clearance 0.2mm minimum
4. Place "CAUTION: 220V" silkscreen text near relay output connectors

### RF / Antenna Area
1. Keep ESP32 antenna area free of copper on both layers (15mm x 10mm)
2. No vias in antenna keep-out zone
3. Ensure minimum 10mm clearance from metal enclosure or mounting hardware

## VIAS STRATEGY

Via types:
- Standard via: 0.6mm outer, 0.3mm drill (default)
- Power via: 0.8mm outer, 0.4mm drill (for +5V_MAIN, +3V3 rails)
- Ground via: 0.6mm outer, 0.3mm drill (thermal relief preferred)

Via placement:
- GND vias near every decoupling capacitor
- GND vias near every IC ground pin
- No vias in antenna keep-out zone
- Avoid vias under ESP32 module (use bottom ground plane instead)

## SILKSCREEN & LABELS

### Required Silkscreen Text
- Board name: "EcoSynTech PCB v6.3 Final" at top layer
- Revision: "Rev 6.3 Final"
- Company: "EcoSynTech Global"
- Date: "2026-04-15"
- ESP32 label: "ESP32-WROOM-32E"
- Relay labels: "RLY1", "RLY2", "RLY3", "RLY4"
- LED labels: "PWR", "WIFI", "MQTT", "ERR"
- Connector labels: "12V IN", "USB", "ANALOG IN", "I2C", "UART", "EXP"
- Warning text: "CAUTION: 220V AC" near relay output connectors
- Coil note: "RELAY COIL 5V" on relay silk

### Silkscreen Font
- Reference designators: Height 1.0mm, width 0.15mm
- Value text: Height 0.8mm
- Warning text: Height 1.5mm, bold

## CONFORMAL COATING

### Exclude Zones (NO coating)
- USB connector area (J_USB)
- All through-hole connectors (TB1, J_RELAY_OUT1-4, J_DS18B20_EXT, J_ANALOG_IN, J_I2C_EXT, J_UART_EXT, J_EXP_HEADER, J_PWR_EXT)
- MicroSD socket area (U_SDCARD)
- All test points and debug headers
- ESP32 module top area (for heat dissipation)
- Relay coil areas (for visual inspection)

### Coating Zones (APPLY coating)
- All bottom side components and traces
- All top-side areas except exclude zones
- ADC input divider networks
- All SMD components

## FABRICATION NOTES

PCB Specifications:
- Material: FR-4, Tg 140°C minimum
- Layers: 2 (Top + Bottom)
- Copper weight: 1 oz/sqft (35um) standard
- Solder mask: Green (standard), LPI (liquid photoimageable)
- Silkscreen: White, LPI
- Surface finish: HASL-Lead-Free or ENIG (recommended: ENIG for better shelf life)
- Board thickness: 1.6mm
- Min feature: 0.2mm trace/0.2mm space (standard)

Stack-up (from top to bottom):
- F.SilkS: Silkscreen (white)
- F.Paste: Solder paste (stencil)
- F.Mask: Solder mask (green, 12um)
- F.Cu: Top copper (35um)
- CORE: FR-4 1.6mm
- B.Cu: Bottom copper (35um)
- B.Mask: Solder mask (green, 12um)
- B.Paste: Solder paste (stencil)
- B.SilkS: Silkscreen (white)

Panelization: V-score or tab-route recommended for production panels
Test: 100% electrical test (open/short) mandatory

## DRC RULES (KiCad Design Rule Check)

Clearance (default): 0.2 mm
Clearance (HighVoltage): 0.4 mm
Track width (default): 0.25 mm
Track width (Power): 0.6 mm
Track width (+12V, +5V): 1.0 mm
Track width (GND pour): 0.25 mm (fill)
Via diameter: 0.6 mm
Via drill: 0.3 mm
Annular ring: 0.15 mm minimum
Silk to pad: 0.2 mm minimum

## TEST POINTS

Place test points (TP_ prefix) for key nets:
- TP_12V_IN: +12V_PROTECTED net
- TP_5V: +5V_MAIN net
- TP_3V3_ESP: +3V3_ESP net
- TP_3V3_ANA: +3V3_ANA net
- TP_GND: GND_STAR net
- TP_UART_TX: UART0_TX net
- TP_UART_RX: UART0_RX net
- TP_I2C_SCL: I2C_SCL net
- TP_I2C_SDA: I2C_SDA net
- TP_WD_KICK: WATCHDOG_KICK net
