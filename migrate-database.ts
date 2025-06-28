import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateDatabase() {
  console.log('Starting database migration to comprehensive relational structure...');
  
  try {
    // Add new comprehensive fields to existing tables
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS name TEXT`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS assigned_to INTEGER`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started'`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2) DEFAULT 0.00`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline TIMESTAMP`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS category_id INTEGER`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS team_id INTEGER`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS time_estimate INTEGER`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS time_actual INTEGER`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS custom_fields JSON`);
    await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

    await pool.query(`
      -- Add new fields to projects table
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS category_id INTEGER,
      ADD COLUMN IF NOT EXISTS team_id INTEGER,
      ADD COLUMN IF NOT EXISTS time_estimate INTEGER,
      ADD COLUMN IF NOT EXISTS time_actual INTEGER,
      ADD COLUMN IF NOT EXISTS custom_fields JSON,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      -- Add new fields to tasks table
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS category_id INTEGER,
      ADD COLUMN IF NOT EXISTS team_id INTEGER,
      ADD COLUMN IF NOT EXISTS time_estimate INTEGER,
      ADD COLUMN IF NOT EXISTS time_actual INTEGER,
      ADD COLUMN IF NOT EXISTS custom_fields JSON,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      -- Add new fields to subtasks table
      ALTER TABLE subtasks 
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
      ADD COLUMN IF NOT EXISTS category_id INTEGER,
      ADD COLUMN IF NOT EXISTS team_id INTEGER,
      ADD COLUMN IF NOT EXISTS time_estimate INTEGER,
      ADD COLUMN IF NOT EXISTS time_actual INTEGER,
      ADD COLUMN IF NOT EXISTS custom_fields JSON,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // Create new relational tables
    await pool.query(`
      -- Create teams table
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create categories table
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create tags table
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create files table for polymorphic file attachments
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create comments table for polymorphic comments
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        author_id INTEGER REFERENCES users(id) NOT NULL,
        parent_id INTEGER REFERENCES comments(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create dependencies table for many-to-many relationships
      CREATE TABLE IF NOT EXISTS dependencies (
        id SERIAL PRIMARY KEY,
        dependent_type TEXT NOT NULL,
        dependent_id INTEGER NOT NULL,
        depends_on_type TEXT NOT NULL,
        depends_on_id INTEGER NOT NULL,
        dependency_type TEXT DEFAULT 'finish_to_start',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create entity_tags for polymorphic tagging
      CREATE TABLE IF NOT EXISTS entity_tags (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        tag_id INTEGER REFERENCES tags(id) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create followers table for user following entities
      CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create team_members for many-to-many team membership
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      -- Create entity_links for linking/nesting items across types
      CREATE TABLE IF NOT EXISTS entity_links (
        id SERIAL PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        link_type TEXT DEFAULT 'related',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add foreign key constraints
    await pool.query(`
      -- Add foreign key constraints where missing
      ALTER TABLE goals 
      ADD CONSTRAINT IF NOT EXISTS fk_goals_category FOREIGN KEY (category_id) REFERENCES categories(id),
      ADD CONSTRAINT IF NOT EXISTS fk_goals_team FOREIGN KEY (team_id) REFERENCES teams(id);
    `);

    await pool.query(`
      ALTER TABLE projects 
      ADD CONSTRAINT IF NOT EXISTS fk_projects_category FOREIGN KEY (category_id) REFERENCES categories(id),
      ADD CONSTRAINT IF NOT EXISTS fk_projects_team FOREIGN KEY (team_id) REFERENCES teams(id);
    `);

    await pool.query(`
      ALTER TABLE tasks 
      ADD CONSTRAINT IF NOT EXISTS fk_tasks_category FOREIGN KEY (category_id) REFERENCES categories(id),
      ADD CONSTRAINT IF NOT EXISTS fk_tasks_team FOREIGN KEY (team_id) REFERENCES teams(id);
    `);

    await pool.query(`
      ALTER TABLE subtasks 
      ADD CONSTRAINT IF NOT EXISTS fk_subtasks_category FOREIGN KEY (category_id) REFERENCES categories(id),
      ADD CONSTRAINT IF NOT EXISTS fk_subtasks_team FOREIGN KEY (team_id) REFERENCES teams(id);
    `);

    // Add enhanced user fields
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    console.log('Database migration completed successfully!');
    console.log('New comprehensive relational structure is now available with:');
    console.log('- Enhanced entity fields (name, assigned_to, status, priority, etc.)');
    console.log('- Support for teams, categories, tags');
    console.log('- Polymorphic comments and file attachments');
    console.log('- Many-to-many relationships (dependencies, followers, etc.)');
    console.log('- Entity linking/nesting capabilities');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
migrateDatabase().catch(console.error);

export { migrateDatabase };