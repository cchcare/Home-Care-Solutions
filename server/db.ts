import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon's serverless driver speaks a WebSocket-proxied protocol that only
// Neon's own endpoints understand. Anywhere else (local dev, CI's plain
// postgres:16 service container) needs the standard node-postgres driver
// instead — detected by hostname rather than an extra env var so nothing
// new has to be configured per environment.
const isNeon = /(^|\.)neon\.tech$/.test(new URL(process.env.DATABASE_URL).hostname);

export const pool = isNeon
  ? new NeonPool({ connectionString: process.env.DATABASE_URL })
  : new PgPool({ connectionString: process.env.DATABASE_URL });

export const db = isNeon
  ? neonDrizzle({ client: pool as NeonPool, schema })
  : pgDrizzle({ client: pool as PgPool, schema });