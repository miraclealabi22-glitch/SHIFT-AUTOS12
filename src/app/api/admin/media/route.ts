import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { MediaAssetModel } from "@/server/models/media/media-asset.model";
import { connectToDatabase } from "@/server/database/mongoose";
import { adminApiError, assertAdminRequest } from "@/server/services/admin-catalog-api";

const categories = ["manufacturers", "vehicles"] as const;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await assertAdminRequest(request);
    const category = request.nextUrl.searchParams.get("category");
    if (!categories.includes(category as typeof categories[number])) {
      return NextResponse.json({ error: "Choose a valid media category." }, { status: 400 });
    }
    if (await connectToDatabase() !== "AVAILABLE") {
      throw new Error("CATALOG_UNAVAILABLE");
    }
    const assets = await MediaAssetModel.find({
      category,
      resourceType: "image",
    }).sort({ createdAt: -1 }).limit(100).lean().exec();
    return NextResponse.json({
      assets: assets.map((asset) => ({
        id: String(asset._id),
        publicId: asset.publicId,
        url: asset.secureUrl,
        createdAt: asset.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
