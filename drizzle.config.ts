import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` works without a database; `push` needs DATABASE_URL.

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost/unused",
  },
});
