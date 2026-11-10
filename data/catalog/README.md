# Curated manufacturer catalogue

`manufacturers.v1.json` is a version-1 manifest accepted by the existing catalog importer. It is separate from the development fixtures in `src/lib/catalog/development-fixtures.ts` and intentionally contains no vehicle records.

## Research and verification

The 289 entries are a curated discovery set, not 289 fully verified production records. Each record is marked `pending`. The cited Wikipedia marque list, automobile-tuning article, and coachbuilder article are discovery/classification references; they are not a substitute for checking each entity against a primary or authoritative source. All records still need record-level corroboration of name, country, legal/brand identity, active status, and classification before being promoted to `verified`.

The catalogue distinguishes original vehicle manufacturers, independent specialist manufacturers, independent performance specialists, performance divisions, independent tuners, coachbuilders, and historic marques through `manufacturerType`. Categories are multi-label and use the existing Mongoose/import schema vocabulary. Discontinued records also carry the `historic-discontinued` category.

Official websites, logos, licenses, and ranking scores are deliberately omitted because they were not individually verified and sourced for this dataset. Do not populate those fields from guesses. The dataset currently has no ranked records.

## Source-verified initial records

`verified-initial.v1.json` contains only the records supported by the official Koenigsegg pages reviewed so far: the Koenigsegg manufacturer and the Gemera and CC850 model names visible on its official homepage. It intentionally omits logos, vehicle images, production years, generations, variants, and specifications because suitable evidence or usage terms were not verified. This is a partial seed, not a complete import of the original 16 fixtures.

Validate, dry-run, and apply this limited seed using the same importer commands above, substituting `data/catalog/verified-initial.v1.json` for the pending discovery manifest.

## Validation and import

Validate without connecting to MongoDB:

```powershell
npm run catalog:import -- --file data/catalog/manufacturers.v1.json --validate
```

After review, use the existing dry-run and controlled apply modes:

```powershell
npm run catalog:import -- --file data/catalog/manufacturers.v1.json --dry-run
npm run catalog:import -- --file data/catalog/manufacturers.v1.json --apply
```

The importer validates each record against the Mongoose-aligned Zod schema and rejects duplicate slugs. The catalog import tests additionally check the 200-record minimum, normalized-name/slug uniqueness, required research fields, and type/category consistency.
