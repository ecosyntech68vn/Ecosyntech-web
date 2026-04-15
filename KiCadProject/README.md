# EcoSynTech PCB v6.3 Final — KiCad Project
## 2-Layer 200x150mm | ESP32-WROOM-32E | Expandable Design

---

## Project Files

| File | Description |
|------|-------------|
| `EcoSynTech_V6_3_final.kicad_pro` | KiCad 7.x project file (open this in KiCad) |
| `EcoSynTech_V6_3_final.kicad_sch` | Schematic file (empty, to be populated) |
| `EcoSynTech_V6_3_final.kicad_pcb` | PCB file with netlist and design rules |
| `EcoSynTech_V6_3_final_SCH_NETLIST.md` | Full schematic netlist with 14 sheets |
| `EcoSynTech_V6_3_final_BOM.csv` | Bill of Materials with 90+ components |
| `EcoSynTech_V6_3_final_PCB_LAYOUT.md` | Complete PCB layout guide with zone partitioning |

---

## Quick Start

### Step 1: Open in KiCad
```bash
# Install KiCad 7.x or 8.x
# Open the project file:
kicad EcoSynTech_V6_3_final.kicad_pro
```

### Step 2: Add Symbol Libraries
In KiCad, go to **Preferences → Manage Symbol Libraries** and add:
- ESP32-WROOM-32E footprint (Espressif official library or custom)
- Standard KiCad libraries: Device, Connector, Power, MCU_Module

### Step 3: Populate Schematic
1. Open the `.kicad_sch` file
2. Reference the netlist in `EcoSynTech_V6_3_final_SCH_NETLIST.md`
3. Add components from symbol libraries
4. Wire up all nets per the netlist
5. Annotate reference designators (R1, C1, U1, etc.)
6. Run Electrical Rule Check (ERC)

### Step 4: Generate PCB
1. Open the `.kicad_pcb` file
2. Update footprints from `EcoSynTech_V6_3_final_BOM.csv`
3. Place components per zones in `EcoSynTech_V6_3_final_PCB_LAYOUT.md`
4. Route traces following the routing strategy
5. Add copper pours (GND_STAR on bottom)
6. Run Design Rule Check (DRC)
7. Generate Gerber files

---

## Board Specifications

| Parameter | Value |
|-----------|-------|
| Dimensions | 200.0 mm × 150.0 mm |
| Layers | 2 (Top + Bottom) |
| Thickness | 1.6 mm |
| Material | FR-4, Tg 140°C |
| Copper weight | 1 oz/ft² (35 µm) |
| Min trace/space | 0.2 mm / 0.2 mm |
| Connectors | 5.08 mm & 7.62 mm pitch |

---

## Zone Layout

| Zone | Location | Purpose |
|------|----------|---------|
| Z1 Power Input | Top-left | Surge, reverse polarity protection |
| Z2 Buck 12V→5V | Top-center-left | MP1584 regulator |
| Z3 LDO 5V→3.3V | Center-top | Split rails for ESP32 and analog |
| Z4 ESP32 Module | Center | MCU, SD card, watchdog |
| Z5 Status LEDs | Top-center | PWR, WIFI, MQTT, ERR |
| Z6 USB-UART | Top-right | Firmware loading |
| Z7 ADS1115 ADC | Center-right | 4-channel analog input |
| Z8 Core Sensors | Bottom-center-right | DHT22, DS18B20, soil |
| Z9 I2C Bus | Bottom-right | OLED, BME280 |
| Z10 Relays 1-4 | Bottom-left | Isolated relay drivers |
| Z11 IO Expanders | Bottom-center | MCP23017 ×2, expansion relays |
| Z12 External Connectors | Right edge | All field wiring |

---

## Key Design Decisions

- **ESP32-WROOM-32E**: Latest production module (replaces deprecated ESP32-D)
- **Single ground (GND_STAR)**: Prevents ground loops across zones
- **3.3V split rails**: Separate ESP and analog power domains
- **MCP23017 IO expanders**: 16 extra GPIO for expansion without changing ESP32 nets
- **4+4 expansion**: 4 built-in relays + 4 expansion relays via IO expander
- **RC snubbers on all relays**: Prevents contact damage from arc discharge
- **3-tier surge protection**: Fuse + GDT + MOV + TVS + MOSFET reverse-polarity
- **7.62mm connectors for relays**: High-current field wiring
- **5.08mm connectors for signal**: Standard I/O and sensor wiring
- **Conformal coating plan**: With clearly defined exclude zones

---

## BOM Summary

| Category | Count |
|----------|-------|
| ICs (MCU, ADC, IO Expander, Regulator) | 6 |
| Relays | 4 (+4 optional) |
| Connectors (various pitch) | ~12 |
| Resistors | ~35 |
| Capacitors | ~30 |
| Diodes (TVS, Schottky, ESD) | ~15 |
| Inductors | 2 |
| LEDs | 4 |
| Sensors (DHT22, DS18B20) | 2 |
| Total unique parts | ~90 |

---

## Gerber Output Checklist

When ready for manufacturing, generate these files from KiCad:
- [ ] `F.Cu.gbr` — Top copper
- [ ] `B.Cu.gbr` — Bottom copper
- [ ] `F.Paste.gbr` — Top solder paste
- [ ] `B.Paste.gbr` — Bottom solder paste
- [ ] `F.SilkS.gbr` — Top silkscreen
- [ ] `B.SilkS.gbr` — Bottom silkscreen
- [ ] `F.Mask.gbr` — Top solder mask
- [ ] `B.Mask.gbr` — Bottom solder mask
- [ ] `Edge.Cuts.gbr` — Board outline
- [ ] `NpthHole.gbr` — Non-plated through holes (if any)
- [ ] `PthHole.gbr` — Plated through holes (drill file)
- [ ] BOM.csv — Bill of materials

---

## Testing Plan

### Power-up Tests
1. Measure +12V_PROTECTED (should be ~12V)
2. Measure +5V_MAIN (should be 5.0V ±0.1V)
3. Measure +3V3_ESP (should be 3.3V ±0.05V)
4. Measure +3V3_ANA (should be 3.3V ±0.05V)
5. Verify no shorts between power rails

### Functional Tests
1. Flash firmware via USB-UART
2. Test WiFi connection
3. Test MQTT connection
4. Read DHT22 temperature/humidity
5. Read DS18B20 temperature
6. Read ADS1115 ADC channels
7. Test all 4 relays (on/off)
8. Test MicroSD card R/W
9. Test TPL5010 watchdog
10. Test IO expander (if expansion populated)

### Field Tests
1. Outdoor temperature cycling (-20°C to +60°C)
2. Humidity exposure (95% RH)
3. Surge immunity ( IEC 61000-4-5 )
4. ESD immunity (IEC 61000-4-2)
5. Conformal coating adhesion check
