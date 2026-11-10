This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## SHIFT authentication UI

The frontend-only authentication experiences are available at `/login`, `/signup`, `/forgot-password`, `/reset-password`, and `/verify-email`. Forms provide browser-side validation but do not send or store credentials; connect an authentication service before using them in production.

The cinematic auth panel uses the Ferrari commercial supplied by the project owner, delivered from the verified SHIFT Cloudinary asset; its original soundtrack stays muted to prevent voice audio. The landing hero image uses a separate verified SHIFT Cloudinary asset. Both public media references (folder, public ID, format, and version) are centralized in `src/lib/cloudinary/config.ts`. A separate Ferrari 458 Italia acceleration effect by AstonMartinVantageV12 from [Pixabay](https://pixabay.com/sound-effects/film-special-effects-ferrari-458-italia-sound-effect-going-fast-360530/) plays for one four-second burst on page entry. Autoplay sound may be blocked by browser policy; visitors can use “PLAY ENGINE” to replay the burst and adjust its volume.

The local poster and engine sound are stored at:

- `public/media/auth/shift-ferrari-black-studio-poster.webp`
- `public/media/auth/shift-ferrari-engine.mp3`

Update `posterSrc` and `soundSrc` in `src/components/auth/auth-media.ts` to use different local media.

## Automotive discovery

The discovery UI is available at `/discover`, `/discover/brands`, `/discover/brands/[slug]`, `/discover/vehicles`, `/discover/categories`, `/discover/collections`, and `/vehicles/[slug]`. `/home` redirects to the main landing page at `/`. Its normalized data contracts are in `src/lib/catalog/types.ts`. The GraphQL backend now exposes read-only manufacturer and vehicle catalog queries backed by MongoDB.

The manufacturer directory and manufacturer/vehicle detail pages read paginated, published records through the existing GraphQL API. Development fixtures are not used in the production rendering path. The current database has one incomplete Koenigsegg manufacturer and two associated vehicle records; none are published, and these records have no verified logos or vehicle photographs. The admin directory can seed the pending name-only discovery registry as incomplete drafts; the candidate names are not asserted to be a complete or source-verified production registry.

No external vehicle API endpoint or credential is configured or assumed by this project. The import format accepts SHIFT-curated, administrator-curated, and external API provenance records, but this phase does not connect or fetch from an external API. GraphQL reads only MongoDB and preserves record provenance and media usage/licensing metadata.

Manufacturer editorial ranking fields (`overallRank`, `categoryRanks`, `rankingScore`, `rankingCriteria`, `rankingExplanation`, `rankingSources`, and `lastRankedAt`) are stored on manufacturer records and exposed through GraphQL. The API supports overall-rank, category-rank, and alphabetical ordering, with stable cursor pagination and filters. SHIFT's editorial import validation requires all six criteria (0–5), a matching normalized score, an explanation, dated citations covering every criterion, and verified manufacturer status. No ranks are automatically assigned.

### Verified catalog import

The importer accepts a versioned JSON manifest with `schemaVersion: 1`, `manufacturers`, and `vehicles`. Empty arrays are valid and no sample manufacturer or vehicle records are included. Each manufacturer, vehicle, generation, and variant must include a `source` (`shift`, `admin-curated`, or `external-api`), one or more `dataSources` (title, publisher, HTTP(S) URL, and ISO-8601 `accessedAt`), and a `verificationStatus` (`verified`, `pending`, or `unverified`). Verified records additionally require `verifiedAt` and `verifiedBy`. See the strict validators in `src/server/services/catalog-import.schema.ts` for field limits and exact shapes.

- Manufacturers support category/type, country, official website, logo reference and explicit logo verification, active/discontinued status, and fully evidenced optional editorial ranks. A logo asset requires its own `verificationStatus`, source, license, and usage statement; the frontend only renders it as a logo when its status is verified.
- Vehicles are keyed by `slug` and reference a manufacturer by `manufacturerSlug`. They support production years/status, category, source-cited specifications, and images with source/license/usage/verification metadata.
- Generations are nested under vehicles and variants under generations. Their database relationships are saved as ObjectId references; generation and variant names are normalized within their parent.
- Ranking data is never synthesized. If any ranking field is present, all six 0–5 criteria, the matching mean-normalized score, an explanation, dated sources covering every criterion, and `lastRankedAt` are required. Only verified manufacturers may have ranks.
- Duplicate slugs within a manifest are rejected as a group. Existing records are upserted by their stable slug or parent/name key; records absent from a later file are not deleted. Soft-deleted records are reported and require an explicit restore workflow.

Run commands from the project root:

```powershell
# Validate shape and record rules without connecting to MongoDB.
npm run catalog:import -- --file .\catalog-manifest.json --validate

# Read current database state and preview creates/updates without writing.
npm run catalog:import -- --file .\catalog-manifest.json --dry-run

# Apply the reviewed manifest in a non-production administrative environment.
npm run catalog:import -- --file .\catalog-manifest.json --apply
```

The import command requires an explicit mode, caps the file at 25 MB, and processes records in batches (default 100, maximum 500). Set `MONGODB_URI` in `.env.local` for dry runs and applies; the URI is never printed. A validation or import rejection writes a JSON report beside the manifest by default; `--rejected <path>` selects another report location. Each rejected item contains the record identifier and validation/persistence reason. Any rejected record makes the command exit non-zero; inspect and correct the report before re-running. Re-running a successful manifest updates matching records rather than creating duplicates. Admin curation is available through the protected admin routes described below.

After an apply, verify the import with the GraphQL `manufacturers`, `manufacturer`, `vehicles`, and `vehicle` queries at `/api/graphql`. The reusable query documents in `src/lib/catalog/graphql-queries.ts` include ranking/provenance fields, media verification and nested generation/variant detail.

Run the importer and query-contract tests with `npm run test:catalog`. These use isolated in-memory repository doubles and synthetic test-only records; they do not write test records to MongoDB.

`/discover/vehicles` reads the published catalog. `/discover/categories` derives categories from manufacturer records; category links open the directory with that filter selected. `/discover/collections` separates the unavailable public curation archive from the personal `/collections` account area.

### Admin media uploads

The same-origin `POST /api/media` endpoint accepts a multipart `file`, `category`, and `resourceType`. It requires an authenticated user whose database-backed session has the `admin` role. Categories map only to the configured SHIFT folders for landing hero media and frames, login/signup backgrounds, manufacturer logos, vehicles, and editorial content. Images are limited to 15 MB and JPEG, PNG, WebP, or AVIF; videos are limited to 100 MB and MP4, MOV, or WebM. The endpoint validates file signatures, uploads through Cloudinary's server-side SDK, verifies the resulting asset, and then stores metadata in MongoDB. Failed verification or persistence triggers a Cloudinary cleanup attempt.

`uploadMediaFile` and `deleteMediaAssetFile` in `src/lib/cloudinary/upload-client.ts` are reusable browser helpers. The API Secret remains server-only; the Cloudinary SDK signs server-to-server upload requests. MongoDB (`MONGODB_URI`) and Cloudinary credentials are required only when these operations are requested. The admin catalogue editor can upload images and reuse saved Cloudinary image assets.

### Admin catalogue

The protected admin UI is available at `/admin/manufacturers` and `/admin/manufacturers/[id]`. It supports searching/filtering the manufacturer directory, creating and editing manufacturers, archiving, managing linked vehicle models, generation/variant details, gallery images, and source-backed specifications. The directory can optionally seed the candidate name registry as unpublished, incomplete drafts; review and complete each record before publishing.

Admin JSON endpoints are under `/api/admin/manufacturers`, `/api/admin/vehicles`, and `/api/admin/media`. Each endpoint checks the server-side authenticated administrator role; write requests also require same-origin requests. Public GraphQL catalog queries return only published manufacturers and vehicles, and vehicle results require a published parent manufacturer. Publishing requires a manufacturer name, country, classification, and a licensed logo; a vehicle additionally requires its published manufacturer and a licensed primary image. These checks do not independently verify factual claims or usage rights—the administrator remains responsible for confirming sources and rights.

## SHIFT Journal

The editorial routes are `/journal` and `/journal/[slug]`. They use a designed unavailable state rather than invented articles: no editorial content provider or verified article records are included in this project. Connect the SHIFT editorial service before publishing articles.

## Community and social UI

The social interface includes `/community`, `/profile/[username]` (including followers, following, garage, reels, and liked subroutes), `/create`, `/reels`, `/posts/[postId]` and comments, `/saved`, `/collections`, `/notifications`, `/search`, `/messages`, and `/settings` sections. Shared presentation and controls are in `src/components/social/social-experience.tsx`; normalized social record types are in `src/lib/social/types.ts`.

There is no authentication/session, social graph, post, upload, comments, saved-content, collection, notification, messaging, or profile-settings backend in this project. The explicit local UI previews are isolated in `src/lib/social/development-fixtures.ts` and are only returned in development by `social-data.ts`. They are labelled as development content; follow/like/save/publish/message/settings writes are disabled rather than shown as successful. The create page can preview selected local files in the browser, but does not upload them. The Reels preview uses the already supplied local SHIFT automotive video, starts muted, pauses outside view, and respects reduced motion.

The automotive catalogue has a protected admin content-management area. The remaining social and general profile-setting previews do not provide backend write operations.

## Backend API foundation

### Repository audit

- Next.js `16.4.5`, React `19.3.0`, strict TypeScript, App Router, and Node.js route handlers.
- No pre-existing API routes, Apollo/GraphQL schema, Mongoose models, MongoDB configuration, authentication/session implementation, or frontend API service was found.
- No `.env` files or environment keys existed at audit time. The existing sign-in and signup forms are local-only previews.
- The production catalog pages read published records through GraphQL. Social development fixtures remain isolated from catalog rendering.

### Implemented foundation

- `src/app/api/graphql/route.ts` exposes Apollo Server at `POST /api/graphql` and `GET /api/graphql` using the App Router Node.js runtime.
- `src/server/graphql/server.ts` configures Apollo, production introspection policy, and sanitized internal-error responses.
- `src/server/graphql/context.ts` creates a request context with an explicit unauthenticated principal (`null`). It does not trust a client-supplied user or role.
- `src/server/graphql/schema.ts` composes health and catalog SDL/resolvers.
- `src/server/graphql/modules/health/` contains the first GraphQL module.
- `src/server/graphql/modules/catalog/` defines public manufacturer/vehicle query types, enum mappings, and resolvers, including generation/variant reads. Public results are filtered to published records.
- `src/server/models/catalog/` defines manufacturer, vehicle, generation, and variant Mongoose schemas and indexes. Admin writes use protected route handlers rather than public GraphQL mutations.
- `src/server/services/catalog.service.ts` provides validated, bounded, cursor-paginated reads, ranking/name sorting, filters, and DTO mapping.
- `src/server/services/catalog-import.schema.ts` validates versioned manifests and ranking/provenance requirements.
- `src/server/services/catalog-import.service.ts` performs bounded, idempotent imports through an injectable repository; `catalog-import.mongo.ts` adapts it to Mongoose.
- `scripts/catalog-import.ts` is the explicit-mode CLI for validation, dry-run, and apply.
- `src/lib/catalog/graphql-queries.ts` defines typed-input GraphQL documents used by the catalog frontend.
- `src/server/services/health.service.ts` coordinates the liveness/status check, keeping operational behavior outside the resolver.
- `src/server/database/mongoose.ts` manages a process/HMR-safe Mongoose connection promise and reports connection state.
- `src/server/config/env.ts` validates server-only configuration and rejects malformed MongoDB URI schemes.
- `.env.example` documents `MONGODB_URI`. It is optional for the health query; when absent the API honestly returns `NOT_CONFIGURED` for the database. Configure a private MongoDB URI before adding database-backed operations.

Example requests:

```graphql
query HealthCheck {
  health {
    api
    database
    checkedAt
  }
}
```

```graphql
query ManufacturerDirectory($input: ManufacturerPageInput) {
  manufacturers(input: $input) {
    nodes {
      id
      slug
      name
      categories
      overallRank
      categoryRanks { category rank }
      rankingScore
      source
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```

The API health field reports `AVAILABLE` when the GraphQL service responds. Database status is `NOT_CONFIGURED`, `AVAILABLE`, or `UNAVAILABLE`; an unsuccessful Mongo connection is logged without exposing the connection string. Catalog reads are database-backed, bounded to 50 records per page, and return empty connections for an empty database. There are no public catalog write mutations; authenticated catalog administration is provided through the protected admin API routes.

### Dependencies

Added `@apollo/server`, `@as-integrations/next`, `graphql`, `mongoose`, and `zod`. Apollo's Next integration is compatible with Next 16 and Apollo Server 5. Axios is not added yet: no external HTTP provider is configured, and the built-in server-side `fetch` is sufficient until a concrete provider requires Axios behavior.

### Recommended server structure

Keep the Next route thin and organize backend code under `src/server/`:

```text
src/server/
  config/            validated, server-only environment
  database/          MongoDB connection and transaction helpers
  models/             Mongoose schemas and indexes
  graphql/
    context.ts        request principal, loaders, request metadata
    errors.ts         typed public error mapping
    schema.ts         module composition
    modules/<domain>/ SDL, resolvers, input validation
  services/<domain>/ business rules and persistence coordination
  auth/               password/session/token and authorization helpers
  integrations/        external vehicle/editorial providers
  media/               signed upload and asset policy
```

GraphQL resolvers should authenticate/authorize, validate inputs, then call a service. Services enforce invariants and use Mongoose repositories/models. The route owns transport concerns; it should not contain application queries.

### MongoDB collection and relationship plan

Use ObjectIds and reference IDs rather than copying whole documents. Enforce uniqueness/indexes in MongoDB as well as validating in services. Resolve references in application code because MongoDB does not provide relational foreign keys; prevent deletes that would orphan required records or perform explicit transactional cleanup. Prefer archival/soft deletion fields for user content and editorial records where retention is needed.

| Collection | Relationships and important constraints |
|---|---|
| `users` | Unique normalized email and username; role is server-managed; soft-delete/disable state; index role/status where needed. |
| `manufacturers` | Unique slug; verified source/ranking metadata; index status, categories, rank and name for directory filtering/sorting. |
| `vehicles` | References one manufacturer; unique slug; index manufacturer/category/status and stable sort fields. |
| `vehicleGenerations` | References one vehicle model; unique model + normalized generation key; index vehicle and year range. |
| `vehicleVariants` | References one generation; unique generation + normalized variant key; store verified specs and source references. |
| `posts` | References author and optionally vehicle; media metadata stays as asset references; index published feed by status/date/id and author/date. |
| `comments` | References post, author, optional parent comment; index post/date/id and parent; soft-delete body where moderation/audit policy requires. |
| `likes` | References user and a post/comment/vehicle target; unique user + target type + target ID; index target for counts and user for activity. |
| `follows` | References follower and followed users; unique pair, reject self-follow; index followed user for follower lists and follower for following lists. |
| `reels` | One-to-one unique reference to a post/media record; index publication state/date; avoid duplicating author/caption as a second source of truth. |
| `garages` | One per user (unique user reference); entries reference vehicle and optional generation/variant, with ordering and ownership metadata. |
| `savedItems` | References user and a typed target; unique user + target type + target ID; index user/date for library pagination. |
| `collections` | References owner; public/editorial state is explicit; index owner/date and public status/date. Store ordered typed item references or use a separate collection-items collection if list size warrants it. |
| `journalArticles` | Unique slug; author/editor references; optional manufacturer/vehicle references; index publication state/date/category; retain source and revision metadata. |
| `notifications` | References recipient and optional actor plus a typed target; index recipient/read/date/id; deduplicate repeated event notifications where appropriate. |
| `conversations` | References participants; separate membership records are preferred for efficient inbox and unread state. Enforce participant membership at service level. |
| `messages` | References conversation and sender; index conversation/date/id; soft-delete/redact under moderation and retention policy. |
| `conversationMembers` (supporting) | Unique conversation + user; references conversation/user and stores last-read/archive state; index user + activity time for inbox pagination. |

Use explicit generation and variant collections rather than conflating trim/edition/model concepts. Cursor pagination should use stable compound ordering (for example `(createdAt, _id)`), validate cursors, and cap page sizes. Avoid unbounded list queries and counts in hot feeds.

### GraphQL module plan

Add modules as domain services and data contracts become available: `auth`, `users`, `manufacturers`, `vehicles`, `community` (posts/comments), `social` (likes/follows), `reels`, `garage`, `collections`, `journal`, `notifications`, `messaging`, and `admin`. Each module owns SDL, resolvers, and request/input validation; services stay independent of GraphQL. Use cursor connections for large lists. Keep admin operations separate from public reads.

### Security and configuration plan

- Use bcrypt password hashing in the future auth service; never return password hashes or credential tokens in GraphQL.
- Use server-issued opaque sessions in `HttpOnly`, `Secure` (production), `SameSite=Lax` cookies with expiry/rotation and server-side revocation. Validate mutation origin/CSRF behavior. Do not accept client-selected user IDs or roles as identity.
- Store roles in the user record, derive them from a verified server session, and centralize role checks (`member`, editorial roles, `admin`). Public registration always creates a normal member. Protect all admin and private owner operations.
- Validate all GraphQL inputs at service boundaries; cap query depth/complexity and pagination, rate-limit auth and write operations using shared infrastructure, and map exceptions to stable public error codes. Do not expose stack traces, Mongo errors, or secrets.
- Keep secrets server-only and out of `NEXT_PUBLIC_*`. Current environment variable: optional `MONGODB_URI`. Planned variables when implementing the corresponding capabilities: `AUTH_SESSION_SECRET`, deployment `PUBLIC_ORIGIN`, rate-limit store credentials, and media provider credentials. Add each only when its service is chosen; never commit live values.
- Store images/video in an approved object-storage/media provider and persist metadata/rights in MongoDB. Use short-lived signed upload URLs and server-side MIME/size/ownership checks; do not put binary media in MongoDB.
- Use admin-curated and external vehicle providers through server-only adapters. Keep provider credentials on the server and persist attribution/licensing with each media reference.

### Implementation sequence

1. **Foundation (implemented):** validated server environment, reusable Mongo connection, Apollo App Router endpoint, typed unauthenticated context, centralized error masking, and database-aware health query.
2. **Auth and authorization:** session design, bcrypt, signup/sign-in/reset/verification services, rate limiting, RBAC, and tests before enabling auth UI writes.
3. **Automotive catalog (implemented):** manufacturer/vehicle/generation/variant models, source/licensing and verification fields, validated filters, ranking/name sorting, cursor-paginated published reads, nested generation/variant reads, a dry-run/idempotent curated JSON importer, and authenticated admin curation with draft and publication workflows.
4. **Editorial and media:** article lifecycle, media provider and signed uploads, attribution, moderation.
5. **Community and social:** posts, comments, likes, follows, reels, garages, saves, collections, notifications; owner policies and transactional consistency.
6. **Messaging and social admin:** conversations/messages and remaining protected content-management areas.
7. **Production readiness:** integration tests against MongoDB, schema validation, query complexity/rate limiting, observability, backup/retention, migration/index deployment and load testing.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
