const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function waitForPostgres() {
  console.log('Waiting for PostgreSQL to be ready...');
  
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      await execPromise('docker exec usage_metering_db pg_isready -U postgres');
      console.log('PostgreSQL is ready');
      return true;
    } catch (error) {
      attempts++;
      console.log(`PostgreSQL is unavailable - attempt ${attempts}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('PostgreSQL did not become ready in time');
}

async function initializeDatabase() {
  try {
    await waitForPostgres();
    
    console.log('Initializing database schema...');
    
    // Copy schema into container
    await execPromise('docker cp schema.sql usage_metering_db:/tmp/schema.sql');
    
    // Execute schema
    await execPromise('docker exec usage_metering_db psql -U postgres -d usage_metering -f /tmp/schema.sql');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
