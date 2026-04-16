// src/controllers/addressBookController.ts
import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { logError } from "../utils/logger";
import { prisma } from "../prisma/client";
import {
  canAccessAddressBookItem,
  canViewAddressBookItem,
  canManageAddressBookImages,
  buildTemplatePayload,
  importAddressBookData,
  fetchAddressBookList,
  fetchAddressBookImagesList,
  saveAddressBookImages,
  deleteAddressBookImageRecord,
  createAddressBookRecord,
  updateAddressBookRecord,
  deleteAddressBookRecord,
  fetchCompanyNames,
  createCompanyNameRecord,
  updateCompanyNameRecord,
  deleteCompanyNameRecord,
} from "../services/addressBookService";
import {
  MAX_ADDRESS_IMAGES,
  addressImageUploader,
  addressBookExcelUploader,
} from "../utils/addressBookUtils";
import { sendLocalUploadedFile } from "../utils/localFile";
import { writeAuditLog } from "../services/auditLogService";
import { validateUploadedImageFiles } from "../utils/imageUpload";

const ADDRESS_BOOK_FIELD_LABELS: Record<string, string> = {
  type: "구분",
  businessName: "상호명",
  placeName: "장소명",
  address: "주소",
  addressDetail: "상세주소",
  contactName: "담당자명",
  contactPhone: "연락처",
  lunchTime: "점심시간",
  memo: "메모",
};

function toTypeLabel(value: string | null | undefined) {
  if (!value) return null;
  if (value === "PICKUP") return "출발지";
  if (value === "DROPOFF") return "도착지";
  if (value === "BOTH") return "출발/도착지";
  return value;
}

function normalizeAuditValue(key: string, value: unknown) {
  if (value == null || value === "") return null;
  if (key === "type") return toTypeLabel(String(value));
  return String(value);
}

function buildAddressBookChangeDetail(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  mode: "create" | "update" | "delete" = before ? "update" : "create"
) {
  const changes: string[] = [];

  for (const key of Object.keys(ADDRESS_BOOK_FIELD_LABELS)) {
    const prev = normalizeAuditValue(key, before?.[key]);
    const next = normalizeAuditValue(key, after[key]);
    if (mode === "update" && before && prev === next) continue;
    if (mode === "create" && next == null) continue;
    if (mode === "delete" && prev == null) continue;

    const label = ADDRESS_BOOK_FIELD_LABELS[key];
    if (mode === "create") {
      changes.push(`${label}: ${next ?? "-"}`);
      continue;
    }
    if (mode === "delete") {
      changes.push(`${label}: ${prev ?? "-"}`);
      continue;
    }
    changes.push(`${label}: ${prev ?? "-"} -> ${next ?? "-"}`);
  }

  return {
    changes,
  };
}

// 🔹 주소록 엑셀 업로드 템플릿 다운로드
export async function downloadTemplate(_req: AuthRequest, res: Response) {
  try {
    const { buffer, fileName } = buildTemplatePayload();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="address-book-template.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.send(buffer);
  } catch (err) {
    logError("downloadTemplate", err);
    return res.status(500).json({ message: "주소록 템플릿 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 엑셀 업로드
export function importAddressBook(req: AuthRequest, res: Response): void {
  addressBookExcelUploader.single("file")(req as any, res as any, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr?.message || "엑셀 업로드 중 오류가 발생했습니다." });
    }
    try {
      if (!req.user) {
        return res.status(401).json({ message: "인증 정보가 없습니다." });
      }
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ message: "업로드할 엑셀 파일이 없습니다." });
      }
      const result = await importAddressBookData(req, file);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      void writeAuditLog({
        req,
        action: "IMPORT",
        resource: "ADDRESS_BOOK",
        target: "address_book_import",
        detail: {
          totalRows: result.data.totalRows,
          createdCount: result.data.createdCount,
          skippedCount: result.data.skippedCount,
          failureCount: result.data.failureCount,
          appliedCompanyName: result.data.appliedCompanyName ?? null,
          companyNameOverridden: result.data.companyNameOverridden ?? 0,
        },
      });
      return res.json(result.data);
    } catch (err) {
      logError("importAddressBook", err);
      return res.status(500).json({ message: "주소록 엑셀 업로드 중 오류가 발생했습니다." });
    }
  });
}

// 🔹 주소록 목록 조회
export async function listAddressBook(req: AuthRequest, res: Response) {
  try {
    const result = await fetchAddressBookList(req);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    logError("listAddressBook", err);
    return res.status(500).json({ message: "주소록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 이미지 목록 조회
export async function getAddressBookImages(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const result = await fetchAddressBookImagesList(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    logError("getAddressBookImages", err);
    return res.status(500).json({ message: "주소록 이미지 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 이미지 원본 파일 다운로드(인증/권한 필요)
export async function downloadAddressBookImage(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (Number.isNaN(id) || Number.isNaN(imageId)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const access = await canViewAddressBookItem(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const image = await prisma.addressBookImage.findFirst({
      where: { id: imageId, addressBookId: id },
    });
    if (!image) {
      return res.status(404).json({ message: "이미지를 찾을 수 없습니다." });
    }

    const sent = await sendLocalUploadedFile(res, image.storageKey, image.mimeType, image.originalName);
    if (!sent) {
      return res.status(404).json({ message: "이미지 파일을 찾을 수 없습니다." });
    }
    return;
  } catch (err) {
    logError("downloadAddressBookImage", err);
    return res.status(500).json({ message: "주소록 이미지 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 이미지 업로드
export function uploadAddressBookImages(req: AuthRequest, res: Response): void {
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
      if (!canManageAddressBookImages(req)) {
        return res.status(403).json({ message: "이 주소록에 이미지를 업로드할 권한이 없습니다." });
      }

      const files = ((req as any).files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
      }
      const validation = validateUploadedImageFiles(files);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const currentCount = await prisma.addressBookImage.count({ where: { addressBookId: id } });
      if (currentCount + files.length > MAX_ADDRESS_IMAGES) {
        return res.status(400).json({
          message: `이미지는 주소록 항목당 최대 ${MAX_ADDRESS_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      const created = await saveAddressBookImages(id, files, currentCount);
      void writeAuditLog({
        req,
        action: "IMAGE_UPLOAD",
        resource: "ADDRESS_BOOK",
        resourceId: id,
        target: "address_book_image",
        detail: { count: created.length },
      });
      return res.status(201).json(created);
    } catch (err) {
      logError("uploadAddressBookImages", err);
      return res.status(500).json({ message: "주소록 이미지 업로드 중 오류가 발생했습니다." });
    }
  });
}

// 🔹 주소록 이미지 삭제
export async function deleteAddressBookImage(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (Number.isNaN(id) || Number.isNaN(imageId)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const result = await deleteAddressBookImageRecord(req, id, imageId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "ADDRESS_BOOK",
      resourceId: id,
      target: "address_book_image",
      detail: { imageId, changes: [`이미지삭제: #${imageId}`] },
    });
    return res.status(204).send();
  } catch (err) {
    logError("deleteAddressBookImage", err);
    return res.status(500).json({ message: "주소록 이미지 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 생성
export async function createAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "인증 정보가 없습니다." });
    const result = await createAddressBookRecord(req, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "ADDRESS_BOOK",
      resourceId: result.data.id,
      target: "address_book_entry",
      detail: buildAddressBookChangeDetail(null, result.data as unknown as Record<string, unknown>, "create"),
    });
    return res.status(201).json(result.data);
  } catch (err) {
    logError("createAddressBookEntry", err);
    return res.status(500).json({ message: "주소록 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 수정
export async function updateAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const before = await prisma.addressBook.findUnique({
      where: { id },
      select: {
        type: true,
        businessName: true,
        placeName: true,
        address: true,
        addressDetail: true,
        contactName: true,
        contactPhone: true,
        lunchTime: true,
        memo: true,
      },
    });
    const result = await updateAddressBookRecord(req, id, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "ADDRESS_BOOK",
      resourceId: id,
      target: "address_book_entry",
      detail: buildAddressBookChangeDetail(
        before as unknown as Record<string, unknown> | null,
        result.data as unknown as Record<string, unknown>,
        "update"
      ),
    });
    return res.json(result.data);
  } catch (err) {
    logError("updateAddressBookEntry", err);
    return res.status(500).json({ message: "주소록 수정 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 삭제
export async function deleteAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const before = await prisma.addressBook.findUnique({
      where: { id },
      select: {
        type: true,
        businessName: true,
        placeName: true,
        address: true,
        addressDetail: true,
        contactName: true,
        contactPhone: true,
        lunchTime: true,
        memo: true,
      },
    });
    const result = await deleteAddressBookRecord(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "ADDRESS_BOOK",
      resourceId: id,
      target: "address_book_entry",
      detail: buildAddressBookChangeDetail(
        before as unknown as Record<string, unknown> | null,
        before as unknown as Record<string, unknown>,
        "delete"
      ),
    });
    return res.status(204).send();
  } catch (err) {
    logError("deleteAddressBookEntry", err);
    return res.status(500).json({ message: "주소록 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 목록 조회 (로그인 사용자 전체)
export async function listCompanies(_req: AuthRequest, res: Response) {
  try {
    const data = await fetchCompanyNames();
    return res.json(data);
  } catch (err) {
    logError("listCompanies", err);
    return res.status(500).json({ message: "회사명 목록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 등록 (ADMIN/DISPATCHER 전용)
export async function createCompany(req: AuthRequest, res: Response) {
  try {
    const name = (req.body?.name ?? "").toString().trim();
    if (!name) {
      return res.status(400).json({ message: "회사명을 입력해주세요." });
    }
    const record = await createCompanyNameRecord(name);
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "GROUP",
      resourceId: record.id,
      detail: { name: record.name },
    });
    return res.status(201).json(record);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "이미 등록된 회사명입니다." });
    }
    logError("createCompany", err);
    return res.status(500).json({ message: "회사명 등록 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 수정 (ADMIN/DISPATCHER 전용)
export async function updateCompany(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.companyId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const name = (req.body?.name ?? "").toString().trim();
    if (!name) {
      return res.status(400).json({ message: "회사명을 입력해주세요." });
    }
    const { before, after } = await updateCompanyNameRecord(id, name);
    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "GROUP",
      resourceId: id,
      detail: { before: before.name, after: after.name },
    });
    return res.json(after);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "이미 등록된 회사명입니다." });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "해당 회사명을 찾을 수 없습니다." });
    }
    logError("updateCompany", err);
    return res.status(500).json({ message: "회사명 수정 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 삭제 (ADMIN/DISPATCHER 전용)
export async function deleteCompany(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.companyId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    const companies = await fetchCompanyNames();
    const target = companies.find((company) => company.id === id) ?? null;
    await deleteCompanyNameRecord(id);
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "GROUP",
      resourceId: id,
      detail: target ? { name: target.name } : null,
    });
    return res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "해당 회사명을 찾을 수 없습니다." });
    }
    logError("deleteCompany", err);
    return res.status(500).json({ message: "회사명 삭제 중 오류가 발생했습니다." });
  }
}
