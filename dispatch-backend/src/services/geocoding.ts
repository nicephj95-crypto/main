// src/services/geocoding.ts
import axios from "axios";

export type Coord = {
  lat: number;
  lng: number;
};

/**
 * 카카오 로컬 주소검색 API
 * 도로명 주소 → 위도(lat), 경도(lng)
 */
export async function geocodeAddress(address: string): Promise<Coord> {
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