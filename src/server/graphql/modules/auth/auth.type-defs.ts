export const authTypeDefs = /* GraphQL */ `
  type User {
    id: ID!
    name: String!
    username: String!
    email: String!
    roles: [String!]!
    createdAt: String!
  }

  type AuthSession {
    user: User!
    expiresAt: String!
  }

  input RegisterInput {
    name: String!
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthSession!
    login(input: LoginInput!): AuthSession!
    logout: Boolean!
  }
`;
