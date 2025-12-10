// src/services/distance.ts
import axios from "axios";
import { geocodeAddress, Coord } from "./geocoding";

/**
 * 네이버 지도 Driving Directions API를 사용해서
 * 두 좌표 사이 도로 기준 거리(km) 계산
 */
async function getDrivingDistanceKmByCoord(
  from: Coord,
  to: Coord
): Promise<number> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET가 설정되어 있지 않습니다."
    );
  }

  const url =
    "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving";

  // 네이버는 "경도,위도" 형식
  const start = `${from.lng},${from.lat}`;
  const goal = `${to.lng},${to.lat}`;

  const res = await axios.get(url, {
    params: {
      start,
      goal,
      option: "trafast", // 교통 반영 빠른 길(원하면 traoptimal 등으로 변경 가능)
    },
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  const route = res.data.route;

  // 보통 trafast 또는 traoptimal 안에 summary.distance 가 들어감
  const candidate =
    route?.trafast?.[0] ??
    route?.traoptimal?.[0] ??
    route?.tracomfort?.[0];

  const distanceMeters = candidate?.summary?.distance;

  if (typeof distanceMeters !== "number") {
    throw new Error("네이버 응답에서 distance 값을 찾지 못했습니다.");
  }

  const distanceKm = distanceMeters / 1000;
  return distanceKm;
}

/**
 * 주소 문자열(from, to)을 받아서
 * 1) 카카오로 각각 지오코딩
 * 2) 네이버로 도로 기준 거리 계산
 */
export async function getDrivingDistanceKmByAddress(
  fromAddress: string,
  toAddress: string
): Promise<{
  distanceKm: number;
  fromCoord: Coord;
  toCoord: Coord;
}> {
  // 1) 주소 → 좌표
  const [fromCoord, toCoord] = await Promise.all([
    geocodeAddress(fromAddress),
    geocodeAddress(toAddress),
  ]);

  // 2) 좌표 → 도로거리
  const distanceKm = await getDrivingDistanceKmByCoord(
    fromCoord,
    toCoord
  );

  // 보기 좋게 소수 1자리
  const rounded = Math.round(distanceKm * 10) / 10;

  return {
    distanceKm: rounded,
    fromCoord,
    toCoord,
  };
}