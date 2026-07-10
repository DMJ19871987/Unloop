import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
import * as relations from "./relations";

// Some runtimes lack a global WebSocket; Neon's Pool needs one.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const fullSchema = { ...schema, ...relations };

let cachedDb: ReturnType<typeof createDb> | null = null;

function createDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema: fullSchema });
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  if (!cachedDb) {
    cachedDb = createDb(url);
  }
  return cachedDb;
}

export type Db = NonNullable<ReturnType<typeof getDb>>;

export { schema };
