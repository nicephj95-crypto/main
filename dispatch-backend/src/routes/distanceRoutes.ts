// src/routes/distanceRoutes.ts
import express, { Request, Response } from "express";
import fetch from "node-fetch";

const router = express.Router();

// .env 에서 쓰는 값들
const USE_NAVER = process.env.USE_NAVER_DISTANCE === "true";
const NAVER_CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

// ✅ Naver Maps용 URL (공식 가이드 기준)
const GEOCODE_URL =
  "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";
const DIRECTIONS_URL =
  "https://maps.apigw.ntruss.com/map-direction/v1/driving";

// 좌표 타입
type Coord = {
  x: number; // 경도
  y: number; // 위도
};

// ─────────────────────────────────────────────
// 1) 주소 → 좌표(위도/경도) 변환 (Geocoding)
// ─────────────────────────────────────────────
async function geocode(address: string): Promise<Coord> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("NAVER 지도 API 키가 설정되어 있지 않습니다.");
  }

  const params = new URLSearchParams({ query: address });

  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET,
    },
  });

  const text = await res.text();
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`지오코딩 응답 파싱 실패: ${text}`);
  }

  if (!res.ok || json.status !== "OK" || !json.addresses?.length) {
    throw new Error(
      `지오코딩 실패 (status ${res.status}) - ${text}`
    );
  }

  const addr = json.addresses[0];
  return {
    x: Number(addr.x),
    y: Number(addr.y),
  };
}

// ─────────────────────────────────────────────
// 2) 좌표 → 경로 거리/시간 계산 (Directions)
// ─────────────────────────────────────────────
async function getRouteDistance(
  start: Coord,
  goal: Coord
): Promise<{ distanceKm: number; durationMinutes: number }> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("NAVER 지도 API 키가 설정되어 있지 않습니다.");
  }

  const params = new URLSearchParams({
    start: `${start.x},${start.y}`,
    goal: `${goal.x},${goal.y}`,
    option: "trafast",
  });

  const res = await fetch(
    `${DIRECTIONS_URL}?${params.toString()}`,
    {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET,
      },
    }
  );

  const text = await res.text();
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`경로 탐색 응답 파싱 실패: ${text}`);
  }

  if (!res.ok || !json.route?.trafast?.[0]) {
    throw new Error(
      `경로 탐색 실패 (status ${res.status}) - ${text}`
    );
  }

  const summary = json.route.trafast[0].summary;
  const distanceKm = summary.distance / 1000; // m → km
  const durationMinutes = summary.duration / 60000; // ms → 분

  return { distanceKm, durationMinutes };
}

// ─────────────────────────────────────────────
// 3) POST /distance  라우트
//    body: { startAddress: string, goalAddress: string }
// ─────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { startAddress, goalAddress } = req.body || {};

  if (!startAddress || !goalAddress) {
    return res
      .status(400)
      .json({ message: "startAddress, goalAddress 둘 다 필요합니다." });
  }

  try {
    // env 에서 USE_NAVER_DISTANCE=false 이면, 일단 더미 직선 거리로 처리
    if (!USE_NAVER) {
      // 아주 단순한 더미 값 (나중에 필요하면 수정)
      return res.json({
        distanceKm: 10,
        durationMinutes: 20,
        mode: "dummy",
      });
    }

    // 1) 두 주소를 각각 좌표로 변환
    const [startCoord, goalCoord] = await Promise.all([
      geocode(startAddress),
      geocode(goalAddress),
    ]);

    // 2) 좌표를 이용해서 실제 도로 경로 기준 거리 계산
    const { distanceKm, durationMinutes } = await getRouteDistance(
      startCoord,
      goalCoord
    );

    return res.json({
      distanceKm,
      durationMinutes,
      mode: "naver",
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      message: "거리 계산 중 오류가 발생했습니다.",
      detail: err.message || String(err),
    });
  }
});

export default router;