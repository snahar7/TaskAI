import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env (see .env.example): a Neon connection string or a local postgres:// URL.",
  );
}

// Neon's serverless driver speaks WebSockets and only works against Neon.
// Anything else (local Postgres, Docker, RDS, Supabase...) uses node-postgres.
// Override with DATABASE_DRIVER=neon|pg.
const driver =
  process.env.DATABASE_DRIVER ?? (/\.neon\.tech/.test(databaseUrl) ? "neon" : "pg");

const poolOptions = {
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

function createDb() {
  if (driver === "neon") {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool(poolOptions);
    return { pool, db: drizzleNeon({ client: pool, schema }) };
  }
  const pool = new pg.Pool(poolOptions);
  return { pool, db: drizzlePg({ client: pool, schema }) };
}

const created = createDb();

// Shared pool (also used by the Postgres session store).
export const pool = created.pool as unknown as pg.Pool;
export const db = created.db as ReturnType<typeof drizzleNeon<typeof schema>>;
export const databaseDriver = driver;

pool.on("error", (err: Error) => {
  console.error("Database pool error:", err);
});
