import type { TrackingProvider } from "../trackingTypes";
import { mapHwamul24RawToTrackingDto } from "../trackingMappers";
import {
  getCall24Location,
  normalizeCall24LocationResponse,
  Call24ApiError,
  Call24LocationUnavailableError,
} from "../../call24IntegrationService";
import { IntegrationNotConfiguredError } from "../../insungIntegrationService";

export const hwamul24TrackingProvider: TrackingProvider = {
  name: "hwamul24",

  async getTracking(context) {
    const ordNo = context.call24OrdNo;

    // ordNo가 없으면 호출 불가 — driver 스냅샷만 전달
    if (!ordNo) {
      return mapHwamul24RawToTrackingDto(context, {
        ordNo: null,
        ordStatus: context.status,
        cjName: context.driver?.name ?? null,
        cjPhone: context.driver?.phone ?? null,
        cjCarNum: context.driver?.carNumber ?? null,
        cjCargoTon: context.driver?.carTon ?? null,
        cjTruckType: context.driver?.carType ?? null,
        lat: null,
        lng: null,
        addr: null,
        updatedAt: null,
      });
    }

    try {
      const res = await getCall24Location(ordNo);
      const normalized = normalizeCall24LocationResponse(res);

      return mapHwamul24RawToTrackingDto(context, {
        ordNo,
        ordStatus: context.status,
        cjName: context.driver?.name ?? null,
        cjPhone: context.driver?.phone ?? null,
        cjCarNum: context.driver?.carNumber ?? null,
        cjCargoTon: context.driver?.carTon ?? null,
        cjTruckType: context.driver?.carType ?? null,
        lat: normalized.lat,
        lng: normalized.lon,
        addr: normalized.addr,
        updatedAt: normalized.updatedAt,
      });
    } catch (err: unknown) {
      // 외부 에러는 조용히 lat/lng null 처리하고 message로 노출
      const message =
        err instanceof Call24LocationUnavailableError
          ? "화물24 위치정보가 아직 없습니다."
          : err instanceof Call24ApiError
          ? `화물24 위치 조회 실패: ${err.message}`
          : err instanceof IntegrationNotConfiguredError
          ? err.message
          : err instanceof Error
          ? err.message
          : "화물24 위치 조회 실패";

      const dto = mapHwamul24RawToTrackingDto(context, {
        ordNo,
        ordStatus: context.status,
        cjName: context.driver?.name ?? null,
        cjPhone: context.driver?.phone ?? null,
        cjCarNum: context.driver?.carNumber ?? null,
        cjCargoTon: context.driver?.carTon ?? null,
        cjTruckType: context.driver?.carType ?? null,
        lat: null,
        lng: null,
        addr: null,
        updatedAt: null,
      });
      return { ...dto, message };
    }
  },
};
