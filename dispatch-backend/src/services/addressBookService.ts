// src/services/addressBookService.ts
import XLSX from "xlsx";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { getStorageServiceForProvider, storageService } from "./storage";
import {
  normalizeMultipartFilename,
  normCell,
  normalizeExcelHHMM,
  buildAddressBookDuplicateKey,
  isValidHHMM,
} from "../utils/addressBookUtils";

function normalizeCompanyName(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isStaffAddressBookRole(role?: string | null) {
  return role === "ADMIN" || role === "DISPATCHER" || role === "SALES";
}

async function getAddressBookActor(req: AuthRequest) {
  if (!req.user) {
    return { ok: false as const, status: 401, message: "인증 정보가 없습니다." };
  }

  const me = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, role: true, companyName: true },
  });
  if (!me) {
    return { ok: false as const, status: 401, message: "사용자를 찾을 수 없습니다." };
  }

  return { ok: true as const, me };
}

// ─────────────────────────────────────────────────────────────
// 기존 (유지)
// ─────────────────────────────────────────────────────────────

export async function canAccessAddressBookItem(req: AuthRequest, addressBookId: number) {
  const actor = await getAddressBookActor(req);
  if (!actor.ok) return actor;
  const { me } = actor;

  const item = await prisma.addressBook.findUnique({
    where: { id: addressBookId },
    include: {
      user: {
        select: { id: true, companyName: true },
      },
    },
  });
  if (!item) return { ok: false as const, status: 404, message: "해당 주소록을 찾을 수 없습니다." };

  if (isStaffAddressBookRole(me.role)) return { ok: true as const, item, me };

  const myCompany = normalizeCompanyName(me.companyName);
  if (!myCompany) {
    return { ok: false as const, status: 403, message: "소속 회사 정보가 없어 주소록에 접근할 수 없습니다." };
  }

  const itemCompany = normalizeCompanyName(item.businessName);
  if (itemCompany && itemCompany === myCompany) {
    return { ok: true as const, item, me };
  }

  return { ok: false as const, status: 403, message: "이 주소록에 접근할 권한이 없습니다." };
}

export async function canViewAddressBookItem(req: AuthRequest, addressBookId: number) {
  return canAccessAddressBookItem(req, addressBookId);
}

export function canManageAddressBookImages(req: AuthRequest) {
  return !!req.user;
}

// ─────────────────────────────────────────────────────────────
// 신규 서비스 함수
// ─────────────────────────────────────────────────────────────

// GET /address-book/template
export function buildTemplatePayload(): { buffer: Buffer; fileName: string } {
  const rows = [
    {
      상호명: "예시상사",
      장소명: "본사 물류창고",
      담당자명: "홍길동",
      연락처: "010-1234-5678",
      주소: "서울특별시 강남구 테헤란로 123",
      상세주소: "3층",
      점심시작: "12:00",
      점심종료: "13:00",
      메모: "하차 전 연락 필수",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 }, // 상호명
    { wch: 18 }, // 장소명
    { wch: 12 }, // 담당자명
    { wch: 16 }, // 연락처
    { wch: 34 }, // 주소
    { wch: 22 }, // 상세주소
    { wch: 10 }, // 점심시작
    { wch: 10 }, // 점심종료
    { wch: 28 }, // 메모
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "주소록템플릿");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return { buffer, fileName: "주소록_업로드템플릿.xlsx" };
}

// POST /address-book/import (inner logic after multer)
export async function importAddressBookData(req: AuthRequest, file: Express.Multer.File) {
  const actor = await getAddressBookActor(req);
  if (!actor.ok) return actor;
  const { me } = actor;
  const isStaff = isStaffAddressBookRole(me.role);
  const forcedBusinessName = !isStaff ? normalizeCompanyName(me.companyName) : null;
  if (!isStaff && !forcedBusinessName) {
    return { ok: false as const, status: 403, message: "소속 회사 정보가 없어 주소록을 업로드할 수 없습니다." };
  }

  const originalName = normalizeMultipartFilename(file.originalname || "");
  const lowerName = originalName.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    return { ok: false as const, status: 400, message: "xlsx/xls 파일만 업로드할 수 있습니다." };
  }

  // 매직바이트 검증 (확장자 스푸핑 방어)
  // xlsx = ZIP (PK\x03\x04), xls = OLE2 (D0 CF 11 E0)
  const magic = file.buffer.slice(0, 4);
  const isXlsx = magic[0] === 0x50 && magic[1] === 0x4b && magic[2] === 0x03 && magic[3] === 0x04;
  const isXls  = magic[0] === 0xd0 && magic[1] === 0xcf && magic[2] === 0x11 && magic[3] === 0xe0;
  if (!isXlsx && !isXls) {
    return { ok: false as const, status: 400, message: "올바른 xlsx/xls 파일이 아닙니다." };
  }

  const wb = XLSX.read(file.buffer, { type: "buffer" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { ok: false as const, status: 400, message: "시트가 비어 있습니다." };
  }
  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  if (!rows.length) {
    return { ok: false as const, status: 400, message: "업로드할 데이터 행이 없습니다." };
  }

  const effectiveBusinessNames = new Set<string>();
  for (const row of rows) {
    const rawBusinessName = normCell(row["상호명"]);
    const effectiveBusinessName = forcedBusinessName ?? rawBusinessName;
    if (effectiveBusinessName) {
      effectiveBusinessNames.add(effectiveBusinessName);
    }
  }

  const existingRows =
    effectiveBusinessNames.size > 0
      ? await prisma.addressBook.findMany({
          where: { businessName: { in: Array.from(effectiveBusinessNames) } },
          select: { businessName: true, placeName: true, address: true },
        })
      : [];

  const existingKeys = new Set(
    existingRows.map((item) =>
      buildAddressBookDuplicateKey(item.businessName ?? "", item.placeName, item.address)
    )
  );

  const createData: Array<{
    userId: number;
    businessName: string | null;
    placeName: string;
    address: string;
    addressDetail: string | null;
    contactName: string | null;
    contactPhone: string | null;
    lunchTime: string | null;
    memo: string | null;
    type: "BOTH";
  }> = [];

  const failures: Array<{ row: number; reason: string }> = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  let overriddenCompanyCount = 0;

  rows.forEach((row, index) => {
    const excelRow = index + 2;

    const rawBusinessName = normCell(row["상호명"]);
    const businessName = forcedBusinessName ?? rawBusinessName;
    const placeName = normCell(row["장소명"]);
    const contactName = normCell(row["담당자명"]);
    const contactPhone = normCell(row["연락처"]);
    const address = normCell(row["주소"]);
    const addressDetail = normCell(row["상세주소"]);
    const lunchStart = normalizeExcelHHMM(row["점심시작"]);
    const lunchEnd = normalizeExcelHHMM(row["점심종료"]);
    const memo = normCell(row["메모"]);

    const rowValues = [
      rawBusinessName, placeName, contactName, contactPhone,
      address, addressDetail, lunchStart, lunchEnd, memo,
    ];

    if (rowValues.every((v) => v === "")) {
      skipped.push({ row: excelRow, reason: "빈 행" });
      return;
    }

    if (forcedBusinessName && rawBusinessName && rawBusinessName !== forcedBusinessName) {
      overriddenCompanyCount += 1;
    }

    if (!businessName || !placeName || !address) {
      failures.push({ row: excelRow, reason: "상호명, 장소명, 주소는 필수입니다." });
      return;
    }

    if (!isValidHHMM(lunchStart) || !isValidHHMM(lunchEnd)) {
      failures.push({ row: excelRow, reason: "점심시작/점심종료는 HH:MM 형식이어야 합니다." });
      return;
    }

    const lunchTime =
      lunchStart && lunchEnd
        ? `${lunchStart}~${lunchEnd}`
        : lunchStart || lunchEnd || null;

    const dupKey = buildAddressBookDuplicateKey(businessName, placeName, address);
    if (existingKeys.has(dupKey)) {
      skipped.push({ row: excelRow, reason: "중복 데이터(상호명+장소명+주소)" });
      return;
    }

    existingKeys.add(dupKey);
    createData.push({
      userId: me.id,
      businessName,
      placeName,
      address,
      addressDetail: addressDetail || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      lunchTime,
      memo: memo || null,
      type: "BOTH",
    });
  });

  let createdCount = 0;
  if (createData.length > 0) {
    const result = await prisma.addressBook.createMany({ data: createData });
    createdCount = result.count;
  }

  return {
    ok: true as const,
    data: {
      message: forcedBusinessName
        ? "주소록 엑셀 업로드가 완료되었습니다. 회사명은 로그인한 화주 회사 기준으로 적용되었습니다."
        : "주소록 엑셀 업로드 처리가 완료되었습니다.",
      totalRows: rows.length,
      createdCount,
      skippedCount: skipped.length,
      failureCount: failures.length,
      skipped,
      failures,
      appliedCompanyName: forcedBusinessName,
      companyNameOverridden: overriddenCompanyCount,
    },
  };
}

// GET /address-book
export async function fetchAddressBookList(req: AuthRequest) {
  const actor = await getAddressBookActor(req);
  if (!actor.ok) return actor;
  const { me } = actor;
  const isStaff = isStaffAddressBookRole(me.role);
  const myCompany = normalizeCompanyName(me.companyName);

  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const companyFilter =
    typeof req.query.companyName === "string" && req.query.companyName.trim() !== ""
      ? req.query.companyName.trim()
      : undefined;
  const pageRaw = Number(req.query.page);
  const sizeRaw = Number(req.query.size);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const size = Number.isInteger(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 100) : 10;
  const skip = (page - 1) * size;

  const where: any = {};
  const andConditions: any[] = [];

  if (q) {
    const textContains = (field: string) => ({
      [field]: { contains: q, mode: "insensitive" },
    });
    const digitsOnly = q.replace(/\D/g, "");
    const searchOr: any[] = [
      textContains("placeName"),
      textContains("address"),
      textContains("addressDetail"),
      textContains("contactName"),
      textContains("contactPhone"),
      textContains("memo"),
    ];
    if (digitsOnly && digitsOnly !== q) {
      searchOr.push({ contactPhone: { contains: digitsOnly } });
    }

    andConditions.push({ OR: searchOr });
  }

  if (!isStaff) {
    if (!myCompany) {
      return { ok: false as const, status: 403, message: "소속 회사 정보가 없어 주소록을 조회할 수 없습니다." };
    }
    if (companyFilter && normalizeCompanyName(companyFilter) !== myCompany) {
      return { ok: false as const, status: 403, message: "본인 회사 주소록만 조회할 수 있습니다." };
    }
    andConditions.push({
      businessName: {
        equals: myCompany,
        mode: "insensitive",
      },
    });
  } else if (companyFilter) {
    andConditions.push({
      OR: [
        {
          businessName: {
            contains: companyFilter,
            mode: "insensitive",
          },
        },
        {
          user: {
            companyName: {
              contains: companyFilter,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [list, total] = await Promise.all([
    prisma.addressBook.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: size,
      include: {
        user: { select: { companyName: true } },
        _count: { select: { images: true } },
      },
    }),
    prisma.addressBook.count({ where }),
  ]);

  return {
    ok: true as const,
    data: {
      items: list.map((item) => ({
        id: item.id,
        userId: item.userId,
        companyName: item.businessName ?? item.user?.companyName ?? null,
        businessName: item.businessName,
        placeName: item.placeName,
        type: item.type,
        address: item.address,
        addressDetail: item.addressDetail,
        contactName: item.contactName,
        contactPhone: item.contactPhone,
        lunchTime: item.lunchTime,
        memo: item.memo,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        hasImages: item._count.images > 0,
        imageCount: item._count.images,
      })),
      total,
      page,
      size,
    },
  };
}

// GET /address-book/:id/images
export async function fetchAddressBookImagesList(req: AuthRequest, id: number) {
  const access = await canViewAddressBookItem(req, id);
  if (!access.ok) return access;

  const images = await prisma.addressBookImage.findMany({
    where: { addressBookId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    ok: true as const,
    data: images.map((img) => ({
      ...img,
      url: `/address-book/${id}/images/${img.id}/file`,
    })),
  };
}

// POST /address-book/:id/images (inner logic after multer)
export async function saveAddressBookImages(
  addressBookId: number,
  files: Express.Multer.File[],
  currentCount: number
) {
  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const originalName = normalizeMultipartFilename(file.originalname);
      const stored = await storageService.saveObject({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName,
        keyPrefix: `${process.env.S3_ADDRESSBOOK_IMAGE_PREFIX?.trim() || "addressbook-images"}/${addressBookId}`,
      });

      const row = await tx.addressBookImage.create({
        data: {
          addressBookId,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: stored.publicUrl ?? null,
          originalName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          kind: "original",
          sortOrder: currentCount + i,
        },
      });
      rows.push(row);
    }
    return rows;
  });

  return created.map((img) => ({
    ...img,
    url: `/address-book/${addressBookId}/images/${img.id}/file`,
  }));
}

// DELETE /address-book/:id/images/:imageId
export async function deleteAddressBookImageRecord(req: AuthRequest, id: number, imageId: number) {
  const access = await canAccessAddressBookItem(req, id);
  if (!access.ok) return access;
  if (!canManageAddressBookImages(req)) {
    return { ok: false as const, status: 403, message: "이 주소록 이미지를 삭제할 권한이 없습니다." };
  }

  const img = await prisma.addressBookImage.findFirst({ where: { id: imageId, addressBookId: id } });
  if (!img) return { ok: false as const, status: 404, message: "삭제할 이미지를 찾을 수 없습니다." };

  await prisma.addressBookImage.delete({ where: { id: imageId } });
  await getStorageServiceForProvider(img.storageProvider).deleteObject(img.storageKey);

  return { ok: true as const };
}

// POST /address-book
export async function createAddressBookRecord(
  req: AuthRequest,
  body: {
    businessName?: string;
    placeName?: string;
    address?: string;
    addressDetail?: string;
    contactName?: string;
    contactPhone?: string;
    lunchTime?: string;
    memo?: string;
    type?: "PICKUP" | "DROPOFF" | "BOTH";
  }
) {
  const actor = await getAddressBookActor(req);
  if (!actor.ok) return actor;
  const { me } = actor;
  const isStaff = isStaffAddressBookRole(me.role);
  const forcedBusinessName = !isStaff ? normalizeCompanyName(me.companyName) : null;
  if (!isStaff && !forcedBusinessName) {
    return { ok: false as const, status: 403, message: "소속 회사 정보가 없어 주소록을 생성할 수 없습니다." };
  }

  const { businessName, placeName, address, addressDetail, contactName, contactPhone, lunchTime, memo } = body;
  const normalizedBusinessName = forcedBusinessName ?? normalizeCompanyName(businessName);

  if (!placeName || !address) {
    return { ok: false as const, status: 400, message: "placeName, address는 필수입니다." };
  }

  // 서버측 중복 방어: (상호명+장소명+주소) 정규화 키 기준으로 기존 항목을 재사용한다.
  // - 정규화: trim + 연속 공백 단일화 + lowercase (buildAddressBookDuplicateKey 와 동일)
  // - 주소록은 출발/도착 구분 없이 재사용한다.
  const targetDupKey = buildAddressBookDuplicateKey(
    normalizedBusinessName ?? "",
    placeName,
    address
  );

  const existingCandidates = await prisma.addressBook.findMany({
    where: normalizedBusinessName
      ? { businessName: normalizedBusinessName }
      : { businessName: null },
    select: {
      id: true,
      businessName: true,
      placeName: true,
      address: true,
      type: true,
    },
  });

  const existing = existingCandidates.find(
    (item) =>
      buildAddressBookDuplicateKey(
        item.businessName ?? "",
        item.placeName,
        item.address
      ) === targetDupKey
  );

  if (existing) {
    if (existing.type !== "BOTH") {
      const normalized = await prisma.addressBook.update({
        where: { id: existing.id },
        data: { type: "BOTH" },
      });
      return { ok: true as const, data: normalized, reused: true as const };
    }

    const reused = await prisma.addressBook.findUniqueOrThrow({
      where: { id: existing.id },
    });
    return { ok: true as const, data: reused, reused: true as const };
  }

  const created = await prisma.addressBook.create({
    data: {
      userId: me.id,
      businessName: normalizedBusinessName,
      placeName,
      address,
      addressDetail: addressDetail || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      lunchTime: lunchTime || null,
      memo: memo || null,
      type: "BOTH",
    },
  });

  return { ok: true as const, data: created };
}

// PUT /address-book/:id
export async function updateAddressBookRecord(
  req: AuthRequest,
  id: number,
  body: {
    businessName?: string;
    placeName?: string;
    address?: string;
    addressDetail?: string;
    contactName?: string;
    contactPhone?: string;
    lunchTime?: string;
    memo?: string;
    type?: "PICKUP" | "DROPOFF" | "BOTH";
  }
) {
  const access = await canAccessAddressBookItem(req, id);
  if (!access.ok) return access;
  const { item: existing, me } = access;
  const isStaff = isStaffAddressBookRole(me.role);
  const forcedBusinessName = !isStaff ? normalizeCompanyName(me.companyName) : null;
  if (!isStaff && !forcedBusinessName) {
    return { ok: false as const, status: 403, message: "소속 회사 정보가 없어 주소록을 수정할 수 없습니다." };
  }

  const { businessName, placeName, address, addressDetail, contactName, contactPhone, lunchTime, memo } = body;
  const normalizedBusinessName =
    forcedBusinessName ??
    (businessName !== undefined ? normalizeCompanyName(businessName) : existing.businessName);

  const updated = await prisma.addressBook.update({
    where: { id },
    data: {
      businessName: normalizedBusinessName,
      placeName: placeName ?? existing.placeName,
      address: address ?? existing.address,
      addressDetail: addressDetail !== undefined ? addressDetail : existing.addressDetail,
      contactName: contactName !== undefined ? contactName : existing.contactName,
      contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
      lunchTime: lunchTime !== undefined ? lunchTime : existing.lunchTime,
      memo: memo !== undefined ? memo : existing.memo,
      type: "BOTH",
    },
  });

  return { ok: true as const, data: updated };
}

// DELETE /address-book/:id
export async function deleteAddressBookRecord(req: AuthRequest, id: number) {
  const access = await canAccessAddressBookItem(req, id);
  if (!access.ok) return access;

  const images = await prisma.addressBookImage.findMany({ where: { addressBookId: id } });
  for (const img of images) {
    try { await getStorageServiceForProvider(img.storageProvider).deleteObject(img.storageKey); } catch { /* 파일 없어도 계속 진행 */ }
  }
  if (images.length > 0) {
    await prisma.addressBookImage.deleteMany({ where: { addressBookId: id } });
  }

  await prisma.addressBook.delete({ where: { id } });
  return { ok: true as const };
}

// 회사명 목록 조회 (CompanyName 테이블)
export async function fetchCompanyNames() {
  return prisma.companyName.findMany({ orderBy: { name: "asc" } });
}

// 회사명 등록 (ADMIN/DISPATCHER)
export async function createCompanyNameRecord(name: string) {
  return prisma.companyName.create({ data: { name: name.trim() } });
}

// 회사명 수정 (ADMIN/DISPATCHER)
export async function updateCompanyNameRecord(id: number, name: string) {
  const before = await prisma.companyName.findUniqueOrThrow({ where: { id } });
  const after = await prisma.companyName.update({ where: { id }, data: { name: name.trim() } });
  return { before, after };
}

// 회사명 삭제 (ADMIN/DISPATCHER)
export async function deleteCompanyNameRecord(id: number) {
  return prisma.companyName.delete({ where: { id } });
}
