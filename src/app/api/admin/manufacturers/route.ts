import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import {
  adminApiError,
  assertAdminRequest,
  readAdminJson,
} from "@/server/services/admin-catalog-api";
import {
  createAdminManufacturer,
  listAdminManufacturers,
} from "@/server/services/admin-catalog.service";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await assertAdminRequest(request);
    const records = await listAdminManufacturers({
      search: request.nextUrl.searchParams.get("search"),
      category: request.nextUrl.searchParams.get("category"),
      sort: request.nextUrl.searchParams.get("sort"),
    });
    return NextResponse.json({ manufacturers: records });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const record = await createAdminManufacturer(await readAdminJson(request));
    return NextResponse.json({ manufacturer: { id: String(record._id), name: record.name, slug: record.slug } }, { status: 201 });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
