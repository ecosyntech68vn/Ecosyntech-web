EcoSynTech PCB v6.3 Final — PCB Skeleton Extensions (KiCad)

Expansion-friendly board skeleton for 2-layer design (200x150 mm) with ESP32-WROOM-32E.

Edge connectors
- J_EXP5p08_1: 5.08 mm header 2x5 (10 pins) along the edge for IO expansion (I2C/SPI/GPIO, power rails).
- J_EXP7p62_1: 7.62 mm header 2x3 (6 pins) along the edge for high-current power/harness connections (12V in, 12V protected, etc.).
- J_V12V_IN and J_V12V_OUT: 7.62 mm 2-pin headers for primary 12V input and fused/protected rail pairs.
- J_DC3_3V3: 7.62 mm 2-pin header for 3.3V sense feed to external modules (optional).

Expansion IO expander footprints (optional)
- U_EXP1: MCP23017 (I2C IO expander) – used to extend 8 GPIOs for relays or digital sensors.
- U_EXP2: MCP23017 (I2C IO expander) – second expander for additional IO.
- Optional U_EXP3: ADS1115_E (ADS1115) – second analog-digital converter if more analog inputs are needed.

PCB layout notes
- Place expansion headers along the board edge to minimize wiring complexity for external housings.
- Keep-expansion connectors away from high-speed or noisy traces; maintain 5–10 mm keep-out from 12V/NEXT to avoid interference.
- If used, keep-out RF area for ESP32 antenna (if external antenna used) and ensure ground plane is continuous around ESP32.
- Ensure ground pour connectivity to GND_STAR, with vias near expansion connectors to reduce impedance paths.

Trace routing guidance for expandability
- Route I2C bus (SDA/SCL) with minimal stub length to U_EXP1/U_EXP2; use 4.7k pullups if required by IO expanders.
- Route relay drive lines with proper width and isolate 12V coil traces from sensitive lines. Use RC snubbers for all relays.
- Provide separate copper pour for analog/digital: 3.3V/5V rails with thick copper and decoupling near devices.
