import { config } from "dotenv";
config(); // .env 파일 읽기 (PORT 같은 환경변수용)

import { app } from "./app";

// PORT 환경변수가 있으면 그걸 쓰고, 없으면 4000 사용
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});