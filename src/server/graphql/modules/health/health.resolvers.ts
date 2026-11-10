import { getHealthStatus } from "@/server/services/health.service";

export const healthResolvers = {
  Query: {
    health: () => getHealthStatus(),
  },
};
