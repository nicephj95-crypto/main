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
