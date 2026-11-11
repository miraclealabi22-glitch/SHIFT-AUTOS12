export const manufacturersQuery = /* GraphQL */ `
  query Manufacturers($input: ManufacturerPageInput) {
    manufacturers(input: $input) {
      nodes {
        id
        slug
        name
        logo {
          url
          alt
          source
          caption
          isPrimary
          sortOrder
          license
          usage
          verificationStatus
        }
        description
        coverImage { url alt source caption isPrimary sortOrder license usage verificationStatus }
        about
        history
        countryOfOrigin
        foundingYear
        manufacturerType
        officialWebsite
        categories
        featured
        vehicleCount
        status
        logoVerificationStatus
        verificationStatus
        verifiedAt
        verifiedBy
        dataSources {
          title
          publisher
          url
          accessedAt
        }
        overallRank
        categoryRanks {
          category
          rank
        }
        rankingScore
        rankingCriteria {
          prestige
          performance
          exclusivity
          innovation
          heritage
          industryInfluence
        }
        rankingExplanation
        rankingSources {
          title
          publisher
          url
          accessedAt
          supports
        }
        lastRankedAt
        source
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const manufacturerBySlugQuery = /* GraphQL */ `
  query ManufacturerBySlug($slug: String!) {
    manufacturer(slug: $slug) {
      id
      slug
      name
      logo { url alt source caption isPrimary sortOrder license usage verificationStatus }
      coverImage { url alt source caption isPrimary sortOrder license usage verificationStatus }
      description
      about
      history
      countryOfOrigin
      foundingYear
      manufacturerType
      officialWebsite
      categories
      featured
      vehicleCount
      status
      logoVerificationStatus
      verificationStatus
      verifiedAt
      verifiedBy
      dataSources { title publisher url accessedAt }
      overallRank
      categoryRanks { category rank }
      rankingScore
      rankingCriteria {
        prestige
        performance
        exclusivity
        innovation
        heritage
        industryInfluence
      }
      rankingExplanation
      rankingSources { title publisher url accessedAt supports }
      lastRankedAt
      source
    }
  }
`;

export const vehiclesQuery = /* GraphQL */ `
  query Vehicles($input: VehiclePageInput) {
    vehicles(input: $input) {
      nodes {
        id
        slug
        manufacturerSlug
        manufacturerName
        modelName
        description
        images { url alt source caption isPrimary sortOrder license usage verificationStatus mediaCategory imageView generationName variantName isPrimaryInterior }
        category
        historicalBackground
        designEngineering
        productionStartYear
        productionEndYear
        status
        featured
        specifications { label value source }
        verificationStatus
        verifiedAt
        verifiedBy
        dataSources { title publisher url accessedAt }
        source
        generations {
          id
          name
          productionStartYear
          productionEndYear
          description
          source
          verificationStatus
          verifiedAt
          verifiedBy
          dataSources { title publisher url accessedAt }
          variants {
            id
            name
            edition
            status
            specifications { label value source }
            source
            verificationStatus
            verifiedAt
            verifiedBy
            dataSources { title publisher url accessedAt }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

export const vehicleBySlugQuery = /* GraphQL */ `
  query VehicleBySlug($slug: String!) {
    vehicle(slug: $slug) {
      id
      slug
      manufacturerSlug
      manufacturerName
      modelName
      description
      images { url alt source caption isPrimary sortOrder license usage verificationStatus mediaCategory imageView generationName variantName isPrimaryInterior }
      category
      historicalBackground
      designEngineering
      productionStartYear
      productionEndYear
      status
      featured
      specifications { label value source }
      verificationStatus
      verifiedAt
      verifiedBy
      dataSources { title publisher url accessedAt }
      source
      generations {
        id
        name
        productionStartYear
        productionEndYear
        description
        source
        verificationStatus
        verifiedAt
        verifiedBy
        dataSources { title publisher url accessedAt }
        variants {
          id
          name
          edition
          status
          specifications { label value source }
          source
          verificationStatus
          verifiedAt
          verifiedBy
          dataSources { title publisher url accessedAt }
        }
      }
    }
  }
`;

export type ManufacturerPageVariables = {
  input?: {
    first?: number;
    after?: string;
    sort?: "NAME_ASC" | "OVERALL_RANK" | "CATEGORY_RANK";
    rankingCategory?: string;
    filter?: {
      search?: string;
      startsWith?: string;
      category?: string;
      countryOfOrigin?: string;
      status?: "ACTIVE" | "DISCONTINUED";
      featured?: boolean;
    };
  };
};

export type VehiclePageVariables = {
  input?: {
    first?: number;
    after?: string;
    filter?: {
      search?: string;
      manufacturerSlug?: string;
      category?: string;
      status?: "CURRENT" | "DISCONTINUED" | "LIMITED_PRODUCTION";
    };
  };
};
