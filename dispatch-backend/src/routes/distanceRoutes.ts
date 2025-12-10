// src/routes/distanceRoutes.ts
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const USE_NAVER = process.env.USE_NAVER_DISTANCE === "true";

// 네이버 인증 정보
const NAVER_CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

console.log("[distanceRoutes] USE_NAVER:", USE_NAVER);
console.log("[distanceRoutes] NAVER_CLIENT_ID:", NAVER_CLIENT_ID);
console.log(
  "[distanceRoutes] NAVER_CLIENT_SECRET length:",
  NAVER_CLIENT_SECRET?.length
);

if (USE_NAVER && (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET)) {
  console.warn(
    "[distanceRoutes] USE_NAVER_DISTANCE=true 인데 NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET 중 하나가 없습니다."
  );
}

// 주소 한 개를 좌표(경도,위도)로 변환
async function geocode(address: string) {
  if (!USE_NAVER) {
    throw new Error("USE_NAVER_DISTANCE=false 상태입니다.");
  }

  const url =
    "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=" +
    encodeURIComponent(address);

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID as string,
      "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET as string,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `지오코딩 실패 (status ${res.status}) - ${text}`
    );
  }

  const json = JSON.parse(text);

  if (!json.addresses || json.addresses.length === 0) {
    throw new Error("해당 주소로 검색된 좌표가 없습니다.");
  }

  const first = json.addresses[0];

  const x = Number(first.x); // 경도
  const y = Number(first.y); // 위도

  return { x, y };
}

// 좌표 두 개로 도로 기준 거리(m) 계산
async function getDrivingDistanceMeters(start: { x: number; y: number }, goal: { x: number; y: number }) {
  if (!USE_NAVER) {
    throw new Error("USE_NAVER_DISTANCE=false 상태입니다.");
  }

  const query = new URLSearchParams({
    start: `${start.x},${start.y}`,
    goal: `${goal.x},${goal.y}`,
    option: "trafast", // 빠른 길 기준
  }).toString();

  const url = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?${query}`;

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID as string,
      "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET as string,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `길찾기 API 실패 (status ${res.status}) - ${text}`
    );
  }

  const json = JSON.parse(text);

  if (!json.route || !json.route.trafast || json.route.trafast.length === 0) {
    throw new Error("경로를 찾지 못했습니다.");
  }

  const pathInfo = json.route.trafast[0].summary;

  return pathInfo.distance as number; // meter
}

// POST /distance
router.post("/", async (req, res) => {
  try {
    const { startAddress, goalAddress } = req.body || {};

    if (typeof startAddress !== "string" || typeof goalAddress !== "string") {
      return res.status(400).json({
        message: "startAddress, goalAddress는 문자열이어야 합니다.",
      });
    }

    if (!USE_NAVER) {
      return res.status(400).json({
        message: "현재 USE_NAVER_DISTANCE=false 상태라 네이버 길찾기를 사용하지 않습니다.",
      });
    }

    const start = await geocode(startAddress);
    const goal = await geocode(goalAddress);

    const distanceMeters = await getDrivingDistanceMeters(start, goal);
    const distanceKm = distanceMeters / 1000;

    res.json({
      startAddress,
      goalAddress,
      distanceKm,
      distanceMeters,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "거리 계산 중 오류가 발생했습니다.",
      detail: err.message || String(err),
    });
  }
});

export default router;