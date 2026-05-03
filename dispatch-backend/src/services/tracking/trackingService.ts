import type { AuthRequest } from "../../middleware/authMiddleware";
import { prisma } from "../../prisma/client";
import { geocodeAddress, type Coord } from "../geocoding";
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

// 실제 provider 사용 여부: 기본 true. 필요 시 TRACKING_REAL_PROVIDER_ENABLED=false 로 mock 강제.
const REAL_TRACKING_PROVIDER_ENABLED =
  (process.env.TRACKING_REAL_PROVIDER_ENABLED ?? "true").toLowerCase() !== "false";

const routeCoordCache = new Map<string, Promise<Coord | null>>();

function buildTrackingAddress(address?: string | null, detail?: string | null) {
  return [address?.trim(), detail?.trim()].filter(Boolean).join(" ").trim();
}

async function resolveTrackingCoord(address?: string | null, detail?: string | null): Promise<Coord | null> {
  const baseAddress = address?.trim() ?? "";
  const fullAddress = buildTrackingAddress(address, detail);
  if (!fullAddress) return null;

  const cacheKey = `${fullAddress}::${baseAddress}`;
  const cached = routeCoordCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      return await geocodeAddress(fullAddress);
    } catch (fullError) {
      if (baseAddress && baseAddress !== fullAddress) {
        try {
          return await geocodeAddress(baseAddress);
        } catch {
          // 아래 공통 로그에서 full 주소 기준으로만 남긴다.
        }
      }
      console.warn(
        `[tracking] route coordinate lookup failed: "${fullAddress}"`,
        fullError instanceof Error ? fullError.message : fullError
      );
      return null;
    }
  })();

  routeCoordCache.set(cacheKey, promise);
  return promise;
}

function resolveProviderName(
  context: Pick<TrackingRequestContext, "call24OrdNo" | "insungSerialNumber" | "vehicleGroup">,
  options?: TrackingQueryOptions
): TrackingProviderName {
  const requestedProvider =
    options?.provider ??
    (context.call24OrdNo
      ? "hwamul24"
      : context.insungSerialNumber
      ? "insung"
      : ["MOTORCYCLE", "DAMAS", "LABO"].includes(context.vehicleGroup ?? "")
      ? "insung"
      : "hwamul24");
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

function sanitizeTrackingMessageForClient(message: string | null) {
  if (!message) return null;
  if (message.includes("등록 정보가 없습니다")) {
    return "위치 정보가 아직 없습니다.";
  }
  if (message.includes("위치 조회 실패")) {
    return "위치 조회에 실패했습니다.";
  }
  if (message.includes("권한") || message.includes("화이트리스트")) {
    return "위치 정보를 확인할 수 없습니다.";
  }
  return message
    .replace(/인성|화물24|Call24|Hwamul24|hwamul24|Insung|insung/g, "외부")
    .trim();
}

function sanitizeTrackingForRole(role: string | null | undefined, data: DispatchTrackingDto): DispatchTrackingDto {
  if (isStaffRole(role)) {
    return data;
  }

  return {
    ...data,
    orderNo: null,
    provider: null,
    message: sanitizeTrackingMessageForClient(data.message),
  };
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
      vehicleGroup: true,
      ownerCompanyId: true,
      pickupPlaceName: true,
      pickupAddress: true,
      pickupAddressDetail: true,
      dropoffPlaceName: true,
      dropoffAddress: true,
      dropoffAddressDetail: true,
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
  const [pickupCoord, dropoffCoord] = await Promise.all([
    resolveTrackingCoord(request.pickupAddress, request.pickupAddressDetail),
    resolveTrackingCoord(request.dropoffAddress, request.dropoffAddressDetail),
  ]);
  const context: TrackingRequestContext = {
    requestId: request.id,
    orderNumber: request.orderNumber ?? null,
    call24OrdNo: request.call24OrdNo ?? null,
    insungSerialNumber: request.insungSerialNumber ?? null,
    vehicleGroup: request.vehicleGroup ?? null,
    status: request.status,
    pickupName: request.pickupPlaceName ?? null,
    pickupAddress: request.pickupAddress ?? null,
    pickupAddressDetail: request.pickupAddressDetail ?? null,
    pickupCoord,
    dropoffName: request.dropoffPlaceName ?? null,
    dropoffAddress: request.dropoffAddress ?? null,
    dropoffAddressDetail: request.dropoffAddressDetail ?? null,
    dropoffCoord,
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

  const providerName = resolveProviderName(context, options);
  console.log(`[tracking] selected tracking provider: ${providerName}`);
  const provider = getProvider(providerName);
  const data = await provider.getTracking(context, options);
  return { ok: true, data: sanitizeTrackingForRole(req.user?.role, data) };
}
