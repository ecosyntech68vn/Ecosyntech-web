EcoSynTech Sensor Types - Single Source of Truth

This document defines the canonical set of sensor types used across Firmware, GAS (V10) and Web Local integration. Any changes must be reflected in all three components and CI-enforced.

| sensor_type   | unit  | range          | precision | description     |
|---------------|-------|----------------|-----------|-----------------|
| temp          | C     | -40 to 85       | 0.1       | Air temperature |
| humidity      | %     | 0 to 100        | 1         | Air humidity    |
| soil_moisture | %   | 0 to 100        | 1         | Soil VWC        |
| light         | lux   | 0 to 100000     | 1         | Light intensity |
| co2           | ppm   | 400 to 5000     | 1         | CO2 level       |
| pressure      | hPa   | 800 to 1100     | 0.1       | Atmospheric     |
| pH            |     | 0 to 14          | 0.1       | Water pH        |
| tds           | ppm   | 0 to 5000       | 1         | Total dissolved |
| do            | mg/L  | 0 to 20         | 0.1       | Dissolved O2    |
| ec            | mS/cm | 0 to 20         | 0.01      | EC of nutrient  |

Note: Đây là danh sách tham chiếu; validator CI sẽ kiểm tra sự khớp giữa sensor_type trong dữ liệu từ Firmware, GAS và Web Local.
