-- Cubing México Local Database Initialization Script

-- 1. States Table
CREATE TABLE IF NOT EXISTS states (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(50) PRIMARY KEY,
    state_id VARCHAR(50) REFERENCES states(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT
);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    format VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    rank INT
);

-- 4. Round Types Table
CREATE TABLE IF NOT EXISTS round_types (
    id VARCHAR(50) PRIMARY KEY,
    final BOOLEAN DEFAULT FALSE,
    name VARCHAR(100),
    rank INT,
    cell_name VARCHAR(50)
);

-- 5. Formats Table
CREATE TABLE IF NOT EXISTS formats (
    id VARCHAR(50) PRIMARY KEY,
    expected_solve_count INT,
    name VARCHAR(100),
    sort_by VARCHAR(50),
    sort_by_second VARCHAR(50),
    trim_fastest_n INT,
    trim_slowest_n INT
);

-- 6. Persons Table
CREATE TABLE IF NOT EXISTS persons (
    wca_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    state_id VARCHAR(50) REFERENCES states(id) ON DELETE SET NULL
);

-- 7. Competitions Table
CREATE TABLE IF NOT EXISTS competitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city_name VARCHAR(255),
    country_id VARCHAR(100) DEFAULT 'Mexico',
    information TEXT,
    start_date DATE,
    end_date DATE,
    cancelled BOOLEAN DEFAULT FALSE,
    venue TEXT,
    venue_address TEXT,
    venue_details TEXT,
    external_website TEXT,
    cell_name VARCHAR(100),
    latitude_microdegrees BIGINT,
    longitude_microdegrees BIGINT,
    state_id VARCHAR(50) REFERENCES states(id) ON DELETE SET NULL
);

-- 8. Competition Events
CREATE TABLE IF NOT EXISTS competition_events (
    competition_id VARCHAR(100) REFERENCES competitions(id) ON DELETE CASCADE,
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (competition_id, event_id)
);

-- 9. Organizers Table
CREATE TABLE IF NOT EXISTS organizers (
    id VARCHAR(100) PRIMARY KEY,
    person_id VARCHAR(50),
    status VARCHAR(50)
);

-- 10. Competition Organizers Table
CREATE TABLE IF NOT EXISTS competition_organizers (
    competition_id VARCHAR(100) REFERENCES competitions(id) ON DELETE CASCADE,
    organizer_id VARCHAR(100) REFERENCES organizers(id) ON DELETE CASCADE,
    PRIMARY KEY (competition_id, organizer_id)
);

-- 11. Delegates Table
CREATE TABLE IF NOT EXISTS delegates (
    id VARCHAR(100) PRIMARY KEY,
    person_id VARCHAR(50),
    status VARCHAR(50)
);

-- 12. Competition Delegates Table
CREATE TABLE IF NOT EXISTS competition_delegates (
    competition_id VARCHAR(100) REFERENCES competitions(id) ON DELETE CASCADE,
    delegate_id VARCHAR(100) REFERENCES delegates(id) ON DELETE CASCADE,
    PRIMARY KEY (competition_id, delegate_id)
);

-- 13. Championships Table
CREATE TABLE IF NOT EXISTS championships (
    id VARCHAR(100) PRIMARY KEY,
    competition_id VARCHAR(100) REFERENCES competitions(id) ON DELETE CASCADE,
    championship_type VARCHAR(100)
);

-- 14. Results Table
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    competition_id VARCHAR(100),
    event_id VARCHAR(50),
    round_type_id VARCHAR(50),
    pos INT,
    best INT,
    average INT,
    person_id VARCHAR(50),
    format_id VARCHAR(50),
    regional_single_record VARCHAR(10),
    regional_average_record VARCHAR(10)
);

-- 15. Result Attempts Table
CREATE TABLE IF NOT EXISTS result_attempts (
    id SERIAL PRIMARY KEY,
    result_id INT,
    attempt_number INT,
    value INT
);

-- 16. Ranks Single Table
CREATE TABLE IF NOT EXISTS ranks_single (
    person_id VARCHAR(50),
    event_id VARCHAR(50),
    best INT,
    world_rank INT,
    continent_rank INT,
    country_rank INT,
    state_rank INT,
    PRIMARY KEY (person_id, event_id)
);

-- 17. Ranks Average Table
CREATE TABLE IF NOT EXISTS ranks_average (
    person_id VARCHAR(50),
    event_id VARCHAR(50),
    best INT,
    world_rank INT,
    continent_rank INT,
    country_rank INT,
    state_rank INT,
    PRIMARY KEY (person_id, event_id)
);

-- 18. Sum of Ranks Table
CREATE TABLE IF NOT EXISTS sum_of_ranks (
    rank INT,
    person_id VARCHAR(50),
    result_type VARCHAR(20),
    overall NUMERIC,
    events JSONB,
    PRIMARY KEY (person_id, result_type)
);

-- 19. Kinch Ranks Table
CREATE TABLE IF NOT EXISTS kinch_ranks (
    rank INT,
    person_id VARCHAR(50) PRIMARY KEY,
    overall NUMERIC,
    events JSONB
);

-- 20. Export Metadata Table
CREATE TABLE IF NOT EXISTS export_metadata (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Mexican States
INSERT INTO states (id, name, latitude, longitude) VALUES
('AGU', 'Aguascalientes', 21.8853, -102.2916),
('BCN', 'Baja California', 30.8406, -115.2838),
('BCS', 'Baja California Sur', 26.0444, -111.6661),
('CAM', 'Campeche', 19.8301, -90.5349),
('CHP', 'Chiapas', 16.7569, -93.1292),
('CHH', 'Chihuahua', 28.6330, -106.0691),
('COA', 'Coahuila', 27.0587, -101.7068),
('COL', 'Colima', 19.2452, -103.7241),
('CDMX', 'Ciudad de México', 19.4326, -99.1332),
('DUR', 'Durango', 24.0277, -104.6532),
('GUA', 'Guanajuato', 21.0190, -101.2574),
('GRO', 'Guerrero', 17.4392, -99.5451),
('HID', 'Hidalgo', 20.0911, -98.7624),
('JAL', 'Jalisco', 20.6597, -103.3496),
('MEX', 'Estado de México', 19.4969, -99.7233),
('MIC', 'Michoacán', 19.5665, -101.7068),
('MOR', 'Morelos', 18.6813, -99.1013),
('NAY', 'Nayarit', 21.7514, -104.8455),
('NLE', 'Nuevo León', 25.5922, -99.9962),
('OAX', 'Oaxaca', 17.0732, -96.7266),
('PUE', 'Puebla', 19.0414, -98.2063),
('QUE', 'Querétaro', 20.5888, -100.3899),
('ROO', 'Quintana Roo', 19.1817, -88.4791),
('SLP', 'San Luis Potosí', 22.1565, -100.9855),
('SIN', 'Sinaloa', 24.8091, -107.3940),
('SON', 'Sonora', 29.0729, -110.9559),
('TAB', 'Tabasco', 17.8409, -92.6189),
('TAM', 'Tamaulipas', 24.2669, -98.8363),
('TLA', 'Tlaxcala', 19.3182, -98.2375),
('VER', 'Veracruz', 19.1738, -96.1342),
('YUC', 'Yucatán', 20.9674, -89.5926),
('ZAC', 'Zacatecas', 22.7709, -102.5832)
ON CONFLICT (id) DO NOTHING;

-- Seed Standard WCA Events
INSERT INTO events (id, format, name, rank) VALUES
('333', 'time', '3x3x3 Cube', 10),
('222', 'time', '2x2x2 Cube', 20),
('444', 'time', '4x4x4 Cube', 30),
('555', 'time', '5x5x5 Cube', 40),
('666', 'time', '6x6x6 Cube', 50),
('777', 'time', '7x7x7 Cube', 60),
('333bf', 'time', '3x3x3 Blindfolded', 70),
('333fm', 'multi', '3x3x3 Fewest Moves', 80),
('333oh', 'time', '3x3x3 One-Handed', 90),
('clock', 'time', 'Clock', 100),
('megaminx', 'time', 'Megaminx', 110),
('pyram', 'time', 'Pyraminx', 120),
('skewb', 'time', 'Skewb', 130),
('sq1', 'time', 'Square-1', 140),
('444bf', 'time', '4x4x4 Blindfolded', 150),
('555bf', 'time', '5x5x5 Blindfolded', 160),
('333mbf', 'multi', '3x3x3 Multi-Blind', 170)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Person
INSERT INTO persons (wca_id, name, gender, state_id) VALUES
('2024TEST01', 'Speed Cuber Test', 'm', 'CDMX')
ON CONFLICT (wca_id) DO NOTHING;

-- Seed Sample Competition
INSERT INTO competitions (id, name, city_name, country_id, information, start_date, end_date, cancelled, venue, state_id) VALUES
('MexicoOpen2026', 'Mexico Open 2026', 'Ciudad de México', 'Mexico', 'Sample Local Dev Competition', '2026-08-01', '2026-08-02', false, 'Palacio de los Deportes', 'CDMX')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Competition Event
INSERT INTO competition_events (competition_id, event_id) VALUES
('MexicoOpen2026', '333'),
('MexicoOpen2026', '222')
ON CONFLICT DO NOTHING;

-- Seed Sample Ranks
INSERT INTO ranks_single (person_id, event_id, best, world_rank, continent_rank, country_rank, state_rank) VALUES
('2024TEST01', '333', 650, 10, 2, 1, 1)
ON CONFLICT (person_id, event_id) DO NOTHING;

INSERT INTO ranks_average (person_id, event_id, best, world_rank, continent_rank, country_rank, state_rank) VALUES
('2024TEST01', '333', 780, 12, 3, 1, 1)
ON CONFLICT (person_id, event_id) DO NOTHING;
