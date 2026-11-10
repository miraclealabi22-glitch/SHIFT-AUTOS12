import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import {
  adminApiError,
  assertAdminRequest,
  readAdminJson,
} from "@/server/services/admin-catalog-api";
import {
  archiveAdminVehicle,
  getAdminVehicle,
  updateAdminVehicle,
} from "@/server/services/admin-catalog.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request);
    const { id } = await context.params;
    return NextResponse.json({ vehicle: await getAdminVehicle(id) });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const { id } = await context.params;
    const vehicle = await updateAdminVehicle(id, await readAdminJson(request));
    return NextResponse.json({ vehicle });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const { id } = await context.params;
    return NextResponse.json({ vehicle: await archiveAdminVehicle(id) });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
