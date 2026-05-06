import * as mariadb from "mariadb";
import type { PoolConnection } from "mariadb";
import { getDatabaseConfig } from "./db-env";

type QueryParam = string | number | boolean | Date | null;

export type DbResult = {
  affectedRows: number;
  insertId?: number | bigint;
};

export type DbClient = {
  query: <T>(sql: string, params?: QueryParam[]) => Promise<T[]>;
  queryOne: <T>(sql: string, params?: QueryParam[]) => Promise<T | null>;
  execute: (sql: string, params?: QueryParam[]) => Promise<DbResult>;
};

const globalForDb = globalThis as unknown as {
  songbookDbPool?: mariadb.Pool;
};

function createPool() {
  return mariadb.createPool({
    ...getDatabaseConfig(),
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
}

const pool = globalForDb.songbookDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.songbookDbPool = pool;
}

function toRows<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : [];
}

function clientFromConnection(connection: PoolConnection): DbClient {
  return {
    async query<T>(sql: string, params: QueryParam[] = []) {
      return toRows<T>(await connection.query(sql, params));
    },
    async queryOne<T>(sql: string, params: QueryParam[] = []) {
      const rows = await this.query<T>(sql, params);
      return rows[0] ?? null;
    },
    async execute(sql: string, params: QueryParam[] = []) {
      return connection.query(sql, params) as Promise<DbResult>;
    },
  };
}

export const db: DbClient = {
  async query<T>(sql: string, params: QueryParam[] = []) {
    return toRows<T>(await pool.query(sql, params));
  },
  async queryOne<T>(sql: string, params: QueryParam[] = []) {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  },
  async execute(sql: string, params: QueryParam[] = []) {
    return pool.query(sql, params) as Promise<DbResult>;
  },
};

export async function transaction<T>(callback: (client: DbClient) => Promise<T>) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(clientFromConnection(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function insertedId(result: DbResult) {
  return Number(result.insertId ?? 0);
}

export async function closeDbPool() {
  await pool.end();
}
