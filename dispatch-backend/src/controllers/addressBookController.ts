// src/controllers/addressBookController.ts
import { Response } from "express";
import XLSX from "xlsx";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { storageService } from "../services/storage";
import { canAccessAddressBookItem } from "../services/addressBookService";
import {
  normalizeMultipartFilename,
  normCell,
  normalizeExcelHHMM,
  buildAddressBookDuplicateKey,
  isValidHHMM,
  MAX_ADDRESS_IMAGES,
  addressImageUploader,
  addressBookExcelUploader,
} from "../utils/addressBookUtils";

// 🔹 주소록 엑셀 업로드 템플릿 다운로드
export async function downloadTemplate(_req: AuthRequest, res: Response) {
  try {
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
    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = "주소록_업로드템플릿.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="address-book-template.xlsx"; filename*=UTF-8''${encodeURIComponent(
        fileName
      )}`
    );
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 템플릿 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 엑셀 업로드 (1차: 검증 + 중복 skip)
export async function importAddressBook(req: AuthRequest, res: Response) {
  addressBookExcelUploader.single("file")(req as any, res as any, async (uploadErr: any) => {
    if (uploadErr) {
      return res
        .status(400)
        .json({ message: uploadErr?.message || "엑셀 업로드 중 오류가 발생했습니다." });
    }

    try {
      if (!req.user) {
        return res.status(401).json({ message: "인증 정보가 없습니다." });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ message: "업로드할 엑셀 파일이 없습니다." });
      }

      const originalName = normalizeMultipartFilename(file.originalname || "");
      const lowerName = originalName.toLowerCase();
      const isExcelExt = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
      if (!isExcelExt) {
        return res.status(400).json({ message: "xlsx/xls 파일만 업로드할 수 있습니다." });
      }

      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, companyName: true },
      });
      if (!me) {
        return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
      }

      const wb = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        return res.status(400).json({ message: "시트가 비어 있습니다." });
      }
      const ws = wb.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        return res.status(400).json({ message: "업로드할 데이터 행이 없습니다." });
      }

      const duplicateWhere: any =
        me.companyName && me.companyName.trim() !== ""
          ? { user: { companyName: me.companyName.trim() } }
          : { userId: me.id };

      const existingRows = await prisma.addressBook.findMany({
        where: duplicateWhere,
        select: {
          businessName: true,
          placeName: true,
          address: true,
        },
      });

      const existingKeys = new Set(
        existingRows.map((item) =>
          buildAddressBookDuplicateKey(
            item.businessName ?? "",
            item.placeName,
            item.address
          )
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

      rows.forEach((row, index) => {
        const excelRow = index + 2;

        const businessName = normCell(row["상호명"]);
        const placeName = normCell(row["장소명"]);
        const contactName = normCell(row["담당자명"]);
        const contactPhone = normCell(row["연락처"]);
        const address = normCell(row["주소"]);
        const addressDetail = normCell(row["상세주소"]);
        const lunchStart = normalizeExcelHHMM(row["점심시작"]);
        const lunchEnd = normalizeExcelHHMM(row["점심종료"]);
        const memo = normCell(row["메모"]);

        const rowValues = [
          businessName,
          placeName,
          contactName,
          contactPhone,
          address,
          addressDetail,
          lunchStart,
          lunchEnd,
          memo,
        ];

        if (rowValues.every((v) => v === "")) {
          skipped.push({ row: excelRow, reason: "빈 행" });
          return;
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
        const result = await prisma.addressBook.createMany({
          data: createData,
        });
        createdCount = result.count;
      }

      return res.json({
        message: "주소록 엑셀 업로드 처리가 완료되었습니다.",
        totalRows: rows.length,
        createdCount,
        skippedCount: skipped.length,
        failureCount: failures.length,
        skipped,
        failures,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "주소록 엑셀 업로드 중 오류가 발생했습니다." });
    }
  });
}

// 🔹 주소록 목록 조회: 회사(화주) 기준 + 검색 + ADMIN 필터
export async function listAddressBook(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!me) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const q =
      typeof req.query.q === "string" ? req.query.q.trim() : "";
    const companyFilter =
      typeof req.query.companyName === "string" &&
      req.query.companyName.trim() !== ""
        ? req.query.companyName.trim()
        : undefined;

    const where: any = {};

    // 🔍 검색어 조건
    if (q) {
      where.OR = [
        { placeName: { contains: q } },
        { businessName: { contains: q } },
        { address: { contains: q } },
        { addressDetail: { contains: q } },
        { contactName: { contains: q } },
        { contactPhone: { contains: q } },
        { lunchTime: { contains: q } },
        { memo: { contains: q } },
      ];
    }

    const isAdmin = me.role === "ADMIN";

    if (isAdmin) {
      // 🔹 ADMIN: 전체를 보되, companyName 쿼리 있으면 해당 회사만 필터
      if (companyFilter) {
        where.user = { companyName: companyFilter };
      }
    } else {
      // 🔹 일반 유저: 같은 회사 주소록 공유
      if (me.companyName && me.companyName.trim() !== "") {
        where.user = { companyName: me.companyName };
      } else {
        // 회사 정보 없으면, 일단 "본인이 만든 주소만"
        where.userId = me.id;
      }
    }

    const list = await prisma.addressBook.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { companyName: true },
        },
        _count: {
          select: { images: true },
        },
      },
    });

    return res.json(
      list.map((item) => ({
        id: item.id,
        userId: item.userId,
        companyName: item.user?.companyName ?? null,
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
      }))
    );
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 조회 중 오류가 발생했습니다." });
  }
}

export async function getAddressBookImages(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const access = await canAccessAddressBookItem(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const images = await prisma.addressBookImage.findMany({
      where: { addressBookId: id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return res.json(
      images.map((img) => ({
        ...img,
        url: img.publicUrl || storageService.getPublicUrl(img.storageKey),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "주소록 이미지 조회 중 오류가 발생했습니다." });
  }
}

export async function uploadAddressBookImages(req: AuthRequest, res: Response) {
  addressImageUploader.array("images", MAX_ADDRESS_IMAGES)(req as any, res as any, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr?.message || "이미지 업로드 중 오류가 발생했습니다." });
    }

    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 ID입니다." });
      }

      const access = await canAccessAddressBookItem(req, id);
      if (!access.ok) {
        return res.status(access.status).json({ message: access.message });
      }

      const files = ((req as any).files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
      }

      const currentCount = await prisma.addressBookImage.count({
        where: { addressBookId: id },
      });
      if (currentCount + files.length > MAX_ADDRESS_IMAGES) {
        return res.status(400).json({
          message: `이미지는 주소록 항목당 최대 ${MAX_ADDRESS_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      const created = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const originalName = normalizeMultipartFilename(file.originalname);
          const stored = await storageService.saveObject({
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName,
            keyPrefix: `address-book/${id}`,
          });

          const row = await tx.addressBookImage.create({
            data: {
              addressBookId: id,
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

      return res.status(201).json(
        created.map((img) => ({
          ...img,
          url: img.publicUrl || storageService.getPublicUrl(img.storageKey),
        }))
      );
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "주소록 이미지 업로드 중 오류가 발생했습니다." });
    }
  });
}

export async function deleteAddressBookImage(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (Number.isNaN(id) || Number.isNaN(imageId)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const access = await canAccessAddressBookItem(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const img = await prisma.addressBookImage.findFirst({
      where: { id: imageId, addressBookId: id },
    });
    if (!img) {
      return res.status(404).json({ message: "삭제할 이미지를 찾을 수 없습니다." });
    }

    await prisma.addressBookImage.delete({ where: { id: imageId } });
    await storageService.deleteObject(img.storageKey);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "주소록 이미지 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 생성 (userId = 현재 로그인 유저)
export async function createAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const {
      businessName,
      placeName,
      address,
      addressDetail,
      contactName,
      contactPhone,
      lunchTime,
      memo,
      type,
    } =
      req.body as {
        businessName?: string;
        placeName?: string;
        address?: string;
        addressDetail?: string;
        contactName?: string;
        contactPhone?: string;
        lunchTime?: string;
        memo?: string;
        type?: "PICKUP" | "DROPOFF" | "BOTH";
      };

    if (!placeName || !address || !type) {
      return res.status(400).json({
        message: "placeName, address, type은 필수입니다.",
      });
    }

    const created = await prisma.addressBook.create({
      data: {
        userId: req.user.userId,
        businessName: businessName || null,
        placeName,
        address,
        addressDetail: addressDetail || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        lunchTime: lunchTime || null,
        memo: memo || null,
        type,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 수정 (ADMIN 또는 같은 회사/본인 접근 허용)
export async function updateAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const access = await canAccessAddressBookItem(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    const existing = access.item;

    const {
      businessName,
      placeName,
      address,
      addressDetail,
      contactName,
      contactPhone,
      lunchTime,
      memo,
      type,
    } =
      req.body as {
        businessName?: string;
        placeName?: string;
        address?: string;
        addressDetail?: string;
        contactName?: string;
        contactPhone?: string;
        lunchTime?: string;
        memo?: string;
        type?: "PICKUP" | "DROPOFF" | "BOTH";
      };

    const updated = await prisma.addressBook.update({
      where: { id },
      data: {
        businessName:
          businessName !== undefined
            ? businessName
            : existing.businessName,
        placeName: placeName ?? existing.placeName,
        address: address ?? existing.address,
        addressDetail:
          addressDetail !== undefined
            ? addressDetail
            : existing.addressDetail,
        contactName:
          contactName !== undefined
            ? contactName
            : existing.contactName,
        contactPhone:
          contactPhone !== undefined
            ? contactPhone
            : existing.contactPhone,
        lunchTime:
          lunchTime !== undefined
            ? lunchTime
            : existing.lunchTime,
        memo:
          memo !== undefined
            ? memo
            : existing.memo,
        type: type ?? existing.type,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 수정 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 삭제 (ADMIN 또는 같은 회사/본인 접근 허용)
export async function deleteAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const access = await canAccessAddressBookItem(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    // 이미지가 있으면 스토리지 파일 먼저 삭제 후 DB 레코드 제거
    const images = await prisma.addressBookImage.findMany({ where: { addressBookId: id } });
    for (const img of images) {
      try { await storageService.deleteObject(img.storageKey); } catch { /* 파일 없어도 계속 진행 */ }
    }
    if (images.length > 0) {
      await prisma.addressBookImage.deleteMany({ where: { addressBookId: id } });
    }

    await prisma.addressBook.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 (선택) ADMIN용: 회사 목록(중복 제거) 조회
export async function listCompanies(_req: AuthRequest, res: Response) {
  try {
    const companies = await prisma.user.findMany({
      where: { companyName: { not: null } },
      select: { companyName: true },
      distinct: ["companyName"],
      orderBy: { companyName: "asc" },
    });

    return res.json(
      companies
        .map((c) => c.companyName)
        .filter((name): name is string => !!name)
    );
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "회사 목록 조회 중 오류가 발생했습니다." });
  }
}
