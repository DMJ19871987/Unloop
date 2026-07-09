import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as relations from "./relations";

const fullSchema = { ...schema, ...relations };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  const sql = neon(url);
  return drizzle(sql, { schema: fullSchema });
}

export type Db = NonNullable<ReturnType<typeof getDb>>;

export { schema };
