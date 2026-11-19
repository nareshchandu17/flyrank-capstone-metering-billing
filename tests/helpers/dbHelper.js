const { newDb } = require('pg-mem');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates an isolated, real in-memory PostgreSQL instance with the complete project schema.
 */
function createTestDb() {
  const db = newDb();

  // Register uuid-ossp functions
  db.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('text'),
      implementation: () => uuidv4()
    });
  });

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  return { db, pool };
}

module.exports = {
  createTestDb
};
