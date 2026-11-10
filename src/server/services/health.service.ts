import { connectToDatabase } from "@/server/database/mongoose";
import type { DatabaseHealth } from "@/server/database/mongoose";

export type HealthStatus = {
  api: "AVAILABLE";
  database: DatabaseHealth;
  checkedAt: string;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: DatabaseHealth;

  try {
    database = await connectToDatabase();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(JSON.stringify({
      event: "database.health_check_failed",
      errorName,
    }));
    database = "UNAVAILABLE";
  }

  return {
    api: "AVAILABLE",
    database,
    checkedAt: new Date().toISOString(),
  };
}
