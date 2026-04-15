# EcoSynTech PCB v6.3 Final — SCHEMATIC NETLIST v2 (CORRECTED)
# Based on original docx spec, dated 2026-04-15
# ==============================================================

## POWER ARCHITECTURE OVERVIEW
12V_IN → F1 (2A) → GDT1/MOV1 → R_SURGE/L_SURGE → TVS1 → Q_PROTECT (P-MOS) → +12V_PROTECTED
  → MP1584 #1 → +5V_MAIN
    → +5V_SYS (via OR-ing diode D_MAIN)
    → R_RELAY_LIM → +5V_RELAY_RAW → C_RELAY_BULK → RELAY COILS
    → USB_5V → OR-ing diode D_USB → +5V_SYS
  → MP1584 #2 → +3V3_MAIN → FB_ESP → +3V3_ESP (ESP32)
                                → FB_ANA → +3V3_ANA (sensors)

# ==============================================================
# SHEET 1: POWER INPUT & PROTECTION 12V (per spec B2)
# ==============================================================

TB1    | Terminal Block 2P 5.08mm    | CONN_5.08_2P   | Pin1:GND_STAR, Pin2:+12V_IN
F1     | Fuse 2A Slow-Blow 250V     | FUSE_HOLDER_5x20| (1):+12V_IN, (2):+12V_FUSED
GDT1   | GDT Bourns 2027-09-B       | DIP_7.5mm      | (1):+12V_FUSED, (2):GND_STAR
MOV1   | Varistor 14D201K           | DISC_14MM       | (1):+12V_FUSED, (2):GND_STAR
R_SURGE1| 5.6R 2W 5%               | R_2512          | (1):+12V_FUSED, (2):NET_SURGE_NODE
L_SURGE1| 22uH >=2A                 | RADIAL_8x10     | (1):NET_SURGE_NODE, (2):+12V_SURGE
D_TVS1 | TVS SMBJ24A                | DO-214AA        | K:+12V_SURGE, A:GND_STAR
Q_PROTECT| P-MOSFET AO4407A         | SO-8            | S:+12V_SURGE, D:+12V_PROTECTED, G:GATE_PROTECT
R_G1   | 100k 1%                    | R_0805          | (1):GATE_PROTECT, (2):+12V_SURGE
R_G2   | 100k 1%                    | R_0805          | (1):GATE_PROTECT, (2):GND_STAR
DZ_G1  | Zener 15V                   | SOD-123         | (1):GATE_PROTECT, (2):+12V_SURGE
C1     | 470uF 25V Low-ESR 105C     | CAP_D8x11.5     | (+):+12V_PROTECTED, (-):GND_STAR
C2     | 1uF 50V X7R                | C_1210          | (+):+12V_PROTECTED, (-):GND_STAR
C3     | 100nF 50V X7R              | C_0805          | (+):+12V_PROTECTED, (-):GND_STAR

# ==============================================================
# SHEET 2: BUCK REGULATOR 12V → 5V (MP1584 #1) (per spec B3)
# ==============================================================

U2_5V  | MP1584EN-LF-Z              | SOIC-8E         | VIN:+12V_PROTECTED, GND:GND_STAR, SW:SW_5V, FB:FB_5V, EN:EN_5V, BST:BST_5V
CIN_5V1| 22uF 50V X7R               | C_1210          | (+):+12V_PROTECTED, (-):GND_STAR
CIN_5V2| 100nF 50V X7R              | C_0805          | (+):+12V_PROTECTED, (-):GND_STAR
L_5V   | 10uH >=3A Low-DCR          | SMD_6x6         | (1):SW_5V, (2):+5V_MAIN
COUT_5V1| 22uF 16V X7R              | C_1210          | (+):+5V_MAIN, (-):GND_STAR
COUT_5V2| 22uF 16V X7R               | C_1210          | (+):+5V_MAIN, (-):GND_STAR
COUT_5V3| 100nF 16V X7R             | C_0805          | (+):+5V_MAIN, (-):GND_STAR
R_FB1_5V| 10k 1%                     | R_0805          | (1):FB_5V, (2):GND_STAR
R_FB2_5V| 52.3k 1%                   | R_0805          | (1):FB_5V, (2):+5V_MAIN
R_EN_5V | 100k 1%                    | R_0805          | (1):EN_5V, (2):+12V_PROTECTED
C_BST_5V| 100nF 25V X7R 0603         | C_0603          | BST_5V ↔ SW_5V
D_OUT5V| Schottky SS34               | DO-214AC        | A:SW_5V, K:+5V_MAIN

# ==============================================================
# SHEET 3: BUCK REGULATOR 12V → 3.3V (MP1584 #2) (per spec B4 — DERATING FIX)
# ==============================================================

U3_3V3 | MP1584EN-LF-Z              | SOIC-8E         | VIN:+12V_PROTECTED, GND:GND_STAR, SW:SW_3V3, FB:FB_3V3, EN:EN_3V3, BST:BST_3V3
CIN_3V31| 22uF 25V X7R              | C_1210          | (+):+12V_PROTECTED, (-):GND_STAR
CIN_3V32| 100nF 25V X7R             | C_0805          | (+):+12V_PROTECTED, (-):GND_STAR
L_3V3  | 10uH >=2A                  | SMD_6x6         | (1):SW_3V3, (2):+3V3_MAIN
COUT_3V31| 22uF 16V X7R             | C_1210          | (+):+3V3_MAIN, (-):GND_STAR
COUT_3V32| 22uF 16V X7R             | C_1210          | (+):+3V3_MAIN, (-):GND_STAR
COUT_3V33| 100nF 16V X7R            | C_0805          | (+):+3V3_MAIN, (-):GND_STAR
R_FB1_3V3| 10k 1%                    | R_0805          | (1):FB_3V3, (2):GND_STAR
R_FB2_3V3| 31.6k 1%                  | R_0805          | (1):FB_3V3, (2):+3V3_MAIN
R_EN_3V3 | 100k 1%                   | R_0805          | (1):EN_3V3, (2):+12V_PROTECTED
C_BST_3V3| 100nF 25V X7R 0603        | C_0603          | BST_3V3 ↔ SW_3V3

# ==============================================================
# SHEET 4: RAIL SPLITTING WITH FERRITE BEADS (per spec B6)
# ==============================================================

FB_ESP | Ferrite bead BLM18PG121SN1  | 0805            | (1):+3V3_MAIN, (2):+3V3_ESP
C_ESP1 | 10uF 10V X7R                | C_0805          | (+):+3V3_ESP, (-):GND_STAR
C_ESP2 | 100nF 10V X7R              | C_0805          | (+):+3V3_ESP, (-):GND_STAR
FB_ANA | Ferrite bead BLM18PG121SN1  | 0805            | (1):+3V3_MAIN, (2):+3V3_ANA
C_ANA1 | 10uF 10V X7R                | C_0805          | (+):+3V3_ANA, (-):GND_STAR
C_ANA2 | 100nF 10V X7R               | C_0805          | (+):+3V3_ANA, (-):GND_STAR

# ==============================================================
# SHEET 5: OR-ING DIODES +5V_SYS (per spec B5)
# ==============================================================

D_USB  | Schottky SS34               | DO-214AC        | A:USB_5V_FUSED, K:+5V_SYS
D_MAIN | Schottky SS34               | DO-214AC        | A:+5V_MAIN, K:+5V_SYS
C_SYS1 | 47uF 16V Low-ESR            | C_1210          | (+):+5V_SYS, (-):GND_STAR
C_SYS2 | 100nF 16V X7R               | C_0805          | (+):+5V_SYS, (-):GND_STAR

# ==============================================================
# SHEET 6: ESP32-WROOM-32E CORE (per spec B7 — CORRECTED GPIO)
# ==============================================================
# CORRECTED GPIO ASSIGNMENTS vs ORIGINAL SPEC:

U_ESP32| ESP32-WROOM-32E            | ESP32_WROOM_38P  | 
        |                             |                  | VDD3.3 → +3V3_ESP
        |                             |                  | GND → GND_STAR
        |                             |                  | EN → EN_ESP (via auto-reset Q_RST)
        |                             |                  | IO0(BOOT) → BOOT_ESP (via auto-reset Q_BOOT)
        |                             |                  | IO1(TXD) → UART0_TX → CP2102 RX
        |                             |                  | IO3(RXD) → UART0_RX → CP2102 TX
        |                             |                  | IO21 → I2C_SDA (pull-up 4.7k → +3V3_ANA)
        |                             |                  | IO22 → I2C_SCL (pull-up 4.7k → +3V3_ANA)
        |                             |                  | IO26 → RELAY1_DRV
        |                             |                  | IO27 → RELAY2_DRV
        |                             |                  | IO25 → RELAY3_DRV
        |                             |                  | IO14 → RELAY4_DRV
        |                             |                  | IO33 → DHT22_RAW (via 100Ω series R_DHT_SER)
        |                             |                  | IO32 → DS18B20_RAW (via 100Ω series R_DS_SER)
        |                             |                  | IO4 → WATCHDOG_KICK (→ TPL5010 DONE)
        |                             |                  | IO16 → LED_WIFI_CTRL (active-LOW)
        |                             |                  | IO17 → LED_MQTT_CTRL (active-LOW)
        |                             |                  | IO13 → LED_ERROR_CTRL (active-LOW)
        |                             |                  | IO5 → SD_CS
        |                             |                  | IO18 → SPI_SCK (via 22Ω R_SCK)
        |                             |                  | IO19 → SPI_MISO (via 22Ω R_MISO)
        |                             |                  | IO23 → SPI_MOSI (via 22Ω R_MOSI)
        |                             |                  | IO35 → VIN_SENSE_RAW (via 1k R_VSENSE_SER)

R_BOOT_PU| 10k 5%                    | R_0805          | (1):BOOT_ESP, (2):+3V3_ESP
R_EN_PU  | 10k 5%                    | R_0805          | (1):EN_ESP, (2):+3V3_ESP
C_ESP_DEC1| 100nF 10V X7R            | C_0805          | (+):+3V3_ESP, (-):GND_STAR (near VDD pin)
C_ESP_DEC2| 100nF 10V X7R            | C_0805          | (+):+3V3_ESP, (-):GND_STAR
C_ESP_DEC3| 100nF 10V X7R            | C_0805          | (+):+3V3_ESP, (-):GND_STAR
R_VSENSE_SER| 1k 5%                   | R_0805          | (1):VIN_SENSE_RAW, (2):GPIO35
R_DHT_SER | 100R 5%                   | R_0805          | (1):DHT22_RAW, (2):GPIO33
R_DS_SER  | 100R 5%                   | R_0805          | (1):DS18B20_RAW, (2):GPIO32

# STATUS LEDs — ACTIVE-LOW (per spec B17, C)
LED_PWR | Green LED 0805             | LED_0805        | A:NET_LED_PWR, K:GND_STAR
R_LED_PWR| 1.5k 5%                   | R_0805          | (1):POWER_GOOD, (2):NET_LED_PWR

LED_WIFI| Blue LED 0805              | LED_0805        | A:NET_LED_WIFI, K:GND_STAR
R_LED_WIFI| 1.5k 5%                  | R_0805          | (1):LED_WIFI_CTRL, (2):NET_LED_WIFI

LED_MQTT| Yellow LED 0805            | LED_0805        | A:NET_LED_MQTT, K:GND_STAR
R_LED_MQTT| 1.5k 5%                  | R_0805          | (1):LED_MQTT_CTRL, (2):NET_LED_MQTT

LED_ERROR| Red LED 0805              | LED_0805        | A:NET_LED_ERR, K:GND_STAR
R_LED_ERR| 1.5k 5%                   | R_0805          | (1):LED_ERROR_CTRL, (2):NET_LED_ERR

# ==============================================================
# SHEET 7: USB-UART + AUTO-RESET (per spec B8 — CORRECTED)
# ==============================================================

J_USB  | USB Micro-B                 | USB_MICRO_B     | VBUS:USB_5V, D+:USB_D_P, D-:USB_D_N, GND:GND_STAR
F_USB  | PTC 0.5A 6V                 | RADIAL_D5       | (1):USB_5V, (2):USB_5V_RAW
D_TVS_USB| TVS SMBJ5.0A             | DO-214AA        | K:USB_5V_RAW, A:GND_STAR
R_USB_LIM| 2.2R 1/4W                 | R_1206          | (1):USB_5V_RAW, (2):USB_5V_FUSED
ESD_USB| USBLC6-2SC6                 | SOT-23-6        | I/O+:USB_D_P, I/O-:USB_D_N, GND:GND_STAR
U_USB_UART| CP2102-GMR              | QFN-28          | VREGIN:+5V_SYS, TXD:UART0_RX, RXD:UART0_TX
        |                             |                  | DTR:DTR_USB, RTS:RTS_USB
        |                             |                  | SUSPEND:NC, REG:DNC

# AUTO-RESET CIRCUIT (for firmware programming)
Q_RST  | BC847 NPN                   | SOT-23          | B:R_USB_DTR (1k), C:EN_ESP, E:GND_STAR
R_USB_DTR| 1k 5%                      | R_0805          | (1):DTR_USB, (2):Q_RST_B
Q_BOOT | BC847 NPN                   | SOT-23          | B:R_USB_RTS (1k), C:BOOT_ESP, E:GND_STAR
R_USB_RTS| 1k 5%                      | R_0805          | (1):RTS_USB, (2):Q_BOOT_B

# ==============================================================
# SHEET 8: HARDWARE WATCHDOG TPL5010 (per spec B8)
# ==============================================================

U_WD   | TPL5010DDCT                 | SOT-23-6        | VDD:+3V3_ESP, GND:GND_STAR
        |                             |                  | DONE:WATCHDOG_KICK (GPIO4)
        |                             |                  | RESET:WATCHDOG_RST
        |                             |                  | WAKE:GND_STAR (via R_WD_WAKE 10k)
R_WD_DONE_PU| 10k 5%                  | R_0805          | (1):WATCHDOG_KICK, (2):+3V3_ESP
R_WD_WAKE| 10k 5%                     | R_0805          | (1):NET_WD_WAKE, (2):GND_STAR
D_RST  | BAT54S                      | SOT-23          | A:WATCHDOG_RST, K:EN_ESP (clamp)
C_WD_FILT| 100nF 10V X7R             | C_0805          | (+):+3V3_ESP, (-):GND_STAR

# ==============================================================
# SHEET 9: 4-CHANNEL RELAY + POWER LIMITING (per spec B9)
# ==============================================================

# POWER LIMITING (shared for all 4 relays)
R_RELAY_LIM| 0.5R 1W 2512            | R_2512          | (1):+5V_MAIN, (2):+5V_RELAY_RAW
C_RELAY_BULK| 1000uF 16V Low-ESR 105C| CAP_D10x12.5    | (+):+5V_RELAY_RAW, (-):GND_STAR
D_RELAY_TVS| TVS SMBJ5.0A             | DO-214AA        | K:+5V_RELAY_RAW, A:GND_STAR

# RELAY 1 (repeat for RLY2/3/4 with same circuit)
Q_R1   | S8050 NPN logic-level       | SOT-23          | B:RELAY1_DRV_via_R_GR1, C:NET_COIL1, E:GND_STAR
R_GR1  | 100R 5%                     | R_0805          | (1):RELAY1_DRV, (2):Q_R1_B
D_FLY1 | 1N4148                      | SOD-123         | K:+5V_RELAY_RAW, A:RELAY1_COIL-
R_PD_R1| 100k 5%                     | R_0805          | (1):Q_R1_B, (2):GND_STAR
K1     | SRD-05VDC-SL-C              | RELAY_SRD_5V    | Coil+:NET_COIL1, Coil-:RELAY1_COIL-
F_R1_SNUB| 100R 1W + 0.1uF X2 275VAC | 1206/1812      | parallel across COM-NO contacts
F_R1_MOV| MOV 275VAC (optional)       | DISC_10MM       | parallel across COM-NO contacts
J_R1   | Terminal block 3P 7.62mm   | CONN_TB_7.62_3P | Pin1:COM, Pin2:NO, Pin3:NC

# RELAY 2: Q_R2, R_GR2, D_FLY2, K2, F_R2_SNUB, F_R2_MOV, J_R2 (identical)
# RELAY 3: Q_R3, R_GR3, D_FLY3, K3, F_R3_SNUB, F_R3_MOV, J_R3 (identical)
# RELAY 4: Q_R4, R_GR4, D_FLY4, K4, F_R4_SNUB, F_R4_MOV, J_R4 (identical)

# ==============================================================
# SHEET 10: DHT22 + TVS (per spec B10)
# ==============================================================

J_DHT  | Terminal block 3P 3.81mm    | CONN_3.81_3P    | Pin1:+3V3_ANA, Pin2:GND_STAR, Pin3:DHT22_RAW
U_DHT22| DHT22 / AM2302             | DHT22_TH        | VCC:+3V3_ANA, DATA:DHT22_RAW, GND:GND_STAR
R_DHT_PU| 4.7k 5%                    | R_0805          | (1):+3V3_ANA, (2):DHT22_RAW
D_DHT_ESD| TVS SMBJ5.0A              | SOD-123         | K:DHT22_RAW, A:GND_STAR

# ==============================================================
# SHEET 11: DS18B20 + TVS (per spec B11)
# ==============================================================

J_DS   | Terminal block 3P 3.81mm    | CONN_3.81_3P    | Pin1:+3V3_ANA, Pin2:GND_STAR, Pin3:DS18B20_RAW
U_DS18B20| DS18B20                  | TO-92           | VCC:+3V3_ANA, DATA:DS18B20_RAW, GND:GND_STAR
R_DS_PU | 4.7k 5%                    | R_0805          | (1):+3V3_ANA, (2):DS18B20_RAW
D_DS_ESD| TVS SMBJ5.0A               | SOD-123         | K:DS18B20_RAW, A:GND_STAR

# ==============================================================
# SHEET 12: SOIL MOISTURE + ADS_A3 (per spec B12)
# ==============================================================

J_SOIL | Terminal block 3P 3.81mm    | CONN_3.81_3P    | Pin1:+3V3_ANA, Pin2:GND_STAR, Pin3:SOIL_RAW
R_SOIL_SER| 1k 5%                    | R_0805          | (1):SOIL_RAW, (2):NET_SOIL_SER
C_SOIL  | 100nF 16V X7R              | C_0805          | (+):NET_SOIL_SER, (-):GND_STAR
D_SOIL_ESD| TVS SMBJ5.0A             | SOD-123         | K:NET_SOIL_SER, A:GND_STAR
# SOIL_RAW connects directly to ADS1115 A3

# ==============================================================
# SHEET 13: BATTERY/VIN SENSE + CLAMPING (per spec B13)
# ==============================================================

J_VBAT | Terminal block 2P 5.08mm    | CONN_5.08_2P    | Pin1:+12V_PROTECTED, Pin2:GND_STAR
R_VTOP | 100k 1%                     | R_0805          | (1):+12V_PROTECTED, (2):NET_VIN_DIV
R_VBOT | 33k 1%                      | R_0805          | (1):NET_VIN_DIV, (2):GND_STAR
C_VSENSE| 100nF 16V X7R              | C_0805          | (+):NET_VIN_DIV, (-):GND_STAR
R_VSENSE_SER_B| 1k 5%                | R_0805          | (1):NET_VIN_DIV, (2):VIN_SENSE_RAW
D_VSENSE_CLAMP| BAT54S                | SOT-23          | A:VIN_SENSE_RAW, K:+3V3_ESP (clamp)

# ==============================================================
# SHEET 14: ADS1115 4-CHANNEL ADC (per spec B14)
# ==============================================================

U_ADS  | ADS1115IDGSR                | MSOP-8          | VDD:+3V3_ANA, GND:GND_STAR
        |                             |                  | SDA:I2C_SDA, SCL:I2C_SCL
        |                             |                  | ADDR:GND_STAR (addr 0x48)
        |                             |                  | ALERT:NC
        |                             |                  | A0:ADS_A0 (battery sense), A1:ADS_A1
        |                             |                  | A2:ADS_A2, A3:SOIL_RAW
C_ADS1 | 100nF 16V X7R               | C_0805          | (+):+3V3_ANA, (-):GND_STAR
C_ADS2 | 10uF 16V X7R                | C_0805          | (+):+3V3_ANA, (-):GND_STAR
R_ADC_SCL_PU| 4.7k 5%               | R_0805          | (1):I2C_SCL, (2):+3V3_ANA
R_ADC_SDA_PU| 4.7k 5%               | R_0805          | (1):I2C_SDA, (2):+3V3_ANA
R_A0_SER| 1k 5%                      | R_0805          | (1):ADS_A0, (2):NET_VIN_DIV
D_A0_ESD| TVS SMBJ5.0A               | SOD-123         | K:ADS_A0, A:GND_STAR
R_A1_SER| 1k 5%                      | R_0805          | (1):ADS_A1, (2):NET_PH_RAW
D_A1_ESD| TVS SMBJ5.0A               | SOD-123         | K:ADS_A1, A:GND_STAR
R_A2_SER| 1k 5%                      | R_0805          | (1):ADS_A2, (2):NET_TDS_RAW
D_A2_ESD| TVS SMBJ5.0A               | SOD-123         | K:ADS_A2, A:GND_STAR
R_A3_SER| 1k 5%                      | R_0805          | (1):ADS_A3, (2):SOIL_RAW
D_A3_ESD| TVS SMBJ5.0A               | SOD-123         | K:ADS_A3, A:GND_STAR

J_AIN  | Terminal block 6P 3.81mm    | CONN_3.81_6P    | 1:NET_PH_RAW, 2:NET_TDS_RAW, 3:NET_DO_RAW, 4-6:GND_STAR

# ==============================================================
# SHEET 15: I2C BUS + ESD + SERIES RESISTORS (per spec B15)
# ==============================================================

J_I2C_EXT| Terminal block 4P 3.81mm   | CONN_3.81_4P    | 1:+3V3_ESP, 2:I2C_SCL, 3:I2C_SDA, 4:GND_STAR
R_I2C_SCL_SER| 22R 5%               | R_0805          | (1):I2C_SCL, (2):J_I2C_SCL_pin
R_I2C_SDA_SER| 22R 5%               | R_0805          | (1):I2C_SDA, (2):J_I2C_SDA_pin
R_I2C_SCL_PU| 4.7k 5%               | R_0805          | (1):I2C_SCL, (2):+3V3_ANA
R_I2C_SDA_PU| 4.7k 5%               | R_0805          | (1):I2C_SDA, (2):+3V3_ANA
D_I2C_SCL_ESD| TVS SMBJ5.0A          | SOD-123         | K:I2C_SCL, A:GND_STAR
D_I2C_SDA_ESD| TVS SMBJ5.0A          | SOD-123         | K:I2C_SDA, A:GND_STAR
U_BME280| BME280 (optional)           | BME280_I2C      | VCC:+3V3_ESP, GND:GND_STAR, SCL:I2C_SCL, SDA:I2C_SDA
U_OLED | OLED 0.96 I2C (optional)     | OLED_I2C        | VCC:+3V3_ESP, GND:GND_STAR, SCL:I2C_SCL, SDA:I2C_SDA

# ==============================================================
# SHEET 16: MicroSD + SERIES RESISTORS (per spec B16)
# ==============================================================

U_SDCARD| MicroSD Socket             | MICROSD         | VCC:+3V3_ESP, GND:GND_STAR
        |                             |                  | DAT0:SD_MISO, DAT1:SD_MOSI, CMD:SD_MOSI, CLK:SD_SCK
        |                             |                  | DAT3:SD_CS, DET:NET_SD_DET
R_SD_SCK| 22R 5%                     | R_0805          | (1):SPI_SCK, (2):SD_SCK
R_SD_MOSI| 22R 5%                    | R_0805          | (1):SPI_MOSI, (2):SD_MOSI
R_SD_MISO| 22R 5%                    | R_0805          | (1):SD_MISO, (2):SPI_MISO
R_SD_CS | 10k 5%                     | R_0805          | (1):SD_CS, (2):+3V3_ESP (pull-up)
R_SD_DET_PU| 10k 5%                  | R_0805          | (1):NET_SD_DET, (2):+3V3_ESP
C_SD_DEC| 100nF 10V X7R              | C_0805          | (+):+3V3_ESP, (-):GND_STAR

# ==============================================================
# SHEET 17: DEBUG HEADER + TEST POINTS (per spec B17)
# ==============================================================

J_DEBUG | Terminal block 4P 3.81mm    | CONN_3.81_4P    | 1:+3V3_ESP, 2:UART0_TX, 3:UART0_RX, 4:GND_STAR

TP_12V  | Test Point                  | TP              | +12V_PROTECTED
TP_5V   | Test Point                  | TP              | +5V_SYS
TP_3V3_ESP| Test Point                | TP              | +3V3_ESP
TP_3V3_ANA| Test Point                | TP              | +3V3_ANA
TP_GND  | Test Point                  | TP              | GND_STAR
TP_UART_TX| Test Point                | TP              | UART0_TX
TP_UART_RX| Test Point                | TP              | UART0_RX
TP_EN   | Test Point                  | TP              | EN_ESP
TP_BOOT | Test Point                  | TP              | BOOT_ESP
TP_I2C  | Test Point                  | TP              | I2C_SCL and I2C_SDA
TP_WD   | Test Point                  | TP              | WATCHDOG_KICK
TP_POWER_GOOD| Test Point             | TP              | POWER_GOOD
TP_RELAY_EN| Test Point               | TP              | RELAY_EN
TP_BOOT_OK| Test Point                | TP              | BOOT_OK

# ==============================================================
# SHEET 18: IO EXPANDER (EXPANSION) — per expansion plan
# ==============================================================

U_EXP1 | MCP23017T-E/SS              | SSOP-28         | VDD:+3V3_ESP, GND:GND_STAR
        |                             |                  | SCL:I2C_SCL, SDA:I2C_SDA
        |                             |                  | RESET:+3V3_ESP
        |                             |                  | A0:GND_STAR, A1:GND_STAR, A2:GND_STAR (addr 0x20)
        |                             |                  | GPA0:EXP1_GPIO0 (RELAY5_DRV)
        |                             |                  | GPA1:EXP1_GPIO1 (RELAY6_DRV)
        |                             |                  | GPA2:EXP1_GPIO2 (RELAY7_DRV)
        |                             |                  | GPA3:EXP1_GPIO3 (RELAY8_DRV)
        |                             |                  | GPA4..7:EXP1_GPIO4..7 (spare)
        |                             |                  | INTA:EXP1_INTA, INTB:EXP1_INTB

U_EXP2 | MCP23017T-E/SS              | SSOP-28         | VDD:+3V3_ESP, GND:GND_STAR
        |                             |                  | SCL:I2C_SCL, SDA:I2C_SDA
        |                             |                  | RESET:+3V3_ESP
        |                             |                  | A0:+3V3_ESP, A1:GND_STAR, A2:GND_STAR (addr 0x21)
        |                             |                  | GPA0..7:EXP2_GPIO0..7 (spare)
        |                             |                  | GPB0..7:EXP2_GPIOB0..7 (spare)
        |                             |                  | INTA:EXP2_INTA, INTB:EXP2_INTB

C_EXP1_DEC1| 100nF 10V X7R            | C_0805          | (+):+3V3_ESP, (-):GND_STAR
C_EXP1_DEC2| 10uF 16V X7R             | C_0805          | (+):+3V3_ESP, (-):GND_STAR
C_EXP2_DEC1| 100nF 10V X7R            | C_0805          | (+):+3V3_ESP, (-):GND_STAR
C_EXP2_DEC2| 10uF 16V X7R             | C_0805          | (+):+3V3_ESP, (-):GND_STAR

# ==============================================================
# SHEET 19: EXPANSION RELAYS 5-8 (via MCP23017)
# ==============================================================

Q_R5   | S8050 NPN logic-level       | SOT-23          | B:EXP1_GPIO0, C:NET_COIL5, E:GND_STAR
R_GR5  | 100R 5%                     | R_0805          | (1):EXP1_GPIO0, (2):Q_R5_B
D_FLY5 | 1N4148                      | SOD-123         | K:+5V_RELAY_RAW, A:RELAY5_COIL-
RELAY5 | SRD-05VDC-SL-C (optional)   | RELAY_SRD_5V    | Coil+:NET_COIL5, Coil-:RELAY5_COIL-
F_R5_SNUB| 100R 1W + 0.1uF X2 275VAC | 1206/1812      | parallel across COM-NO
J_R5   | Terminal block 3P 7.62mm   | CONN_TB_7.62_3P | Pin1:COM, Pin2:NO, Pin3:NC

# RELAY 6-8: Q_R6..R8, R_GR6..8, D_FLY6..8, RELAY6..8, F_R6..8_SNUB, J_R6..8

# ==============================================================
# SHEET 20: EXTERNAL CONNECTORS
# ==============================================================

J_EXP_HEADER| 2x5 Header 5.08mm       | CONN_5.08_2x5   | 1:+3V3_ESP, 2:GND_STAR
        |                             |                  | 3:EXP1_GPIO4, 4:EXP1_GPIO5, 5:EXP1_GPIO6, 6:EXP1_GPIO7
        |                             |                  | 7:EXP2_GPIOB0, 8:EXP2_GPIOB1, 9:EXP2_GPIOB2, 10:EXP2_GPIOB3
J_PWR_EXT| 7.62mm 2P                 | CONN_7.62_2P    | 1:+12V_PROTECTED, 2:GND_STAR

# ESD on expansion GPIO
D_EXP_ESD1..4| ESD SOT-23              | SOT-23          | A:EXP1_GPIO4..7, K:+3V3_ESP

# Mounting holes M3
J_MOUNT1..4| M3 Hole 3.2mm           | M3_HOLE         | Mechanical, no electrical

# ==============================================================
# NET LIST (COMPLETE)
# ==============================================================

## POWER NETS
GND_STAR         → Single-point ground reference
+12V_IN          → Raw 12V from TB1
+12V_FUSED       → After F1 (2A slow-blow)
+12V_SURGE       → After R_SURGE + L_SURGE
+12V_PROTECTED   → After Q_PROTECT reverse-polarity protection
+5V_MAIN         → MP1584 #1 output (buck 12V→5V)
+5V_SYS          → After OR-ing diodes (USB + main)
+5V_RELAY_RAW    → After R_RELAY_LIM (0.5Ω), before relay coils
+3V3_MAIN        → MP1584 #2 output (buck 12V→3.3V)
+3V3_ESP         → After FB_ESP ferrite bead
+3V3_ANA         → After FB_ANA ferrite bead
USB_5V           → USB VBUS
USB_5V_RAW       → After PTC fuse
USB_5V_FUSED     → After R_USB_LIM current limit
SW_5V            → Buck #1 switching node
SW_3V3           → Buck #2 switching node
FB_5V            → Buck #1 feedback
FB_3V3           → Buck #2 feedback
EN_5V            → Buck #1 enable
EN_3V3           → Buck #2 enable
BST_5V            → Buck #1 bootstrap
BST_3V3           → Buck #2 bootstrap
NET_SURGE_NODE   → Between R_SURGE and L_SURGE
GATE_PROTECT     → P-MOSFET gate control

## SIGNAL NETS
UART0_TX         → ESP32 IO1 → CP2102 RX
UART0_RX         → ESP32 IO3 ← CP2102 TX
I2C_SCL          → ESP32 IO22 → ADS1115, MCP23017 ×2, BME280, OLED (pull-ups to +3V3_ANA)
I2C_SDA          → ESP32 IO21 → ADS1115, MCP23017 ×2, BME280, OLED (pull-ups to +3V3_ANA)
DTR_USB          → CP2102 DTR → Q_RST base
RTS_USB          → CP2102 RTS → Q_BOOT base
WATCHDOG_KICK    → ESP32 IO4 → TPL5010 DONE
WATCHDOG_RST     → TPL5010 RESET → EN_ESP (via D_RST BAT54S)
EN_ESP           → ESP32 enable (from Q_RST or TPL5010)
BOOT_ESP         → ESP32 boot (from Q_BOOT)
RELAY1_DRV       → ESP32 IO26 → Q_R1 base
RELAY2_DRV       → ESP32 IO27 → Q_R2 base
RELAY3_DRV       → ESP32 IO25 → Q_R3 base
RELAY4_DRV       → ESP32 IO14 → Q_R4 base
DHT22_RAW        → ESP32 IO33 → DHT22 DATA (via 100Ω series + TVS SMBJ5.0A)
DS18B20_RAW      → ESP32 IO32 → DS18B20 DATA (via 100Ω series + TVS SMBJ5.0A)
VIN_SENSE_RAW    → ESP32 IO35 → via R_VSENSE_SER 1k + BAT54S clamp
SOIL_RAW         → ADS1115 A3 (direct, with TVS SMBJ5.0A)
ADS_A0           → ADS1115 A0 → battery sense (via 1k series + TVS)
ADS_A1           → ADS1115 A1 → pH sensor input (via 1k series + TVS)
ADS_A2           → ADS1115 A2 → TDS/DO sensor input (via 1k series + TVS)
ADS_A3           → ADS1115 A3 → SOIL_RAW
NET_VIN_DIV      → Voltage divider output (100k/33k)
NET_PH_RAW       → pH sensor raw input
NET_TDS_RAW      → TDS sensor raw input
NET_DO_RAW       → DO sensor raw input
SD_CS            → ESP32 IO5 → MicroSD DAT3
SD_SCK           → ESP32 IO18 → MicroSD CLK (via 22Ω)
SD_MOSI          → ESP32 IO23 → MicroSD CMD (via 22Ω)
SD_MISO          → ESP32 IO19 ← MicroSD DAT0 (via 22Ω)
NET_SD_DET       → MicroSD card detect
LED_WIFI_CTRL    → ESP32 IO16 (active-LOW → LED sinks current)
LED_MQTT_CTRL     → ESP32 IO17 (active-LOW)
LED_ERROR_CTRL   → ESP32 IO13 (active-LOW)
POWER_GOOD       → Power status indicator (net from LDO power-good if available)
RELAY_EN         → Hardware relay enable (firmware controlled, pull-down default OFF)
BOOT_OK          → Firmware boot complete signal (firmware sets GPIO1 HIGH)

## EXPANSION NETS
EXP1_GPIO0..7    → MCP23017 #1 port A (GPIO0..3 = RELAY5..8)
EXP2_GPIO0..7    → MCP23017 #2 port A
EXP2_GPIOB0..7   → MCP23017 #2 port B
EXP1_INTA/B      → Interrupt outputs from MCP23017 #1
EXP2_INTA/B      → Interrupt outputs from MCP23017 #2
NET_COIL1..5     → Relay coil positive nodes
RELAY1_COIL-..5  → Relay coil negative nodes
NET_RLY1_COM/NO/NC → Relay 1 contact positions
NET_RLY5_COM/NO  → Relay 5 contact positions
NET_LED_PWR/WIFI/MQTT/ERR → LED anode nodes

## TEST POINT NETS
TP_12V, TP_5V, TP_3V3_ESP, TP_3V3_ANA, TP_GND,
TP_UART_TX, TP_UART_RX, TP_EN, TP_BOOT,
TP_I2C, TP_WD, TP_POWER_GOOD, TP_RELAY_EN, TP_BOOT_OK
