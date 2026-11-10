import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import {
  adminApiError,
  assertAdminRequest,
  readAdminJson,
} from "@/server/services/admin-catalog-api";
import { createAdminVehicle } from "@/server/services/admin-catalog.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    const { id } = await context.params;
    const vehicle = await createAdminVehicle(id, await readAdminJson(request));
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
