// src/services/geocoding.ts
import axios from "axios";
import { env } from "../config/env";

export type Coord = {
  lat: number;
  lng: number;
};

/**
 * 주소 문자열을 좌표로 변환한다.
 * 기본은 기존과 동일하게 네이버 지오코딩을 우선 사용하고,
 * 필요할 때만 카카오 로컬 API를 fallback으로 사용한다.
 */
async function geocodeWithNaver(address: string): Promise<Coord> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET가 설정되어 있지 않습니다.");
  }

  const url = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";

  const res = await axios.get(url, {
    params: { query: address },
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
    timeout: env.DISTANCE_API_TIMEOUT_MS,
  });

  const doc = res.data.addresses?.[0];

  if (!doc) {
    throw new Error(`주소 검색 결과가 없습니다. (address: ${address})`);
  }

  const lng = Number(doc.x);
  const lat = Number(doc.y);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("좌표 변환에 실패했습니다.");
  }

  return { lat, lng };
}

async function geocodeWithKakao(address: string): Promise<Coord> {
  const REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  if (!REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY가 설정되어 있지 않습니다.");
  }

  const url = "https://dapi.kakao.com/v2/local/search/address.json";

  const res = await axios.get(url, {
    params: { query: address },
    headers: {
      Authorization: `KakaoAK ${REST_API_KEY}`,
    },
    timeout: env.DISTANCE_API_TIMEOUT_MS,
  });

  const doc = res.data.documents?.[0];

  if (!doc) {
    throw new Error(`주소 검색 결과가 없습니다. (address: ${address})`);
  }

  // 카카오는 x = 경도(lng), y = 위도(lat)
  const lng = Number(doc.x);
  const lat = Number(doc.y);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("좌표 변환에 실패했습니다.");
  }

  return { lat, lng };
}

// 카카오 주소 검색으로 행정구역 분해
// 응답: region_1depth_name(시도), region_2depth_name(구군), region_3depth_name(읍면동)
export interface KakaoAddressRegion {
  wide: string;  // 시/도
  sgg: string;   // 시/군/구
  dong: string;  // 읍/면/동
}

export interface FreightAddressRegion extends KakaoAddressRegion {
  roadDetail: string;
  jibunDetail: string;
  roadAddress: string;
  jibunAddress: string;
}

export async function getFreightAddressRegion(address: string): Promise<FreightAddressRegion | null> {
  const REST_API_KEY = process.env.KAKAO_REST_API_KEY?.trim();

  if (!REST_API_KEY) {
    console.warn("[Kakao] KAKAO_REST_API_KEY 없음");
    return null;
  }

  try {
    const res = await axios.get("https://dapi.kakao.com/v2/local/search/address.json", {
      params: { query: address },
      headers: {
        Authorization: `KakaoAK ${REST_API_KEY}`,
      },
      timeout: 5000,
    });

    const doc = res.data.documents?.[0];
    if (!doc) {
      console.warn(`[Kakao] 주소 검색 결과 없음: "${address}"`);
      return null;
    }

    const addressInfo = doc.address ?? {};
    const roadInfo = doc.road_address ?? {};
    const buildRoadDetail = [roadInfo.road_name, [roadInfo.main_building_no, roadInfo.sub_building_no].filter(Boolean).join("-")]
      .filter(Boolean)
      .join(" ")
      .trim();
    const buildJibunDetail = [addressInfo.main_address_no, addressInfo.sub_address_no]
      .filter(Boolean)
      .join("-")
      .trim();

    const result: FreightAddressRegion = {
      wide: addressInfo.region_1depth_name || roadInfo.region_1depth_name || "",
      sgg: addressInfo.region_2depth_name || roadInfo.region_2depth_name || "",
      dong: addressInfo.region_3depth_name || roadInfo.region_3depth_name || "",
      roadDetail: buildRoadDetail,
      jibunDetail: buildJibunDetail,
      roadAddress: roadInfo.address_name || "",
      jibunAddress: addressInfo.address_name || "",
    };

    console.log(`[Kakao] 화물 주소 정규화 성공: "${address}" →`, result);
    return result;
  } catch (err: any) {
    console.error(`[Kakao] 화물 주소 API 오류: "${address}"`, err?.response?.data ?? err?.message);
    return null;
  }
}

// 네이버 지오코딩 addressElements에서 행정구역 추출
// SIDO → wide, SIGUGUN → sgg, DONGMYUN → dong
export async function getAddressRegion(address: string): Promise<KakaoAddressRegion | null> {
  const clientId = process.env.NAVER_MAP_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    console.warn("[Naver] NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET 없음");
    return null;
  }

  try {
    const res = await axios.get("https://maps.apigw.ntruss.com/map-geocode/v2/geocode", {
      params: { query: address },
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
      timeout: 5000,
    });

    const doc = res.data.addresses?.[0];
    if (!doc) {
      console.warn(`[Naver] 주소 검색 결과 없음: "${address}"`);
      return null;
    }

    const elements: Array<{ types: string[]; longName: string }> = doc.addressElements ?? [];
    const get = (type: string) =>
      elements.find((e) => e.types.includes(type))?.longName ?? "";

    const result = {
      wide: get("SIDO"),
      sgg: get("SIGUGUN"),
      dong: get("DONGMYUN"),
    };
    console.log(`[Naver] 주소 분해 성공: "${address}" →`, result);
    return result;
  } catch (err: any) {
    console.error(`[Naver] 주소 API 오류: "${address}"`, err?.response?.data ?? err?.message);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coord> {
  try {
    return await geocodeWithNaver(address);
  } catch (naverError) {
    const hasKakaoKey = Boolean(process.env.KAKAO_REST_API_KEY?.trim());
    if (!hasKakaoKey) {
      throw naverError;
    }

    try {
      return await geocodeWithKakao(address);
    } catch {
      throw naverError;
    }
  }
}
