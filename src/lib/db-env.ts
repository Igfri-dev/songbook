type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

function envValue(name: string, fallback: string) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function positiveIntegerEnv(name: string, fallback: number) {
  const rawValue = envValue(name, String(fallback));
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: envValue("DB_HOST", "127.0.0.1"),
    port: positiveIntegerEnv("DB_PORT", 3307),
    user: envValue("DB_USER", "root"),
    password: process.env.DB_PASSWORD ?? "",
    database: envValue("DB_NAME", "cancionero"),
    connectionLimit: positiveIntegerEnv("DB_CONNECTION_LIMIT", 10),
  };
}
