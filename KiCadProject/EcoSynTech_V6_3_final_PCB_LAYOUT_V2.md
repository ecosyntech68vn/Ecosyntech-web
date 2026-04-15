# EcoSynTech PCB v6.3 Final — PCB Layout Guide V2 (CORRECTED)
# ==============================================================
# 2-Layer 200mm x 150mm | ESP32-WROOM-32E | CORRECTED per original spec
# ==============================================================

## FABRICATION SPECIFICATIONS (CORRECTED per spec H1)

- Material: FR-4, Tg ≥ 130°C
- Layers: 2 (Top + Bottom)
- Copper weight: **1 oz TOP, 2 oz BOTTOM** (2 oz bottom mandatory under relay zone)
- **Surface finish: ENIG (bắt buộc)** ← FIXED from HASL
- Board thickness: 1.6mm
- Min trace/space: 0.2mm / 0.2mm (default), 0.4mm (HV)
- **100% Flying probe electrical test required**

## BOARD OUTLINE & MECHANICAL (per spec D1)

Board: 200.0mm × 150.0mm ±1mm
Thickness: 1.6mm
Corner routing: 45-degree chamfer
4× Mounting holes M3: Φ3.2mm drilled, Φ5.0mm plated pads, 5mm from corners
**No plating on mounting holes** (per spec D4)
Fiducials: 3×3mm cross at corners (top side)

## CRITICAL LAYOUT FIXES (vs V1)

| Issue | V1 (WRONG) | V2 (CORRECTED) | Spec Reference |
|-------|-------------|-----------------|---------------|
| Relay isolation slot | 3mm | **6-8mm** | D3 |
| Surface finish | HASL | **ENIG** | H1 |
| Copper weight bottom | 1 oz | **2 oz** | H1 |
| Thermal vias under MP1584 | Missing | **ADD** | D6 |
| Via stitching at relay slot | Missing | **ADD** | D3 |
| All test points | Missing | **ADD all 14** | B17 |

## ZONE LAYOUT (per spec D2)

### CORRECTED LAYOUT:
```
Top-Left (X:5-50, Y:5-60):      Z1: Power Input Protection (TB1, F1, GDT1, MOV1, TVS1, Q_PROTECT, Caps)
Top-Left-Center (X:55-105, Y:5-50): Z2: Buck 12V→5V (MP1584 #1) + Thermal Vias
Top-Center (X:110-160, Y:5-50):   Z3: Buck 12V→3.3V (MP1584 #2) + Thermal Vias
Top-Right (X:165-195, Y:5-50):     Z4: USB-UART + Auto-reset (CP2102, Q_RST, Q_BOOT)
Center-Left (X:5-100, Y:65-115):  Z5: ESP32 Module + MicroSD + Status LEDs
Center (X:105-145, Y:65-115):      Z6: I2C Expander (MCP23017 ×2) + Ferrite Beads
Center-Right (X:150-195, Y:55-115): Z7: ADS1115 ADC + Analog Divider Networks
Bottom-Left (X:5-100, Y:120-145):  Z8: 4× Relay + RC Snubbers + MOV + Power Limiting
Bottom-Center (X:105-145, Y:120-145): Z9: Relay Power Section (R_RELAY_LIM, C_RELAY_BULK)
Bottom-Right (X:150-195, Y:120-145): Z10: Core Sensors (DHT22, DS18B20) + I2C Bus
Right Edge (X:195-200, all Y):    Z11: External Connectors (all field wiring)
```

## CRITICAL SPACING RULES (per spec D3)

### Relay Isolation Slot (MOST IMPORTANT FIX):
- **Clearance: 6-8mm between relay zone and digital/logic zone**
- Route a **routed slot** (not just clearance) through the board
- **Via stitching**: Place GND vias every 2mm along BOTH sides of the slot
- Slot must be wide enough to prevent arc tracking from relay contacts to logic

### Buck Regulator Layout (per spec D3):
- MP1584 switching node (SW) must have **absolutely shortest trace** to L
- Input caps CIN_5V1/CIN_5V2 must be **right at VIN pin** of MP1584
- Output caps COUT_5V1/COUT_5V2 must be **right at VOUT side of L**
- **Thermal vias**: 3×3 grid of thermal vias under MP1584 for heat dissipation
- These vias connect to bottom ground plane

### Power Routing:
- +12V_IN: 1.5mm width, top layer, away from signal traces
- +5V_MAIN: 1.0mm width, top layer
- +5V_RELAY_RAW: 1.5mm width, top layer (heavy relay current)
- +3V3_MAIN: 0.8mm width, top layer
- +3V3_ESP / +3V3_ANA: 0.6mm width, top layer

### Signal Routing:
- I2C_SCL/SDA: 0.25mm, keep stubs short, series 22Ω near connector
- SPI (SD): 0.25mm, length-matched within 2mm
- UART: 0.25mm, short and direct
- ADC inputs: 0.25mm, guarded by ground pour

## COMPONENT PLACEMENT (per spec D2)

### Top-Left (Z1): Power Input
TB1 → F1 → GDT1/MOV1 → R_SURGE1/L_SURGE1 → D_TVS1 → Q_PROTECT → C1/C2/C3
**Critical: GDT and MOV side by side for parallel surge path**

### Top-Center (Z2): Buck #1 (12V→5V)
Place MP1584 #1 with CIN caps right at VIN, L_5V and COUT caps on VOUT side
**Thermal via array under U2_5V package**

### Top-Center (Z3): Buck #2 (12V→3.3V)
Place MP1584 #2 with CIN caps right at VIN, L_3V3 and COUT caps on VOUT side
**Thermal via array under U3_3V3 package**

### Center-Left (Z5): ESP32 + Memory
U_ESP32: Keep antenna area clear (no copper on top or bottom within 15mm radius)
MicroSD: Near ESP32, accessible for prototyping
Status LEDs: Near board edge, visible from enclosure panel face
**Ground pour on bottom directly under ESP32 module**

### Bottom-Left (Z8): 4× Relay
- Physical isolation: **6-8mm slot** between relay zone and digital zone
- RC snubbers: As close as possible to relay COM/NO terminal block pins
- MOV (optional): Parallel across COM/NO contacts
- **2 oz copper bottom under relay zone** (heavy current for relay coils)
- Via stitching along the isolation slot (every 2mm on both sides)

### Bottom-Center (Z9): Relay Power Section
R_RELAY_LIM (0.5Ω 1W): Right next to +5V_MAIN entry to relay zone
C_RELAY_BULK (1000µF): Right next to R_RELAY_LIM output
D_RELAY_TVS: Right at +5V_RELAY_RAW node

### Center-Right (Z7): ADS1115
Place divider networks (R_VTOP/R_VBOT, R_A0_SER, etc.) close to ADS1115
TVS diodes right at ADS1115 pins
Filter caps close to each analog input

## GROUND PLANE STRATEGY

1. Fill entire **bottom layer** with GND_STAR copper pour
2. **Thermal relief pads** for all through-hole vias to ground
3. **No routing** under ESP32 module (solid ground plane there)
4. **Isolation gap**: 3mm gap in ground pour along relay isolation slot
5. **Via stitching** along relay isolation slot (every 2mm, GND vias on both sides)
6. GND vias near every decoupling capacitor (within 2mm)

## SILKSCREEN REQUIREMENTS (per spec E) — FIXED

### MUST HAVE LABELS:
```
EcoSynTech V6.3 Industrial Pro     ← CORRECT NAME
Rev 6.3 Final
2026-04-15

F1 (2A Slow)
TVS1 SMBJ24A
MOV1 14D201K
GDT1 Bourns 2027-09-B
TVS_USB SMBJ5.0A

POWER    ← LED
WIFI     ← LED
MQTT     ← LED
ERROR    ← LED

DHT22
DS18B20
SOIL
ADS1115
I2C EXT

BATTERY / VIN (12-24V)

RELAY 1  COM — NO — NC
RELAY 2  COM — NO — NC
RELAY 3  COM — NO — NC
RELAY 4  COM — NO — NC

RELAY 5  COM — NO — NC  (opt)
RELAY 6  COM — NO — NC  (opt)
RELAY 7  COM — NO — NC  (opt)
RELAY 8  COM — NO — NC  (opt)

CAUTION: HIGH VOLTAGE 220VAC ONLY
THAY ĐÚNG GIÁ TRỊ CẦU CHÌ.
KIỂM TRA CỰC TÍNH TRƯỚC KHI CẤP NGUỒN.
DO NOT REMOVE SNUBBER — ARC HAZARD

BOOT    ← near BOOT_ESP pin
RESET   ← near EN_ESP pin

USB
MicroSD
```

## CONFORMAL COATING PLAN (per spec F)

### Exclude Zones (NO coating):
- All terminal blocks (TB1, J_DHT, J_DS, J_SOIL, J_AIN, J_VBAT, J_I2C_EXT, J_DEBUG, J_R1..4, J_EXP_HEADER, J_PWR_EXT)
- USB connector (J_USB)
- MicroSD socket (U_SDCARD)
- Boot and Reset buttons/headers
- ESP32 antenna area (heat/moisture escape)
- All test points (TP_*)
- Relay contact area (visual inspection needed)
- Any through-hole pins

### Apply Coating:
- All SMD components and traces not in exclude zones
- Both top and bottom layers
- ADS1115 divider networks and surrounding area
- MCP23017 and surrounding area
- All resistor/capacitor networks

### Coating Spec:
- Material: Acrylic conformal coating
- Thickness: **50-70µm** (spec F), recommend **80-100µm** for outdoor
- Pre-coating: Thorough flux cleaning mandatory
- Post-coating: UV inspection required

## OUTDOOR / WATER / DUST PROTECTION (for ABS enclosure + desiccant)

### Board-Level (already designed):
- Conformal coating ✓
- TVS/ESD on all external lines ✓
- Wide-temperature rated components (105°C caps) ✓
- FR-4 Tg ≥130°C ✓

### Enclosure-Level Recommendations:
1. **Cable Entry**: Use IP67 cable glands with silicone gaskets
2. **Gasket**: Continuous silicone gasket around enclosure lid perimeter
3. **Pressure Equalization**: Gore-Tex vent membrane (e.g., eVent) to prevent pressure differential that could pull moisture in
4. **Desiccant**: 5g molecular sieve inside enclosure, near board
5. **Moisture Indicator**: Blue silica gel indicator card
6. **Epoxy Potting**: Fill connector back-fill holes with epoxy after soldering
7. **USB Cover**: Waterproof USB cover when not in use, or use waterproof USB connector with O-ring
8. **UV Protection**: If ABS enclosure: add UV-resistant paint or use polycarbonate (PC) instead of ABS
9. **Mounting**: Use stainless steel M3 screws with nylon washers for sealing

### Additional Board Changes for Outdoor:
- Add silicone bead along bottom perimeter under board (between board and enclosure base)
- Epoxy coat bottom through-hole solder joints
- Use gold-plated connectors (ENIG already specified helps with this)

## TEST POINTS (per spec B17)

| Label | Net | Location |
|-------|-----|----------|
| TP_12V | +12V_PROTECTED | Near C3 |
| TP_5V | +5V_SYS | Near C_SYS1 |
| TP_3V3_ESP | +3V3_ESP | Near U_ESP32 |
| TP_3V3_ANA | +3V3_ANA | Near ADS1115 |
| TP_GND | GND_STAR | Near test point area |
| TP_UART_TX | UART0_TX | Near CP2102 |
| TP_UART_RX | UART0_RX | Near CP2102 |
| TP_EN | EN_ESP | Near ESP32 |
| TP_BOOT | BOOT_ESP | Near ESP32 |
| TP_I2C_SCL | I2C_SCL | Near I2C header |
| TP_I2C_SDA | I2C_SDA | Near I2C header |
| TP_WD | WATCHDOG_KICK | Near TPL5010 |
| TP_POWER_GOOD | POWER_GOOD | Near power good node |
| TP_RELAY_EN | RELAY_EN | Near relay enable circuit |
| TP_BOOT_OK | BOOT_OK | Near ESP32 |

## DRC RULES

| Rule | Value | Net Class |
|------|-------|-----------|
| Clearance (default) | 0.2mm | Default |
| Clearance (HighVoltage) | 0.4mm | HighVoltage |
| Track width (signal) | 0.25mm | Default |
| Track width (power 5V/3.3V) | 0.6mm | Power |
| Track width (+12V) | 1.0mm | Power |
| Track width (+5V_RELAY_RAW) | 1.5mm | Power |
| Via diameter | 0.6mm | Default |
| Via drill | 0.3mm | Default |
| Via (power) diameter | 0.8mm | Power |
| Via (power) drill | 0.4mm | Power |
| Silk to pad | 0.2mm | — |
| HV clearance (relay to LV) | 6-8mm | HighVoltage |

## GERBER OUTPUT CHECKLIST

Required for manufacturing:
- [x] F.Cu — Top copper
- [x] B.Cu — Bottom copper (2 oz under relay zone)
- [x] F.Paste — Top solder paste
- [x] B.Paste — Bottom solder paste
- [x] F.SilkS — Top silkscreen
- [x] B.SilkS — Bottom silkscreen
- [x] F.Mask — Top solder mask
- [x] B.Mask — Bottom solder mask
- [x] Edge.Cuts — Board outline
- [x] PTH.drl — Plated through-hole drill
- [x] NPTH.drl — Non-plated drill (if any)
- [x] BOM.csv — Bill of materials
- [x] Fab drawing with all dimensions and tolerances
- [x] Conformal coating specification drawing
