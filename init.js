const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Remove existing database file if it exists
if (fs.existsSync('movie_booking.db')) {
    fs.unlinkSync('movie_booking.db');
    console.log('Old database file removed.');
}

// Create a new database
const db = new sqlite3.Database('movie_booking.db');

// Read and execute the SQL file
const sql = fs.readFileSync('db_schema.sql', 'utf8');

console.log('Initializing database...');
db.exec(sql, (err) => {
    if (err) {
        console.error('Error initializing database:', err);
    } else {
        console.log('✅ Database initialized successfully!');
        console.log('\nSample user created:');
        console.log('Email: testuser@example.com');
        console.log('Password: Password123!');
    }
    db.close();
});
