# EcoSynTech PCB v6.3 Final — Schematic Netlist
# ==============================================================

## SHEET 1: POWER INPUT & PROTECTION
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| TB1 | Terminal Block 2P 5.08mm | CONN_5.08_2P | 1→+12V_IN, 2→GND_STAR |
| F1 | Fuse 2A Slow-Blow 250V | FUSE_HOLDER_5x20 | 1→+12V_IN, 2→+12V_FUSED |
| GDT1 | GDT Bourns 2027-09-B | DIP_7.5mm | 1→+12V_FUSED, 2→GND_STAR |
| MOV1 | Varistor 14D201K | DISC_14MM | 1→+12V_FUSED, 2→GND_STAR |
| R_SURGE1 | 5.6R 2W 5% | R_2512 | 1→+12V_FUSED, 2→NET025 |
| L_SURGE1 | 22uH >=2A | RADIAL_8x10 | 1→NET025, 2→+12V_SURGE |
| D_TVS1 | TVS SMBJ24A | DO-214AA | K→+12V_SURGE, A→GND_STAR |
| Q_PROTECT | P-MOSFET AO4407A | SO-8 | S→+12V_SURGE, D→+12V_PROTECTED, G→GATE_PROTECT |
| R_G1 | 100k 1% | R_0805 | 1→GATE_PROTECT, 2→+12V_SURGE |
| R_G2 | 100k 1% | R_0805 | 1→GATE_PROTECT, 2→GND_STAR |
| DZ_G1 | Zener 15V | SOD-123 | 1→GATE_PROTECT, 2→+12V_SURGE |
| C1 | 470uF 25V Low-ESR 105C | CAP_D8x11.5 | +→+12V_PROTECTED, -→GND_STAR |
| C2 | 1uF 50V X7R | C_1210 | +→+12V_PROTECTED, -→GND_STAR |
| C3 | 100nF 50V X7R | C_0805 | +→+12V_PROTECTED, -→GND_STAR |

## SHEET 2: BUCK REGULATOR 12V→5V (MP1584EN-LF-Z)
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U2_5V | MP1584EN-LF-Z | SOIC-8E | VIN→+12V_PROTECTED, GND→GND_STAR, SW→SW_5V, FB→FB_5V, EN→EN_5V, BST→BST_5V |
| CIN_5V1 | 22uF 50V X7R | C_1210 | +→+12V_PROTECTED, -→GND_STAR |
| CIN_5V2 | 100nF 50V X7R | C_0805 | +→+12V_PROTECTED, -→GND_STAR |
| L_5V | 10uH >=3A Low-DCR | SMD_6x6 | 1→SW_5V, 2→+5V_MAIN |
| COUT_5V1 | 22uF 16V X7R | C_1210 | +→+5V_MAIN, -→GND_STAR |
| COUT_5V2 | 22uF 16V X7R | C_1210 | +→+5V_MAIN, -→GND_STAR |
| COUT_5V3 | 100nF 16V X7R | C_0805 | +→+5V_MAIN, -→GND_STAR |
| R_FB1_5V | 10k 1% | R_0805 | 1→FB_5V, 2→GND_STAR |
| R_FB2_5V | 52.3k 1% | R_0805 | 1→FB_5V, 2→+5V_MAIN |
| R_EN_5V | 100k 1% | R_0805 | 1→EN_5V, 2→+5V_MAIN |
| D_OUT5V | Schottky 30V 2A | SOD-123 | A→SW_5V, K→+5V_MAIN |

## SHEET 3: LDO 5V→3.3V
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_3V3_ESP | AMS1117-3.3 or TLV70033 | SOT-223 | VIN→+5V_MAIN, GND→GND_STAR, VOUT→+3V3_ESP |
| U_3V3_ANA | LP5907 (low-noise) | SOT-223 | VIN→+5V_MAIN, GND→GND_STAR, VOUT→+3V3_ANA |
| C_3V3_ESP1 | 22uF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| C_3V3_ESP2 | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| C_3V3_ANA1 | 22uF 16V X7R | C_0805 | +→+3V3_ANA, -→GND_STAR |
| C_3V3_ANA2 | 100nF 16V X7R | C_0805 | +→+3V3_ANA, -→GND_STAR |
| C_3V3_ANA3 | 10nF 16V X7R | C_0805 | +→+3V3_ANA, -→GND_STAR |

## SHEET 4: ESP32-WROOM-32E Module
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_ESP32 | ESP32-WROOM-32E | ESP32-WROOM-32E | 3V3→+3V3_ESP, GND→GND_STAR, EN→EN_ESP, BOOT→BOOT_ESP |
| | | | TXD0→UART0_TX, RXD0→UART0_RX |
| | | | GPIO0→GPIO0, GPIO1→GPIO1, GPIO2→GPIO2 |
| | | | GPIO4→WATCHDOG_KICK, GPIO12→RELAY1_DRV, GPIO13→RELAY2_DRV |
| | | | GPIO14→RELAY3_DRV, GPIO15→RELAY4_DRV |
| | | | GPIO21→I2C_SDA, GPIO22→I2C_SCL |
| | | | GPIO23→SPI_MOSI, GPIO5→SD_CS |
| | | | GPIO18→SPI_SCK, GPIO19→SPI_MISO |
| | | | GPIO4→DHT22_DATA, GPIO2→DS18B20_DATA |
| | | | GPIO16→WATCHDOG_KICK, GPIO17→NET_EXTRA |
| C_ESP_DEC1-3 | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| R_EN_PU | 10k 5% | R_0805 | 1→EN_ESP, 2→+3V3_ESP |
| R_BOOT_PU | 10k 5% | R_0805 | 1→BOOT_ESP, 2→+3V3_ESP |
| R_GPIO0_PD | 10k 5% | R_0805 | 1→GPIO0, 2→GND_STAR |
| LED_POWER | Green LED 0805 | LED_0805 | A→NET_LED_PWR, K→GND_STAR |
| R_LED_PWR | 470R 5% | R_0805 | 1→POWER_GOOD, 2→NET_LED_PWR |
| LED_WIFI | Blue LED 0805 | LED_0805 | A→NET_LED_WIFI, K→GND_STAR |
| R_LED_WIFI | 470R 5% | R_0805 | 1→WIFI_STATUS, 2→NET_LED_WIFI |
| LED_MQTT | Yellow LED 0805 | LED_0805 | A→NET_LED_MQTT, K→GND_STAR |
| R_LED_MQTT | 470R 5% | R_0805 | 1→MQTT_STATUS, 2→NET_LED_MQTT |
| LED_ERROR | Red LED 0805 | LED_0805 | A→NET_LED_ERR, K→GND_STAR |
| R_LED_ERR | 470R 5% | R_0805 | 1→ERROR_STATUS, 2→NET_LED_ERR |

## SHEET 5: USB-UART Bridge (CP2102N)
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_USB_UART | CP2102N-A02 | QFN-20 | VDD→+5V_MAIN, GND→GND_STAR |
| | | | D+→USB_D_P, D-→USB_D_N |
| | | | TXD→UART0_TX, RXD→UART0_RX |
| C_USB_DEC1 | 100nF 16V X7R | C_0805 | +→+5V_MAIN, -→GND_STAR |
| C_USB_DEC2 | 1uF 16V X7R | C_0805 | +→+5V_MAIN, -→GND_STAR |
| R_USB_PU_D+ | 1.5k 5% | R_0805 | 1→USB_D_P, 2→+5V_MAIN |
| R_USB_PU_D- | 1.5k 5% | R_0805 | 1→USB_D_N, 2→+5V_MAIN |
| J_USB | USB Micro-B | USB_MICRO_B | VBUS→USB_5V, D+→USB_D_P, D-→USB_D_N, GND→GND_STAR |
| F_USB | 500mA PTC | R_0805 | 1→USB_5V, 2→NET_USB_FUSED |
| D_USB_OVP | TVS SMDJ5.0CA | SOD-123 | 1→NET_USB_FUSED, 2→GND_STAR |
| C_USB_Bulk | 10uF 16V X7R | C_0805 | +→NET_USB_FUSED, -→GND_STAR |

## SHEET 6: ADS1115 4-Channel ADC
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_ADS1115 | ADS1115IDGSR | MSOP-8 | VDD→+3V3_ANA, GND→GND_STAR |
| | | | SCL→I2C_SCL, SDA→I2C_SDA, ALERT→REN_ADS |
| | | | A0→ADS_A0, A1→ADS_A1, A2→ADS_A2, A3→ADS_A3 |
| | | | ADDR→GND_STAR |
| C_ADS_VDD | 100nF 16V X7R | C_0805 | +→+3V3_ANA, -→GND_STAR |
| C_ADS_VDD2 | 10uF 16V X7R | C_0805 | +→+3V3_ANA, -→GND_STAR |
| R_ADS_SCL_PU | 4.7k 5% | R_0805 | 1→I2C_SCL, 2→+3V3_ANA |
| R_ADS_SDA_PU | 4.7k 5% | R_0805 | 1→I2C_SDA, 2→+3V3_ANA |
| R_VIN_DIV1 | 100k 1% | R_0805 | 1→NET_VIN_RAW, 2→NET_VIN_SENSE |
| R_VIN_DIV2 | 33k 1% | R_0805 | 1→NET_VIN_SENSE, 2→GND_STAR |
| C_VIN_FILT | 100nF 16V X7R | C_0805 | +→NET_VIN_SENSE, -→GND_STAR |
| R_PH_DIV1 | 100k 1% | R_0805 | 1→NET_PH_RAW, 2→ADS_A1 |
| R_PH_DIV2 | 47k 1% | R_0805 | 1→ADS_A1, 2→GND_STAR |
| C_PH_FILT | 100nF 16V X7R | C_0805 | +→ADS_A1, -→GND_STAR |
| R_TDS_DIV1 | 100k 1% | R_0805 | 1→NET_TDS_RAW, 2→ADS_A2 |
| R_TDS_DIV2 | 47k 1% | R_0805 | 1→ADS_A2, 2→GND_STAR |
| C_TDS_FILT | 100nF 16V X7R | C_0805 | +→ADS_A2, -→GND_STAR |
| R_DO_DIV1 | 100k 1% | R_0805 | 1→NET_DO_RAW, 2→ADS_A3 |
| R_DO_DIV2 | 47k 1% | R_0805 | 1→ADS_A3, 2→GND_STAR |
| C_DO_FILT | 100nF 16V X7R | C_0805 | +→ADS_A3, -→GND_STAR |

## SHEET 7: Core Sensors
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_DHT22 | DHT22 | DHT22_TH | VCC→+3V3_ANA, DATA→DHT22_DATA, GND→GND_STAR |
| R_DHT_PU | 4.7k 5% | R_0805 | 1→+3V3_ANA, 2→DHT22_DATA |
| U_DS18B20 | DS18B20 | TO-92 | VCC→+3V3_ANA, DATA→DS18B20_DATA, GND→GND_STAR |
| R_DS18B20_PU | 4.7k 5% | R_0805 | 1→+3V3_ANA, 2→DS18B20_DATA |
| J_SOIL | Soil Sensor 3P 5.08mm | CONN_5.08_3P | 1→+3V3_ANA, 2→SOIL_RAW, 3→GND_STAR |
| R_SOIL_DIV1 | 10k 1% | R_0805 | 1→SOIL_RAW, 2→NET_SOIL_SENSE |
| R_SOIL_DIV2 | 10k 1% | R_0805 | 1→NET_SOIL_SENSE, 2→GND_STAR |
| C_SOIL_FILT | 100nF 16V X7R | C_0805 | +→NET_SOIL_SENSE, -→GND_STAR |

## SHEET 8: MicroSD Card
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_SDCARD | MicroSD Socket | MICROSD | DAT0→SD_MISO, DAT1→SD_MOSI, CMD→SD_MOSI, CLK→SD_SCK |
| | | | VCC→+3V3_ESP, GND→GND_STAR, DET→NET_SD_DET |
| C_SD_DEC1 | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| R_SD_DET_PU | 10k 5% | R_0805 | 1→NET_SD_DET, 2→+3V3_ESP |
| R_SD_CS | 10k 5% | R_0805 | 1→SD_CS, 2→+3V3_ESP |
| R_SD_MOSI_PU | 10k 5% | R_0805 | 1→SD_MOSI, 2→+3V3_ESP |
| R_SD_MISO_PU | 10k 5% | R_0805 | 1→SD_MISO, 2→+3V3_ESP |

## SHEET 9: 4 Relay Drivers + RC Snubbers
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| Q_RLY1 | NPN S8050 | SOT-23 | B→RELAY1_DRV, C→NET_COIL1, E→GND_STAR |
| R_RLY1_BASE | 4.7k 5% | R_0805 | 1→RELAY1_DRV, 2→NET_RLY1_BASE |
| D_RLY1_FW | Schottky 40V 1A | SOD-123 | A→NET_COIL1, K→+5V_MAIN |
| D_RLY1_RV | Schottky 40V 1A | SOD-123 | A→GND_STAR, K→NET_COIL1 |
| RELAY1 | Relay 5V SPDT 10A | RELAY_SPDT_5V | COIL+→NET_COIL1, COIL-→GND_STAR |
| | | | COM1→NET_RLY1_COM, NC1→NET_RLY1_NC, NO1→NET_RLY1_NO |
| R_RLY1_SNUB | 10R 5% | R_0805 | 1→NET_RLY1_COM, 2→NET_RLY1_NO |
| C_RLY1_SNUB | 100nF 50V X7R | C_0805 | +→NET_RLY1_COM, -→NET_RLY1_NO |
| Q_RLY2 | NPN S8050 | SOT-23 | B→RELAY2_DRV, C→NET_COIL2, E→GND_STAR |
| R_RLY2_BASE | 4.7k 5% | R_0805 | 1→RELAY2_DRV, 2→NET_RLY2_BASE |
| D_RLY2_FW | Schottky 40V 1A | SOD-123 | A→NET_COIL2, K→+5V_MAIN |
| D_RLY2_RV | Schottky 40V 1A | SOD-123 | A→GND_STAR, K→NET_COIL2 |
| RELAY2 | Relay 5V SPDT 10A | RELAY_SPDT_5V | COIL+→NET_COIL2, COIL-→GND_STAR |
| R_RLY2_SNUB | 10R 5% | R_0805 | 1→NET_RLY2_COM, 2→NET_RLY2_NO |
| C_RLY2_SNUB | 100nF 50V X7R | C_0805 | +→NET_RLY2_COM, -→NET_RLY2_NO |
| Q_RLY3 | NPN S8050 | SOT-23 | B→RELAY3_DRV, C→NET_COIL3, E→GND_STAR |
| R_RLY3_BASE | 4.7k 5% | R_0805 | 1→RELAY3_DRV, 2→NET_RLY3_BASE |
| D_RLY3_FW | Schottky 40V 1A | SOD-123 | A→NET_COIL3, K→+5V_MAIN |
| D_RLY3_RV | Schottky 40V 1A | SOD-123 | A→GND_STAR, K→NET_COIL3 |
| RELAY3 | Relay 5V SPDT 10A | RELAY_SPDT_5V | COIL+→NET_COIL3, COIL-→GND_STAR |
| R_RLY3_SNUB | 10R 5% | R_0805 | 1→NET_RLY3_COM, 2→NET_RLY3_NO |
| C_RLY3_SNUB | 100nF 50V X7R | C_0805 | +→NET_RLY3_COM, -→NET_RLY3_NO |
| Q_RLY4 | NPN S8050 | SOT-23 | B→RELAY4_DRV, C→NET_COIL4, E→GND_STAR |
| R_RLY4_BASE | 4.7k 5% | R_0805 | 1→RELAY4_DRV, 2→NET_RLY4_BASE |
| D_RLY4_FW | Schottky 40V 1A | SOD-123 | A→NET_COIL4, K→+5V_MAIN |
| D_RLY4_RV | Schottky 40V 1A | SOD-123 | A→GND_STAR, K→NET_COIL4 |
| RELAY4 | Relay 5V SPDT 10A | RELAY_SPDT_5V | COIL+→NET_COIL4, COIL-→GND_STAR |
| R_RLY4_SNUB | 10R 5% | R_0805 | 1→NET_RLY4_COM, 2→NET_RLY4_NO |
| C_RLY4_SNUB | 100nF 50V X7R | C_0805 | +→NET_RLY4_COM, -→NET_RLY4_NO |

## SHEET 10: Hardware Watchdog (TPL5010)
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_WD | TPL5010DDCT | DFN-8 | VDD→+3V3_ESP, GND→GND_STAR, DONE→WATCHDOG_KICK, RST→WATCHDOG_RST |
| R_WD_DONE_PU | 10k 5% | R_0805 | 1→WATCHDOG_KICK, 2→+3V3_ESP |
| C_WD_FILT | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| R_WD_WAKE | 10k 5% | R_0805 | 1→NET_WD_WAKE, 2→GND_STAR |
| J_WD_DQ | WD Test Point 5.08mm | CONN_5.08_2P | 1→NET_WD_DQ, 2→GND_STAR |

## SHEET 11: I2C Expansion Bus
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| J_I2C_EXP | I2C Bus 5.08mm Header 4P | CONN_5.08_4P | 1→+3V3_ESP, 2→I2C_SCL, 3→I2C_SDA, 4→GND_STAR |
| R_I2C_SCL_PU | 4.7k 5% | R_0805 | 1→I2C_SCL, 2→+3V3_ESP |
| R_I2C_SDA_PU | 4.7k 5% | R_0805 | 1→I2C_SDA, 2→+3V3_ESP |
| U_BME280 | BME280 (optional) | BME280_I2C | VCC→+3V3_ESP, GND→GND_STAR, SCL→I2C_SCL, SDA→I2C_SDA |
| U_OLED | OLED 0.96 I2C (optional) | OLED_I2C | VCC→+3V3_ESP, GND→GND_STAR, SCL→I2C_SCL, SDA→I2C_SDA |

## SHEET 12: IO Expander MCP23017 (Expansion)
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| U_EXP1 | MCP23017T-E/SS | SSOP-28 | VDD→+3V3_ESP, GND→GND_STAR, SCL→I2C_SCL, SDA→I2C_SDA |
| | | | RESET→+3V3_ESP, A0→GND_STAR, A1→GND_STAR, A2→GND_STAR |
| | | | GPA0→EXP1_GPIO0 (RELAY5_DRV), GPA1→EXP1_GPIO1 (RELAY6_DRV) |
| | | | GPA2→EXP1_GPIO2 (RELAY7_DRV), GPA3→EXP1_GPIO3 (RELAY8_DRV) |
| | | | GPA4→EXP1_GPIO4, GPA5→EXP1_GPIO5, GPA6→EXP1_GPIO6, GPA7→EXP1_GPIO7 |
| | | | INTA→EXP1_INTA, INTB→EXP1_INTB |
| U_EXP2 | MCP23017T-E/SS | SSOP-28 | VDD→+3V3_ESP, GND→GND_STAR, SCL→I2C_SCL, SDA→I2C_SDA |
| | | | RESET→+3V3_ESP, A0→+3V3_ESP, A1→GND_STAR, A2→GND_STAR |
| | | | GPA0→EXP2_GPIO0, GPA1→EXP2_GPIO1, GPA2→EXP2_GPIO2, GPA3→EXP2_GPIO3 |
| | | | GPA4→EXP2_GPIO4, GPA5→EXP2_GPIO5, GPA6→EXP2_GPIO6, GPA7→EXP2_GPIO7 |
| | | | INTA→EXP2_INTA, INTB→EXP2_INTB |
| C_EXP1_DEC1 | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| C_EXP1_DEC2 | 10uF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| C_EXP2_DEC1 | 100nF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |
| C_EXP2_DEC2 | 10uF 16V X7R | C_0805 | +→+3V3_ESP, -→GND_STAR |

## SHEET 13: Expansion Relays 5-8 (via IO Expander)
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| Q_RLY5 | NPN S8050 | SOT-23 | B→EXP1_GPIO0, C→NET_COIL5, E→GND_STAR |
| R_RLY5_BASE | 4.7k 5% | R_0805 | 1→EXP1_GPIO0, 2→NET_RLY5_BASE |
| D_RLY5_FW | Schottky 40V 1A | SOD-123 | A→NET_COIL5, K→+5V_MAIN |
| RELAY5 | Relay 5V SPDT 10A (optional) | RELAY_SPDT_5V | COIL+→NET_COIL5, COIL-→GND_STAR |
| R_RLY5_SNUB | 10R 5% | R_0805 | 1→NET_RLY5_COM, 2→NET_RLY5_NO |
| C_RLY5_SNUB | 100nF 50V X7R | C_0805 | +→NET_RLY5_COM, -→NET_RLY5_NO |
| (RELAY6-8 identical circuits on EXP1_GPIO1..EXP1_GPIO3) |

## SHEET 14: External Connectors & Field Interfaces
| Ref | Value | Footprint | Net Connections |
|-----|-------|-----------|----------------|
| J_RELAY_OUT1 | Relay Out 1 (7.62mm) | CONN_7.62_3P | 1→NET_RLY1_COM, 2→NET_RLY1_NO, 3→GND_STAR |
| J_RELAY_OUT2 | Relay Out 2 (7.62mm) | CONN_7.62_3P | 1→NET_RLY2_COM, 2→NET_RLY2_NO, 3→GND_STAR |
| J_RELAY_OUT3 | Relay Out 3 (7.62mm) | CONN_7.62_3P | 1→NET_RLY3_COM, 2→NET_RLY3_NO, 3→GND_STAR |
| J_RELAY_OUT4 | Relay Out 4 (7.62mm) | CONN_7.62_3P | 1→NET_RLY4_COM, 2→NET_RLY4_NO, 3→GND_STAR |
| J_DS18B20_EXT | DS18B20 External 5.08mm | CONN_5.08_3P | 1→+3V3_ESP, 2→DS18B20_DATA, 3→GND_STAR |
| J_ANALOG_IN | Analog In 5.08mm 4P | CONN_5.08_4P | 1→NET_PH_RAW, 2→NET_TDS_RAW, 3→NET_DO_RAW, 4→GND_STAR |
| J_I2C_EXT | I2C/SPI Expansion 5.08mm | CONN_5.08_4P | 1→+3V3_ESP, 2→I2C_SCL, 3→I2C_SDA, 4→GND_STAR |
| J_UART_EXT | UART Debug 5.08mm | CONN_5.08_4P | 1→NC, 2→UART0_TX, 3→UART0_RX, 4→GND_STAR |
| J_EXP_HEADER | Expansion 2x5 Header 5.08mm | CONN_5.08_2x5 | 1→+3V3_ESP, 2→GND_STAR |
| | | | 3→EXP1_GPIO4, 4→EXP1_GPIO5, 5→EXP1_GPIO6, 6→EXP1_GPIO7 |
| | | | 7→EXP2_GPIOB0, 8→EXP2_GPIOB1, 9→EXP2_GPIOB2, 10→EXP2_GPIOB3 |
| J_PWR_EXT | 12V Power Out 7.62mm | CONN_7.62_2P | 1→+12V_PROTECTED, 2→GND_STAR |
| D_ESD_USB1 | USBLC6-2SC6 | SOT-363 | 1→USB_D_P, 2→GND_STAR, 3→USB_D_N |
| D_ESD_IO1-4 | ESD Diode SOT-23 | SOT-23 | A→EXP1_GPIO4..7, K→+3V3_ESP |
| J_MOUNT1-4 | Mounting Hole M3 | M3_HOLE | Mechanical |

## NET NAMES SUMMARY
### Power Nets
| Net | Description |
|-----|-------------|
| GND_STAR | Single-point ground reference (entire board) |
| +12V_IN | Raw 12V input from TB1 |
| +12V_FUSED | After fuse F1 |
| +12V_SURGE | After R_SURGE + L_SURGE |
| +12V_PROTECTED | After reverse-polarity MOSFET Q_PROTECT |
| +5V_MAIN | Buck converter 5V output |
| +3V3_ESP | LDO 3.3V for ESP32 |
| +3V3_ANA | LDO 3.3V for analog sensors |
| USB_5V | USB VBUS input |
| SW_5V | Buck switching node |
| FB_5V | Buck feedback |
| EN_5V | Buck enable |
| BST_5V | Buck bootstrap |

### Signal/Control Nets
| Net | Description |
|-----|-------------|
| UART0_TX | ESP32 UART TX → CP2102 RX |
| UART0_RX | ESP32 UART RX → CP2102 TX |
| I2C_SCL | I2C clock bus |
| I2C_SDA | I2C data bus |
| SPI_SCK | SPI clock → MicroSD |
| SPI_MOSI | SPI MOSI → MicroSD |
| SPI_MISO | SPI MISO ← MicroSD |
| SD_CS | MicroSD chip select |
| RELAY1_DRV | ESP32 GPIO12 → Relay 1 driver |
| RELAY2_DRV | ESP32 GPIO13 → Relay 2 driver |
| RELAY3_DRV | ESP32 GPIO14 → Relay 3 driver |
| RELAY4_DRV | ESP32 GPIO15 → Relay 4 driver |
| DHT22_DATA | ESP32 GPIO4 → DHT22 |
| DS18B20_DATA | ESP32 GPIO2 → DS18B20 |
| ADS_A0 | ADS1115 A0 → VIN sense |
| ADS_A1 | ADS1115 A1 → pH sensor |
| ADS_A2 | ADS1115 A2 → TDS sensor |
| ADS_A3 | ADS1115 A3 → DO sensor |
| WATCHDOG_KICK | ESP32 GPIO16 → TPL5010 DONE |
| WATCHDOG_RST | TPL5010 RST → ESP32 EN |
| POWER_GOOD | Power LED indicator |
| WIFI_STATUS | WiFi LED indicator |
| MQTT_STATUS | MQTT LED indicator |
| ERROR_STATUS | Error LED indicator |

### Expansion Nets (MCP23017)
| Net | Description |
|-----|-------------|
| EXP1_GPIO0 | IO Expander 1 port A bit 0 → RELAY5_DRV |
| EXP1_GPIO1 | IO Expander 1 port A bit 1 → RELAY6_DRV |
| EXP1_GPIO2 | IO Expander 1 port A bit 2 → RELAY7_DRV |
| EXP1_GPIO3 | IO Expander 1 port A bit 3 → RELAY8_DRV |
| EXP1_GPIO4-7 | IO Expander 1 port A bits 4-7 → spare |
| EXP2_GPIO0-7 | IO Expander 2 port A bits 0-7 → spare |
| EXP1_GPIOB0-7 | IO Expander 1 port B bits 0-7 → spare |
| EXP2_GPIOB0-7 | IO Expander 2 port B bits 0-7 → spare |
| EXP1_INTA/B | Interrupt outputs from MCP23017 #1 |
| EXP2_INTA/B | Interrupt outputs from MCP23017 #2 |
