import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

async function migrate() {
  console.log('🔄 Running migrations...');

  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
