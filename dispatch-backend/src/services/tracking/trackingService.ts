import type { AuthRequest } from "../../middleware/authMiddleware";
import { prisma } from "../../prisma/client";
import type { DispatchTrackingDto, TrackingProviderName, TrackingQueryOptions, TrackingRequestContext } from "./trackingTypes";
import { mockTrackingProvider } from "./providers/mockTrackingProvider";
import { hwamul24TrackingProvider } from "./providers/hwamul24TrackingProvider";
import { insungTrackingProvider } from "./providers/insungTrackingProvider";

function isStaffRole(role?: string | null) {
  return role === "ADMIN" || role === "DISPATCHER" || role === "SALES";
}

async function canAccessTracking(req: AuthRequest, ownerCompanyId: number | null) {
  if (!req.user) return false;
  if (isStaffRole(req.user.role)) return true;
  if (req.user.role !== "CLIENT") return false;
  const me = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { companyName: true },
  });
  const companyName = me?.companyName?.trim();
  if (!companyName) return false;
  const company = await prisma.companyName.findUnique({
    where: { name: companyName },
    select: { id: true },
  });
  return Boolean(company && company.id === ownerCompanyId);
}

const REAL_TRACKING_PROVIDER_ENABLED = process.env.TRACKING_REAL_PROVIDER_ENABLED === "true";

function resolveProviderName(options?: TrackingQueryOptions): TrackingProviderName {
  const requestedProvider = options?.provider ?? "mock";
  if (requestedProvider !== "mock" && !REAL_TRACKING_PROVIDER_ENABLED) {
    console.log(
      `[tracking] requested tracking provider: ${requestedProvider}; real providers disabled, falling back to mock`
    );
    return "mock";
  }
  return requestedProvider;
}

function getProvider(name: TrackingProviderName) {
  if (name === "hwamul24") return hwamul24TrackingProvider;
  if (name === "insung") return insungTrackingProvider;
  return mockTrackingProvider;
}

export async function fetchDispatchTracking(
  req: AuthRequest,
  requestId: number,
  options?: TrackingQueryOptions
): Promise<
  | { ok: true; data: DispatchTrackingDto }
  | { ok: false; status: number; message: string }
> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      call24OrdNo: true,
      insungSerialNumber: true,
      ownerCompanyId: true,
      pickupPlaceName: true,
      pickupAddress: true,
      dropoffPlaceName: true,
      dropoffAddress: true,
      assignments: {
        where: { isActive: true },
        take: 1,
        include: { driver: true },
        orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
      },
    },
  });

  if (!request) {
    return { ok: false, status: 404, message: "해당 배차요청을 찾을 수 없습니다." };
  }

  if (!(await canAccessTracking(req, request.ownerCompanyId))) {
    return { ok: false, status: 403, message: "이 요청의 위치 정보를 조회할 권한이 없습니다." };
  }

  const assignment = request.assignments[0] ?? null;
  const context: TrackingRequestContext = {
    requestId: request.id,
    orderNumber: request.orderNumber ?? null,
    call24OrdNo: request.call24OrdNo ?? null,
    insungSerialNumber: request.insungSerialNumber ?? null,
    status: request.status,
    pickupName: request.pickupPlaceName ?? null,
    pickupAddress: request.pickupAddress ?? null,
    dropoffName: request.dropoffPlaceName ?? null,
    dropoffAddress: request.dropoffAddress ?? null,
    driver: assignment
      ? {
          name: assignment.driver.name ?? null,
          phone: assignment.driver.phone ?? null,
          carNumber: assignment.driver.vehicleNumber ?? null,
          carTon: assignment.driver.vehicleTonnage == null ? null : `${assignment.driver.vehicleTonnage}톤`,
          carType: assignment.driver.vehicleBodyType ?? null,
        }
      : null,
  };

  const providerName = resolveProviderName(options);
  console.log(`[tracking] selected tracking provider: ${providerName}`);
  const provider = getProvider(providerName);
  const data = await provider.getTracking(context, options);
  return { ok: true, data };
}
