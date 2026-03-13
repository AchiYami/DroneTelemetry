import { Pool } from 'pg';
import dotenv from 'dotenv';

//Grab .env config file
dotenv.config();


//Pool used to handle multiple connections at once
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});


//Error Logging
pool.on('error', (err) => {
    console.error('Error :: There was an error with the Database Client', err);
})


export default pool;