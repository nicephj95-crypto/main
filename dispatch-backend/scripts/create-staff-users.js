const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { config } = require("dotenv");

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const ALLOWED_ROLES = new Set(["ADMIN", "DISPATCHER", "SALES"]);

function printUsage() {
  console.log(`Usage:
node scripts/create-staff-users.js '[{"name":"관리자","email":"admin@example.com","role":"ADMIN"}]' [password]

Notes:
- password 기본값은 1234
- role은 ADMIN | DISPATCHER | SALES 만 허용
- 이미 같은 email이 있으면 이름/권한/재직상태만 업데이트합니다.`);
}

async function main() {
  const rawUsers = process.argv[2];
  const rawPassword = process.argv[3] || "1234";

  if (!rawUsers) {
    printUsage();
    process.exit(1);
  }

  let users;
  try {
    users = JSON.parse(rawUsers);
  } catch (error) {
    console.error("users JSON 파싱 실패:", error.message);
    process.exit(1);
  }

  if (!Array.isArray(users) || users.length === 0) {
    console.error("최소 1명 이상의 사용자 정보가 필요합니다.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(String(rawPassword), 10);

  for (const item of users) {
    const name = String(item?.name || "").trim();
    const email = String(item?.email || "").trim().toLowerCase();
    const role = String(item?.role || "").trim().toUpperCase();
    const phone = item?.phone ? String(item.phone).trim() : null;
    const department = item?.department ? String(item.department).trim() : null;

    if (!name || !email || !ALLOWED_ROLES.has(role)) {
      console.error("잘못된 사용자 정보:", item);
      continue;
    }

    const saved = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role,
        phone,
        department,
        isActive: true,
      },
      create: {
        name,
        email,
        passwordHash,
        role,
        phone,
        department,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`[OK] ${saved.role} ${saved.name} <${saved.email}>`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
