import type { TrackingProvider } from "../trackingTypes";
import { mapInsungRawToTrackingDto } from "../trackingMappers";
import {
  getInsungOrderDetail,
  InsungApiError,
  InsungPermissionError,
  InsungNotRegisteredError,
  IntegrationNotConfiguredError,
  parseInsungCoordinate,
} from "../../insungIntegrationService";

export const insungTrackingProvider: TrackingProvider = {
  name: "insung",

  async getTracking(context) {
    const serial = context.insungSerialNumber;
    if (!serial) {
      const dto = mapInsungRawToTrackingDto(context, { status: context.status });
      return { ...dto, message: "인성 등록 정보가 없습니다." };
    }

    try {
      const detail = await getInsungOrderDetail(serial);
      const lat = parseInsungCoordinate(detail.rider_lat, "lat");
      const lng = parseInsungCoordinate(detail.rider_lon, "lon");
      const baseDto = mapInsungRawToTrackingDto(context, {
        status: detail.state ?? context.status,
      });
      return {
        ...baseDto,
        driverName: detail.rider_name ?? baseDto.driverName,
        driverPhone: detail.rider_tel_number ?? baseDto.driverPhone,
        currentLat: lat !== null && Number.isFinite(lat) ? lat : null,
        currentLng: lng !== null && Number.isFinite(lng) ? lng : null,
        currentAddress: null,
        locationUpdatedAt:
          detail.complete_time ??
          detail.pickup_time ??
          detail.allocation_time ??
          null,
        hasLocation: lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng),
        message: null,
      };
    } catch (err: unknown) {
      const message =
        err instanceof InsungNotRegisteredError
          ? "인성 등록 정보가 없습니다."
          : err instanceof InsungPermissionError
          ? "인성 계정 권한 또는 IP 화이트리스트가 반영되지 않았습니다."
          : err instanceof InsungApiError
          ? `인성 위치 조회 실패: ${err.message}`
          : err instanceof IntegrationNotConfiguredError
          ? err.message
          : err instanceof Error
          ? err.message
          : "인성 위치 조회 실패";
      const dto = mapInsungRawToTrackingDto(context, { status: context.status });
      return { ...dto, message };
    }
  },
};
