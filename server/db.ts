import path from "path";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import ws from "ws";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

// Driver selection:
// - no DATABASE_URL           -> embedded PGlite (Postgres in WASM, data in ./.taflo-data)
// - *.neon.tech               -> Neon serverless (WebSockets)
// - any other postgres:// URL -> node-postgres (local Postgres, Docker, RDS, Supabase...)
// Override with DATABASE_DRIVER=pglite|neon|pg.
export const databaseDriver =
  process.env.DATABASE_DRIVER ??
  (!databaseUrl ? "pglite" : /\.neon\.tech/.test(databaseUrl) ? "neon" : "pg");

if (databaseDriver !== "pglite" && !databaseUrl) {
  throw new Error(`DATABASE_URL is required for DATABASE_DRIVER=${databaseDriver}.`);
}

const poolOptions = {
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

let db: Db;
/** Shared pg pool (used by the Postgres session store). Null for PGlite. */
let pool: pg.Pool | null = null;
/** Resolves once the database is ready (PGlite migrations applied). */
let dbReady: Promise<void> = Promise.resolve();

if (databaseDriver === "pglite") {
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.resolve(process.cwd(), ".taflo-data");
  const client = new PGlite(dataDir === "memory" ? undefined : dataDir);
  const pgliteDb = drizzlePglite({ client, schema });
  db = pgliteDb as unknown as Db;
  dbReady = migrate(pgliteDb, { migrationsFolder: path.resolve(process.cwd(), "migrations") }).then(() => {
    console.log(`🗄️  Embedded PGlite database ready (${dataDir === "memory" ? "in memory" : dataDir})`);
  });
} else if (databaseDriver === "neon") {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool(poolOptions);
  db = drizzleNeon({ client: neonPool, schema });
  pool = neonPool as unknown as pg.Pool;
} else {
  const pgPool = new pg.Pool(poolOptions);
  db = drizzlePg({ client: pgPool, schema }) as unknown as Db;
  pool = pgPool;
}

pool?.on("error", (err: Error) => {
  console.error("Database pool error:", err);
});

export { db, pool, dbReady };
