import { parse } from "graphql";
import { authResolvers } from "@/server/graphql/modules/auth/auth.resolvers";
import { authTypeDefs } from "@/server/graphql/modules/auth/auth.type-defs";
import { catalogResolvers } from "@/server/graphql/modules/catalog/catalog.resolvers";
import { catalogTypeDefs } from "@/server/graphql/modules/catalog/catalog.type-defs";
import { healthResolvers } from "@/server/graphql/modules/health/health.resolvers";
import { healthTypeDefs } from "@/server/graphql/modules/health/health.type-defs";

const rootTypeDefs = /* GraphQL */ `
  type Query {
    _empty: Boolean
  }

  type Mutation {
    _empty: Boolean
  }
`;

export const typeDefs = [
  parse(rootTypeDefs),
  parse(healthTypeDefs),
  parse(catalogTypeDefs),
  parse(authTypeDefs),
];

export const resolvers = {
  ManufacturerCategory: catalogResolvers.ManufacturerCategory,
  ManufacturerStatus: catalogResolvers.ManufacturerStatus,
  VehicleStatus: catalogResolvers.VehicleStatus,
  CatalogSource: catalogResolvers.CatalogSource,
  VerificationStatus: catalogResolvers.VerificationStatus,
  Manufacturer: catalogResolvers.Manufacturer,
  RankingSource: catalogResolvers.RankingSource,
  Vehicle: catalogResolvers.Vehicle,
  VehicleGeneration: catalogResolvers.VehicleGeneration,
  Query: {
    ...healthResolvers.Query,
    ...catalogResolvers.Query,
    ...authResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
  },
};
