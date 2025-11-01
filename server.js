console.log('Initializing server...');
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

console.log('Creating express app...');
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}
const JWT_EXPIRATION = '24h'; // Token expires in 24 hours

console.log('Connecting to database...');
const db = new sqlite3.Database("./movie_booking.db", (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// --- Middleware ---
function auth(req, res, next) {
  console.log('Auth middleware triggered');
  const token = req.headers.authorization?.split(" ")[1];
  console.log('Token received:', token ? 'Present' : 'Missing');
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: "No token" });
  }
  
  try {
    console.log('Verifying token...');
    req.user = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', req.user);
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(403).json({ error: "Invalid token" });
  }
}

// --- Routes ---

// Register
app.post("/api/register", async (req, res) => {
  console.log('\n--- Register Endpoint Hit ---');
  console.log('Request body:', JSON.stringify(req.body));
  
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      console.log('Missing required fields');
      const response = { error: "All fields are required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    console.log('Hashing password...');
    const hashed = bcrypt.hashSync(password, 8);
    
    db.run(
      `INSERT INTO users(name, email, password) VALUES(?, ?, ?)`, 
      [name, email, hashed], 
      function (err) {
        let response;
        if (err) {
          console.error('Database error during registration:', err.message);
          response = { error: "Email already exists" };
          console.log('Response:', JSON.stringify(response, null, 2));
          return res.status(400).json(response);
        }
        
        console.log('User created with ID:', this.lastID);
        const token = jwt.sign(
          { id: this.lastID, email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRATION }
        );
        
        response = { token };
        console.log('Registration successful');
        console.log('Response:', JSON.stringify(response, null, 2));
        res.json(response);
      }
    );
  } catch (error) {
    console.error('Unexpected error in registration:', error);
    const response = { error: "Internal server error during registration" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Login
app.post("/api/login", (req, res) => {
  console.log('\n--- Login Endpoint Hit ---');
  console.log('Login attempt for email:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      const response = { error: "Email and password are required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
      let response;
      
      if (err) {
        console.error('Database error during login:', err.message);
        response = { error: "Internal server error" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      if (!user) {
        console.log('User not found with email:', email);
        response = { error: "Invalid email or password" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(400).json(response);
      }
      
      console.log('User found, verifying password...');
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      
      if (!isPasswordValid) {
        console.log('Invalid password for email:', email);
        response = { error: "Invalid email or password" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(400).json(response);
      }
      
      console.log('Password verified, generating token...');
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );
      
      response = { token };
      console.log('Login successful for user ID:', user.id);
      console.log('Response:', JSON.stringify(response, null, 2));
      res.json(response);
    });
  } catch (error) {
    console.error('Unexpected error during login:', error);
    const response = { error: "Internal server error during login" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Movies list
app.get("/api/movies", auth, (req, res) => {
  console.log('\n--- Fetching Movies ---');
  
  try {
    db.all("SELECT * FROM movies", (err, rows) => {
      if (err) {
        console.error('Error fetching movies:', err.message);
        const response = { error: "Failed to fetch movies" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      console.log(`Found ${rows.length} movies`);
      console.log('Response:', JSON.stringify(rows, null, 2));
      res.json(rows);
    });
  } catch (error) {
    console.error('Unexpected error in movies endpoint:', error);
    const response = { error: "Internal server error while fetching movies" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

app.get("/api/movies/:id", auth, (req, res) => {
  const movieId = req.params.id;
  console.log(`\n--- Fetching Movie with ID: ${movieId} ---`);
  
  try {
    db.get("SELECT * FROM movies WHERE id = ?", [movieId], (err, row) => {
      let response;
      
      if (err) {
        console.error('Error fetching movie:', err.message);
        response = { error: "Failed to fetch movie" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      if (!row) {
        console.log('Movie not found with ID:', movieId);
        response = { error: "Movie not found" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(404).json(response);
      }
      
      console.log(`Found movie with ID ${movieId}`);
      console.log('Response:', JSON.stringify(row, null, 2));
      res.json(row);
    });
  } catch (error) {
    console.error('Unexpected error in movies/id endpoint:', error);
    const response = { error: "Internal server error while fetching movie" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Showtimes for a movie
app.get("/api/movies/:id/showtimes", auth, (req, res) => {
  const movieId = req.params.id;
  console.log(`\n--- Fetching Showtimes for Movie ID: ${movieId} ---`);
  
  try {
    if (!movieId) {
      console.log('No movie ID provided');
      const response = { error: "Movie ID is required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    db.all("SELECT * FROM showtimes WHERE movie_id = ?", [movieId], (err, rows) => {
      let response;
      
      if (err) {
        console.error(`Error fetching showtimes for movie ${movieId}:`, err.message);
        response = { error: "Failed to fetch showtimes" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      console.log(`Found ${rows.length} showtimes for movie ${movieId}`);
      console.log('Response:', JSON.stringify(rows, null, 2));
      res.json(rows);
    });
  } catch (error) {
    console.error(`Unexpected error fetching showtimes for movie ${movieId}:`, error);
    const response = { error: "Internal server error while fetching showtimes" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Seats for a showtime
app.get("/api/showtimes/:id/seats", auth, (req, res) => {
  const showtimeId = req.params.id;
  console.log(`\n--- Fetching Seats for Showtime ID: ${showtimeId} ---`);
  console.log('Authenticated user ID:', req.user?.id);
  
  try {
    if (!showtimeId) {
      console.log('No showtime ID provided');
      const response = { error: "Showtime ID is required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    db.all("SELECT * FROM seats WHERE showtime_id = ?", [showtimeId], (err, rows) => {
      let response;
      
      if (err) {
        console.error(`Error fetching seats for showtime ${showtimeId}:`, err.message);
        response = { error: "Failed to fetch seats" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      console.log(`Found ${rows.length} seats for showtime ${showtimeId}`);
      console.log('Response:', JSON.stringify(rows, null, 2));
      res.json(rows);
    });
  } catch (error) {
    console.error(`Unexpected error fetching seats for showtime ${showtimeId}:`, error);
    const response = { error: "Internal server error while fetching seats" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Book seats
app.post("/api/book", auth, (req, res) => {
  console.log('\n--- Booking Seats ---');
  console.log('Authenticated user ID:', req.user?.id);
  console.log('Request body:', JSON.stringify(req.body));
  
  try {
    const { showtime_id, seats } = req.body;
    const userId = req.user?.id;
    let response;
    
    // Input validation
    if (!showtime_id) {
      console.log('No showtime ID provided');
      response = { error: "Showtime ID is required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    if (!Array.isArray(seats) || seats.length === 0) {
      console.log('No seats selected');
      response = { error: "Please select at least one seat" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    console.log(`Attempting to book ${seats.length} seats for showtime ${showtime_id}`);
    
    const placeholders = seats.map(() => "?").join(",");
    const query = `SELECT * FROM seats WHERE showtime_id = ? AND seat_number IN (${placeholders})`;
    const params = [showtime_id, ...seats];
    
    console.log('Checking seat availability...');
    db.all(query, params, (err, rows) => {
      let response;
      
      if (err) {
        console.error('Error checking seat availability:', err.message);
        response = { error: "Error checking seat availability" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      // Check if any of the selected seats are already booked
      const unavailableSeats = rows.filter(seat => seat.available === 0);
      if (unavailableSeats.length > 0) {
        console.log('Some seats are already booked:', unavailableSeats);
        response = { 
          error: "One or more seats are already booked",
          unavailableSeats: unavailableSeats.map(s => s.seat_number)
        };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(400).json(response);
      }
      
      console.log('Starting transaction for booking...');
      db.serialize(() => {
        const total = seats.length * 12;
        const bookingTime = new Date().toISOString();
        
        // Start transaction
        db.run('BEGIN TRANSACTION');
        
        // Create booking record
        db.run(
          `INSERT INTO bookings(user_id, showtime_id, seats, total) VALUES(?, ?, ?, ?)`,
          [userId, showtime_id, seats.join(","), total],
          function(err) {
            if (err) {
              console.error('Error creating booking:', err.message);
              db.run('ROLLBACK');
              return res.status(500).json({ error: "Failed to create booking" });
            }
            
            const bookingId = this.lastID;
            console.log(`Booking ${bookingId} created successfully`);
            
            // Update seat availability
            const updatePromises = seats.map(seatNumber => {
              return new Promise((resolve, reject) => {
                db.run(
                  `UPDATE seats SET available = 0 WHERE showtime_id = ? AND seat_number = ?`,
                  [showtime_id, seatNumber],
                  function(updateErr) {
                    if (updateErr) {
                      console.error(`Error updating seat ${seatNumber}:`, updateErr.message);
                      return reject(updateErr);
                    }
                    console.log(`Seat ${seatNumber} marked as booked`);
                    resolve();
                  }
                );
              });
            });
            
            Promise.all(updatePromises)
              .then(() => {
                db.run('COMMIT');
                response = { 
                  message: "Booking successful!", 
                  bookingId,
                  total,
                  seatsBooked: seats
                };
                console.log(`Booking ${bookingId} completed successfully`);
                console.log('Response:', JSON.stringify(response, null, 2));
                res.json(response);
              })
              .catch(updateErr => {
                db.run('ROLLBACK');
                console.error('Error updating seats:', updateErr);
                const response = { error: "Failed to update seat availability" };
                console.log('Response:', JSON.stringify(response, null, 2));
                res.status(500).json(response);
              });
          }
        );
      });
    });
  } catch (error) {
    console.error('Unexpected error during booking:', error);
    res.status(500).json({ error: "Internal server error during booking" });
  }
});

// My bookings
app.get("/api/mybookings", auth, (req, res) => {
  const userId = req.user?.id;
  console.log(`\n--- Fetching Bookings for User ID: ${userId} ---`);
  
  try {
    if (!userId) {
      console.log('No user ID in request');
      const response = { error: "User ID is required" };
      console.log('Response:', JSON.stringify(response, null, 2));
      return res.status(400).json(response);
    }
    
    const query = `
  SELECT 
    b.*, 
    m.title AS movie_title, 
    s.time AS showtime
  FROM bookings b
  JOIN showtimes s ON b.showtime_id = s.id
  JOIN movies m ON s.movie_id = m.id
  WHERE b.user_id = ?
  ORDER BY b.id DESC
`;

    
    db.all(query, [userId], (err, rows) => {
      let response;
      
      if (err) {
        console.error(`Error fetching bookings for user ${userId}:`, err.message);
        response = { error: "Failed to fetch bookings" };
        console.log('Response:', JSON.stringify(response, null, 2));
        return res.status(500).json(response);
      }
      
      console.log(`Found ${rows.length} bookings for user ${userId}`);
      console.log('Response:', JSON.stringify(rows, null, 2));
      res.json(rows);
    });
  } catch (error) {
    console.error(`Unexpected error fetching bookings for user ${userId}:`, error);
    const response = { error: "Internal server error while fetching bookings" };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.status(500).json(response);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on port ${PORT}`);  
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT Secret: ${JWT_SECRET ? 'Set' : 'Not set!'}`);
  console.log(`Database: ${process.env.DATABASE_URL || './movie_booking.db'}`);
  console.log('\nAvailable endpoints:');
  console.log(`- POST   /api/register`);
  console.log(`- POST   /api/login`);
  console.log(`- GET    /api/movies`);
  console.log(`- GET    /api/movies/:id/showtimes`);
  console.log(`- GET    /api/showtimes/:id/seats (requires auth)`);
  console.log(`- POST   /api/book (requires auth)`);
  console.log(`- GET    /api/mybookings (requires auth)\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});
