import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced database configuration for production compatibility
const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 20 : 10, // More connections in production
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 5 second timeout
  statement_timeout: 10000, // 10 second query timeout
  query_timeout: 10000,
});

export const db = drizzle({ client: pool, schema });
