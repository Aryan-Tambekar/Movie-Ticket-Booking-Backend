-- ============================================================
-- MOVIE TICKET BOOKING SYSTEM (Simplified Schema)
-- ============================================================

-- 1️⃣ USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

-- 2️⃣ MOVIES TABLE
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT
);

-- 3️⃣ SHOWTIMES TABLE
CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    time TEXT NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- 4️⃣ SEATS TABLE
CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    showtime_id INTEGER NOT NULL,
    seat_number TEXT NOT NULL,
    available INTEGER DEFAULT 1, -- 1 = available, 0 = booked
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

-- 5️⃣ BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    showtime_id INTEGER NOT NULL,
    seats TEXT NOT NULL, -- Comma-separated seat list (e.g. 'A1,A2')
    total REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

-- ============================================================
-- SEED DATA (Sample movies, showtimes, and seats)
-- ============================================================

-- Insert sample movies
INSERT INTO movies (title, description) VALUES
('Inception', 'A thief who steals corporate secrets through dream-sharing.'),
('Titanic', 'A love story set on the ill-fated ship.');

-- Insert showtimes
INSERT INTO showtimes (movie_id, time) VALUES
(1, '7:00 PM'),
(1, '9:00 PM'),
(2, '6:00 PM');

-- Insert seats for each showtime (A1–A15)
INSERT INTO seats (showtime_id, seat_number)
SELECT 1, 'A' || n FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
                          SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
                          SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15);

INSERT INTO seats (showtime_id, seat_number)
SELECT 2, 'B' || n FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
                          SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
                          SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15);

INSERT INTO seats (showtime_id, seat_number)
SELECT 3, 'C' || n FROM (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
                          SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
                          SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15);

-- ============================================================
-- SAMPLE USER (Optional)
-- Password: "Password123!" (to be hashed in app)
-- ============================================================
INSERT INTO users (name, email, password)
VALUES ('Test User', 'testuser@example.com', 'Password123!');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
