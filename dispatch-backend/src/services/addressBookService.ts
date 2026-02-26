// src/services/addressBookService.ts
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";

export async function canAccessAddressBookItem(req: AuthRequest, addressBookId: number) {
  if (!req.user) return { ok: false as const, status: 401, message: "인증 정보가 없습니다." };

  const me = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, role: true, companyName: true },
  });
  if (!me) return { ok: false as const, status: 401, message: "사용자를 찾을 수 없습니다." };

  const item = await prisma.addressBook.findUnique({
    where: { id: addressBookId },
    include: {
      user: {
        select: { id: true, companyName: true },
      },
    },
  });
  if (!item) return { ok: false as const, status: 404, message: "해당 주소록을 찾을 수 없습니다." };

  if (me.role === "ADMIN") return { ok: true as const, item, me };

  const myCompany = me.companyName?.trim();
  const itemCompany = item.user.companyName?.trim();
  const sameCompany = !!myCompany && !!itemCompany && myCompany === itemCompany;
  if (sameCompany || item.userId === me.id) return { ok: true as const, item, me };

  return { ok: false as const, status: 403, message: "이 주소록에 접근할 권한이 없습니다." };
}
