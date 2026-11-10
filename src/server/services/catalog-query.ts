import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import type { ManufacturerCategory } from "@/lib/catalog/types";

export type ManufacturerSortMode = "NAME_ASC" | "OVERALL_RANK" | "CATEGORY_RANK";

export type ManufacturerCursorBoundary = {
  sort: ManufacturerSortMode;
  ranked: number;
  rank?: number;
  name: string;
  id: string;
};

export function buildManufacturerPipeline(input: {
  match: PipelineStage.Match["$match"];
  sort: ManufacturerSortMode;
  rankingCategory: ManufacturerCategory;
  first: number;
  cursor?: ManufacturerCursorBoundary;
}): PipelineStage[] {
  const { match, sort, rankingCategory, first, cursor } = input;
  let pipeline: PipelineStage[];

  if (sort === "OVERALL_RANK") {
    pipeline = [
      { $match: match },
      {
        $addFields: {
          _cursorRank: {
            $cond: [
              { $eq: ["$verificationStatus", "verified"] },
              "$overallRank",
              null,
            ],
          },
        },
      },
      { $addFields: { _ranked: { $cond: [{ $and: [{ $isNumber: "$_cursorRank" }, { $gt: ["$_cursorRank", 0] }] }, 0, 1] } } },
    ];
  } else {
    pipeline = [{ $match: match }];
    if (sort === "CATEGORY_RANK") {
      pipeline.push({
        $addFields: {
          _cursorRank: {
            $cond: [
              { $eq: ["$verificationStatus", "verified"] },
              { $getField: { field: rankingCategory, input: "$categoryRanks" } },
              null,
            ],
          },
        },
      });
      pipeline.push({
        $addFields: {
          _ranked: { $cond: [{ $and: [{ $isNumber: "$_cursorRank" }, { $gt: ["$_cursorRank", 0] }] }, 0, 1] },
        },
      });
    }
  }

  if (sort !== "NAME_ASC" && cursor) {
    pipeline.push({
      $match: {
        $or: [
          { _ranked: { $gt: cursor.ranked } },
          ...(cursor.ranked === 0 && cursor.rank !== undefined ? [
            { _ranked: 0, _cursorRank: { $gt: cursor.rank } },
            { _ranked: 0, _cursorRank: cursor.rank, name: { $gt: cursor.name } },
            { _ranked: 0, _cursorRank: cursor.rank, name: cursor.name, _id: { $gt: new Types.ObjectId(cursor.id) } },
          ] : []),
          ...(cursor.ranked === 1 ? [
            { _ranked: 1, name: { $gt: cursor.name } },
            { _ranked: 1, name: cursor.name, _id: { $gt: new Types.ObjectId(cursor.id) } },
          ] : []),
        ],
      },
    });
  } else if (sort === "NAME_ASC" && cursor) {
    pipeline.push({
      $match: {
        $or: [
          { name: { $gt: cursor.name } },
          { name: cursor.name, _id: { $gt: new Types.ObjectId(cursor.id) } },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: sort === "NAME_ASC"
      ? { name: 1, _id: 1 }
      : { _ranked: 1, _cursorRank: 1, name: 1, _id: 1 } },
    { $limit: first + 1 },
  );
  return pipeline;
}
