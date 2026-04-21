import type { TrackingProvider } from "../trackingTypes";
import { mapInsungRawToTrackingDto } from "../trackingMappers";

export const insungTrackingProvider: TrackingProvider = {
  name: "insung",

  async getTracking(context) {
    // 추후 구현 지점:
    // 1. 인성 인증/조회 파라미터 확정 후 이 provider 내부에서만 HTTP 호출
    // 2. raw 응답 필드명을 mapInsungRawToTrackingDto에서 공통 DTO로 변환
    // 3. controller/frontend는 인성 raw 구조를 계속 모르게 유지
    return mapInsungRawToTrackingDto(context, {
      status: context.status,
    });
  },
};
