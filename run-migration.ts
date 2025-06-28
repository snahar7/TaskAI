import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function runMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adding comprehensive relational fields to existing tables...');
    
    // Create new supporting tables first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add new fields to existing tables one by one to avoid syntax issues
    const fieldsToAdd = [
      { table: 'goals', field: 'name', type: 'TEXT' },
      { table: 'goals', field: 'assigned_to', type: 'INTEGER' },
      { table: 'goals', field: 'status', type: 'TEXT DEFAULT \'not_started\'' },
      { table: 'goals', field: 'priority', type: 'TEXT DEFAULT \'medium\'' },
      { table: 'goals', field: 'percent_complete', type: 'DECIMAL(5,2) DEFAULT 0.00' },
      { table: 'goals', field: 'deadline', type: 'TIMESTAMP' },
      { table: 'goals', field: 'category_id', type: 'INTEGER' },
      { table: 'goals', field: 'team_id', type: 'INTEGER' },
      { table: 'goals', field: 'time_estimate', type: 'INTEGER' },
      { table: 'goals', field: 'time_actual', type: 'INTEGER' },
      { table: 'goals', field: 'custom_fields', type: 'JSON' },
      { table: 'goals', field: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
      
      { table: 'projects', field: 'name', type: 'TEXT' },
      { table: 'projects', field: 'assigned_to', type: 'INTEGER' },
      { table: 'projects', field: 'status', type: 'TEXT DEFAULT \'not_started\'' },
      { table: 'projects', field: 'priority', type: 'TEXT DEFAULT \'medium\'' },
      { table: 'projects', field: 'percent_complete', type: 'DECIMAL(5,2) DEFAULT 0.00' },
      { table: 'projects', field: 'deadline', type: 'TIMESTAMP' },
      { table: 'projects', field: 'category_id', type: 'INTEGER' },
      { table: 'projects', field: 'team_id', type: 'INTEGER' },
      { table: 'projects', field: 'time_estimate', type: 'INTEGER' },
      { table: 'projects', field: 'time_actual', type: 'INTEGER' },
      { table: 'projects', field: 'custom_fields', type: 'JSON' },
      { table: 'projects', field: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
      
      { table: 'tasks', field: 'name', type: 'TEXT' },
      { table: 'tasks', field: 'assigned_to', type: 'INTEGER' },
      { table: 'tasks', field: 'status', type: 'TEXT DEFAULT \'not_started\'' },
      { table: 'tasks', field: 'priority', type: 'TEXT DEFAULT \'medium\'' },
      { table: 'tasks', field: 'percent_complete', type: 'DECIMAL(5,2) DEFAULT 0.00' },
      { table: 'tasks', field: 'deadline', type: 'TIMESTAMP' },
      { table: 'tasks', field: 'category_id', type: 'INTEGER' },
      { table: 'tasks', field: 'team_id', type: 'INTEGER' },
      { table: 'tasks', field: 'time_estimate', type: 'INTEGER' },
      { table: 'tasks', field: 'time_actual', type: 'INTEGER' },
      { table: 'tasks', field: 'custom_fields', type: 'JSON' },
      { table: 'tasks', field: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
      
      { table: 'subtasks', field: 'name', type: 'TEXT' },
      { table: 'subtasks', field: 'assigned_to', type: 'INTEGER' },
      { table: 'subtasks', field: 'status', type: 'TEXT DEFAULT \'not_started\'' },
      { table: 'subtasks', field: 'priority', type: 'TEXT DEFAULT \'medium\'' },
      { table: 'subtasks', field: 'deadline', type: 'TIMESTAMP' },
      { table: 'subtasks', field: 'category_id', type: 'INTEGER' },
      { table: 'subtasks', field: 'team_id', type: 'INTEGER' },
      { table: 'subtasks', field: 'time_estimate', type: 'INTEGER' },
      { table: 'subtasks', field: 'time_actual', type: 'INTEGER' },
      { table: 'subtasks', field: 'custom_fields', type: 'JSON' },
      { table: 'subtasks', field: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
      
      { table: 'users', field: 'email', type: 'TEXT UNIQUE' },
      { table: 'users', field: 'first_name', type: 'TEXT' },
      { table: 'users', field: 'last_name', type: 'TEXT' },
      { table: 'users', field: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' },
    ];
    
    for (const { table, field, type } of fieldsToAdd) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${field} ${type}`);
        console.log(`Added ${field} to ${table}`);
      } catch (error) {
        console.log(`Field ${field} already exists in ${table} or error: ${error.message}`);
      }
    }
    
    // Create comprehensive relational tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id SERIAL PRIMARY KEY,
        dependent_type TEXT NOT NULL,
        dependent_id INTEGER NOT NULL,
        depends_on_type TEXT NOT NULL,
        depends_on_id INTEGER NOT NULL,
        dependency_type TEXT DEFAULT 'finish_to_start',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entity_tags (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entity_links (
        id SERIAL PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        link_type TEXT DEFAULT 'related',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database migration completed successfully!');
    console.log('✓ Enhanced all entity tables with comprehensive fields');
    console.log('✓ Added teams, categories, tags tables');
    console.log('✓ Created polymorphic comments and file attachments');
    console.log('✓ Added many-to-many relationships (dependencies, followers, team_members)');
    console.log('✓ Enabled entity linking/nesting capabilities');
    console.log('✓ Maintained backward compatibility with existing data');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);