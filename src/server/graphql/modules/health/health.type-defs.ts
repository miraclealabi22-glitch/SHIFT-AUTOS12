export const healthTypeDefs = /* GraphQL */ `
  enum ServiceStatus {
    AVAILABLE
    NOT_CONFIGURED
    UNAVAILABLE
  }

  type HealthStatus {
    api: ServiceStatus!
    database: ServiceStatus!
    checkedAt: String!
  }

  extend type Query {
    health: HealthStatus!
  }
`;
