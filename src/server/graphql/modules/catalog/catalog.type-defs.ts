export const catalogTypeDefs = /* GraphQL */ `
  enum ManufacturerCategory {
    HYPERCAR
    SUPERCAR
    LUXURY
    SPORTS
    ELECTRIC
    MAINSTREAM
    PERFORMANCE_TUNER
    COACHBUILDER
    HISTORIC_DISCONTINUED
  }

  enum ManufacturerStatus {
    ACTIVE
    DISCONTINUED
  }

  enum VehicleStatus {
    CURRENT
    DISCONTINUED
    LIMITED_PRODUCTION
  }

  enum CatalogSource {
    SHIFT
    EXTERNAL_API
    ADMIN_CURATED
    DEVELOPMENT_FIXTURE
  }

  enum VerificationStatus {
    VERIFIED
    PENDING
    UNVERIFIED
  }

  enum ManufacturerSort {
    NAME_ASC
    OVERALL_RANK
    CATEGORY_RANK
  }

  type MediaReference {
    url: String!
    alt: String!
    source: String!
    caption: String
    isPrimary: Boolean
    sortOrder: Int
    license: String
    usage: String
    verificationStatus: VerificationStatus
  }

  type CatalogDataSource {
    title: String!
    publisher: String!
    url: String!
    accessedAt: String!
  }

  type RankingCriteria {
    prestige: Float
    performance: Float
    exclusivity: Float
    innovation: Float
    heritage: Float
    industryInfluence: Float
  }

  type RankingSource {
    title: String!
    publisher: String!
    url: String!
    accessedAt: String!
    supports: [String!]!
  }

  type ManufacturerCategoryRanking {
    category: ManufacturerCategory!
    rank: Int!
  }

  type Manufacturer {
    id: ID!
    slug: String!
    name: String!
    logo: MediaReference
    coverImage: MediaReference
    description: String
    about: String
    history: String
    countryOfOrigin: String
    foundingYear: Int
    manufacturerType: String
    officialWebsite: String
    categories: [ManufacturerCategory!]!
    featured: Boolean!
    vehicleCount: Int
    status: ManufacturerStatus
    logoVerificationStatus: VerificationStatus
    verificationStatus: VerificationStatus
    verifiedAt: String
    verifiedBy: String
    dataSources: [CatalogDataSource!]!
    overallRank: Int
    categoryRanks: [ManufacturerCategoryRanking!]!
    rankingScore: Float
    rankingCriteria: RankingCriteria
    rankingExplanation: String
    rankingSources: [RankingSource!]
    lastRankedAt: String
    source: CatalogSource!
  }

  type VehicleSpecification {
    label: String!
    value: String!
    source: String!
  }

  type VehicleVariant {
    id: ID!
    name: String!
    edition: String
    status: VehicleStatus
    specifications: [VehicleSpecification!]!
    source: CatalogSource
    verificationStatus: VerificationStatus
    verifiedAt: String
    verifiedBy: String
    dataSources: [CatalogDataSource!]!
  }

  type VehicleGeneration {
    id: ID!
    name: String!
    productionStartYear: Int
    productionEndYear: Int
    description: String
    variants: [VehicleVariant!]!
    source: CatalogSource
    verificationStatus: VerificationStatus
    verifiedAt: String
    verifiedBy: String
    dataSources: [CatalogDataSource!]!
  }

  type Vehicle {
    id: ID!
    slug: String!
    manufacturerSlug: String!
    manufacturerName: String!
    modelName: String!
    description: String
    historicalBackground: String
    designEngineering: String
    images: [MediaReference!]!
    category: String
    productionStartYear: Int
    productionEndYear: Int
    status: VehicleStatus
    featured: Boolean
    specifications: [VehicleSpecification!]!
    generations: [VehicleGeneration!]!
    verificationStatus: VerificationStatus
    verifiedAt: String
    verifiedBy: String
    dataSources: [CatalogDataSource!]!
    source: CatalogSource!
  }

  input ManufacturerFilter {
    search: String
    category: ManufacturerCategory
    countryOfOrigin: String
    status: ManufacturerStatus
    featured: Boolean
  }

  input ManufacturerPageInput {
    first: Int = 24
    after: String
    sort: ManufacturerSort = OVERALL_RANK
    rankingCategory: ManufacturerCategory = HYPERCAR
    filter: ManufacturerFilter
  }

  input VehicleFilter {
    search: String
    manufacturerSlug: String
    category: String
    status: VehicleStatus
  }

  input VehiclePageInput {
    first: Int = 24
    after: String
    filter: VehicleFilter
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type ManufacturerConnection {
    nodes: [Manufacturer!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type VehicleConnection {
    nodes: [Vehicle!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  extend type Query {
    manufacturers(input: ManufacturerPageInput): ManufacturerConnection!
    manufacturer(slug: String!): Manufacturer
    vehicles(input: VehiclePageInput): VehicleConnection!
    vehicle(slug: String!): Vehicle
  }
`;
