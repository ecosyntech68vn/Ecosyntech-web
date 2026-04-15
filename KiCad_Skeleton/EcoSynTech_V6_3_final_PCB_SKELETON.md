EcoSynTech PCB v6.3 Final — PCB Skeleton (KiCad)

Board outline and layers
- Board size target: 100 mm x 70 mm (adjustable in final layout)
- Layer stack (typical): F.Cu / B.Cu, F.SilkS / B.SilkS, F.Paste / B.Paste, F.Mask / B.Mask, Edge.Cuts

Footprint placeholders (high-level)
- U1: ESP32 module placeholder
- U2: MP1584 buck regulator placeholder
- U3: ADS1115 ADC placeholder
- U4: DHT22 placeholder
- U5: DS18B20 placeholder
- U6: MicroSD slot placeholder
- J1: USB-UART connector placeholder (CP2102 or similar)
- Relay array: RE1..RE4 placeholders with RC snubber recommendations

Power paths and decoupling
- Place bulk capacitors (e.g., 22uF, 100nF) near regulators and MCU.
- Separate analog (3.3V) and digital (3.3V) rails with careful ground separation (GND_STAR strategy).
- Add a dedicated ground pour under MCU for heat dissipation and noise control, connected to GND_STAR at a single point.

High-level net naming and constraints
- GND_STAR: single ground net.
- +12V_IN / +12V_PROTECTED / +12V_SURGE: explicit protection components near entry.
- +5V_MAIN and +3V3_MAIN: central power rails with robust filtering.
- Ensure external interfaces have ESD protection.

Manufacturing and test readiness
- Include fiducials and test pads for automated optical inspection and in-circuit testing.
- Include a region for conformal coating with defined exclude areas.
- Prepare Gerber/drill data, BOM, and pick-and-place files for fabrication.
