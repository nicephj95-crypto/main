import type { TrackingProvider } from "../trackingTypes";
import { mapHwamul24RawToTrackingDto } from "../trackingMappers";

export const hwamul24TrackingProvider: TrackingProvider = {
  name: "hwamul24",

  async getTracking(context) {
    // 추후 구현 지점:
    // 1. context.call24OrdNo(ordNo)로 /api/order/getOrder 호출
    // 2. 필요 시 /api/order/getOrderAll 보조 조회
    // 3. raw 응답을 mapHwamul24RawToTrackingDto로 공통 DTO 변환
    return mapHwamul24RawToTrackingDto(context, {
      ordNo: context.call24OrdNo,
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
  },
};
