import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { buildManufacturerPipeline } from "@/server/services/catalog-query";

test("overall ranking orders verified ranks before unranked records with stable tie breakers", () => {
  const pipeline = buildManufacturerPipeline({
    match: { deletedAt: null },
    sort: "OVERALL_RANK",
    rankingCategory: "hypercar",
    first: 24,
  });
  const sort = pipeline.find((stage) => "$sort" in stage);
  const rankField = pipeline.find((stage) => "$addFields" in stage && "_ranked" in stage.$addFields);
  const rankValue = pipeline.find((stage) => "$addFields" in stage && "_cursorRank" in stage.$addFields);
  assert.deepEqual(sort, { $sort: { _ranked: 1, _cursorRank: 1, name: 1, _id: 1 } });
  assert.ok(JSON.stringify(rankValue).includes("verificationStatus"));
  assert.ok(JSON.stringify(rankField).includes("_cursorRank"));
  assert.deepEqual(pipeline.at(-1), { $limit: 25 });
});

test("category ranking selects the requested category rank and paginates after its tie-break tuple", () => {
  const id = new Types.ObjectId().toHexString();
  const pipeline = buildManufacturerPipeline({
    match: { deletedAt: null },
    sort: "CATEGORY_RANK",
    rankingCategory: "sports",
    first: 10,
    cursor: { sort: "CATEGORY_RANK", ranked: 0, rank: 2, name: "Test Maker", id },
  });
  const categoryField = pipeline.find((stage) => "$addFields" in stage && "_cursorRank" in stage.$addFields);
  const afterCursor = pipeline.find((stage) => "$match" in stage && "$or" in stage.$match);
  assert.ok(JSON.stringify(categoryField).includes('"field":"sports"'));
  assert.ok(afterCursor);
  assert.equal(JSON.stringify(afterCursor).includes(id), true);
  assert.deepEqual(pipeline.at(-1), { $limit: 11 });
});

test("alphabetical pagination uses name then ObjectId and respects the first limit", () => {
  const id = new Types.ObjectId().toHexString();
  const pipeline = buildManufacturerPipeline({
    match: { deletedAt: null },
    sort: "NAME_ASC",
    rankingCategory: "hypercar",
    first: 48,
    cursor: { sort: "NAME_ASC", ranked: 1, name: "Test Maker", id },
  });
  const afterCursor = pipeline.find((stage) => "$match" in stage && "$or" in stage.$match);
  assert.deepEqual(pipeline.find((stage) => "$sort" in stage), { $sort: { name: 1, _id: 1 } });
  assert.ok(afterCursor);
  assert.ok(JSON.stringify(afterCursor).includes(id));
  assert.deepEqual(pipeline.at(-1), { $limit: 49 });
});
