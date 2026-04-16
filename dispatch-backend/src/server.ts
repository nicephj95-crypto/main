import "./config/loadEnv";
import { app } from "./app";

// PORT 환경변수가 있으면 그걸 쓰고, 없으면 로컬 개발 기본 포트 4002 사용
const PORT = Number(process.env.PORT) || 4002;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
