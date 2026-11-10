import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import {
  adminApiError,
  assertAdminRequest,
  readAdminJson,
} from "@/server/services/admin-catalog-api";
import {
  getAdminManufacturer,
  updateAdminManufacturer,
} from "@/server/services/admin-catalog.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request);
    const { id } = await context.params;
    return NextResponse.json({ manufacturer: await getAdminManufacturer(id) });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const { id } = await context.params;
    const manufacturer = await updateAdminManufacturer(id, await readAdminJson(request));
    return NextResponse.json({ manufacturer });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const { id } = await context.params;
    const manufacturer = await updateAdminManufacturer(id, { publicationStatus: "archived" });
    return NextResponse.json({ manufacturer });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
