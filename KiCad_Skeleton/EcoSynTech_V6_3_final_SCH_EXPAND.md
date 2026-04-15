EcoSynTech PCB v6.3 Final — Schematic Expansion Plan (KiCad)

Overview
- This document describes a scalable extension plan to support 2–4 additional relays and 2–4 sensors with minimal changes to the core ESP32-based board. The approach uses IO expansion chips on I2C and a minimal set of expansion headers to keep the board 2-layer friendly.

Key decisions
- Core MCU: ESP32-WROOM-32E as the primary controller.
- Core expansion strategy: Add two I2C IO Expanders (MCP23017) to boost GPIO count, enabling RELAY5..RELAY? and extra sensors without modifying existing nets significantly.
- Sensor expansion: Use ADS1115 variants or similar if more analog inputs are required, or I2C-based digital sensors on the IO Expanders.
- Expansion connectors: 5.08 mm pitch headers along board edge to support expansion modules and harnesses. Use 2x5 header for IO expansion and 2x4 or 2x5 header for sensor/IO expansion, as needed.

Net naming and blocks
- GND_STAR remains single-point ground reference.
- Power rails: +12V_IN, +12V_FUSED, +12V_SURGE, +12V_PROTECTED; +5V_MAIN; +5V_SYS; +3V3_MAIN; +3V3_ESP; +3V3_ANA.
- Core I/O: I2C_SDA, I2C_SCL; SPI_SCK, SPI_MOSI, SPI_MISO, SD_CS; UART0_TX, UART0_RX.
- Relay drive: RELAY_DRV[1..4] for base design; expanded with RELAY5_DRV..RELAY8_DRV via IO Expander.
- Expansion IO: IOEXP1_SCL, IOEXP1_SDA, IOEXP1_GPIO[0..7], IOEXP2_SCL, IOEXP2_SDA, IOEXP2_GPIO[0..7]
- Analog inputs: ADS_A0..ADS_A3; ARN_ADS_EXP1_A0..ARP_ADS_EXP1_A3 for additional ADS1115 if needed.
- Sensor signals: DHT22_RAW, DS18B20_RAW, ADS_Ax_RAW, and EXP_SENS_xxx as applicable.

Component blocks (logical)
- U1: ESP32-WROOM-32E (core controller)
- U2: MP1584 buck converter (12V to 5V)
- U3: ADS1115 (core) – 4 analog channels
- U4: IO Expander 1 (MCP23017) – optional for RELAY5..RELAY8 + extra IO
- U5: IO Expander 2 (MCP23017) – optional for more expansion IO
- Optional Ux: ADS1115 Expansion (ADS1115_E) if more analog channels required via I2C
- Relays: RELAY1..RELAY4 as core; RELAY5..RELAY8 via IO expanders
- Cables/headers: Edge connectors with 5.08 mm pitch as described

Schematic connection strategy (high level)
- I2C bus: ESP32 I2C pins connect to MCP23017s; SCL/SDA lines have pullups as required by the KiCad symbol libraries.
- Relay control: Each RELAY_DRVx line from either ESP32 GPIO or IO Expander outputs controls a transistor/driver for the corresponding coil. Include RC snubber per relay in layout.
- Power rails: Decoupling near each regulator; separate planes for 12V, 5V_MAIN, and 3.3V zones; ensure ground plane connections are well defined.
- Sensor buses: DHT22/DS18B20 connect to ESP32 or to IO expander as appropriate; ADS1115 channels wired to ADS1115s with proper addressing.

Expansion rules (quick guidance)
- To add 2 more relays: reuse two available GPIOs or IO Expander outputs; add footprints for RELAY5_DRV and RELAY6_DRV and connect to a new external 2xN header if needed.
- To add 2–4 sensors: use extra IO Expanders or ADS1115 channels; ensure address map allows 2–3 ADS1115s on the same I2C bus or use one ADS1115 with multiplexing.
- Keep traces short for high-speed or sensitive lines; isolate analog/digital sections; maintain GND_STAR isolation.

Notes
- This is a schematic expansion plan and not a finished schematic. The actual KiCad netlist and footprints should be implemented in the KiCad project with the actual library parts.
