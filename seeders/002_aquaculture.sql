-- EcoSynTech FarmOS PRO - Seeder 002: Aquaculture
-- Version: 5.0.0
-- Created: 2026-04-19
-- 14 Vietnamese aquaculture species

INSERT OR IGNORE INTO aquaculture (id, name, name_vi, category, optimal_temp_min, optimal_temp_max, optimal_ph_min, optimal_ph_max, optimal_do, optimal_salinity, growth_days, density_max, feed_conversion_ratio, water_change_rate, disease_risk) VALUES
('aq-ca-loc', 'Snakehead', 'Cá lóc', 'carnivore', 25, 32, 6.0, 7.5, 3.0, 0, 180, 50, 1.2, '20%', 'parasites,fungus'),
('aq-ca-ro-phi', 'Tilapia', 'Cá rô phi', 'omnivore', 25, 32, 6.5, 8.0, 3.0, 0, 150, 100, 1.5, '15%', 'ich,columnaris'),
('aq-ca-basa', 'Pangasius', 'Cá basa', 'omnivore', 25, 30, 6.5, 8.0, 3.0, 0, 180, 80, 1.4, '20%', 'bacterial_ich'),
('aq-tom-su', 'Black Tiger', 'Tôm sú', 'carnivore', 25, 32, 7.5, 8.5, 4.0, 10, 120, 40, 1.3, '30%', 'white_spot,taura'),
('aq-tomthe', 'Vannamei', 'Tôm thẻ chân trắng', 'carnivore', 25, 32, 7.8, 8.5, 4.5, 15, 90, 150, 1.2, '25%', 'EMS,white_spot'),
('aq-ech', 'Frog', 'Ếch', 'carnivore', 22, 30, 6.5, 7.5, 3.0, 0, 90, 50, 1.1, '10%', 'red_leg,bacterial'),
('aq-ca-chep', 'Carp', 'Cá chép', 'omnivore', 20, 28, 6.5, 7.5, 3.0, 0, 365, 30, 1.8, '10%', 'dropsy,koi_herpes'),
('aq-ca-tram', 'Mullet', 'Cá trắm', 'omnivore', 18, 28, 6.5, 8.0, 3.5, 0, 365, 20, 2.0, '10%', 'parasites'),
('aq-ca-nga', 'Catfish', 'Cá ngạnh', 'carnivore', 22, 30, 6.5, 7.5, 3.0, 0, 180, 60, 1.3, '15%', 'fungal_infections'),
('aq-ca-bong', 'Grouper', 'Cá bớp', 'carnivore', 25, 32, 7.5, 8.2, 4.0, 20, 270, 30, 1.4, '20%', 'vibrio'),
('aq-ca-hou', 'Sea Bass', 'Cá hồi', 'carnivore', 18, 24, 7.5, 8.2, 5.0, 25, 365, 25, 1.2, '15%', 'vibrio,lice'),
('aq-oc-na', 'Snail', 'Ốc bươu', 'herbivore', 22, 30, 6.5, 7.5, 3.0, 0, 90, 100, 2.0, '5%', 'bacterial'),
('aq-luon', 'Eel', 'Lươn', 'carnivore', 22, 30, 6.5, 7.5, 3.0, 0, 180, 30, 1.1, '15%', 'parasites'),
('aq-ca-ri', 'Clarias', 'Cá rì', 'omnivore', 22, 30, 6.5, 7.5, 3.0, 0, 150, 80, 1.3, '20%', 'bacterial_infections');

-- Seeder Complete