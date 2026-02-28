// src/controllers/addressBookController.ts
import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../prisma/client";
import {
  canAccessAddressBookItem,
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
  deleteCompanyNameRecord,
} from "../services/addressBookService";
import {
  MAX_ADDRESS_IMAGES,
  addressImageUploader,
  addressBookExcelUploader,
} from "../utils/addressBookUtils";

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
    console.error(err);
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
      return res.json(result.data);
    } catch (err) {
      console.error(err);
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
    console.error(err);
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
    console.error(err);
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

      const files = ((req as any).files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
      }

      const currentCount = await prisma.addressBookImage.count({ where: { addressBookId: id } });
      if (currentCount + files.length > MAX_ADDRESS_IMAGES) {
        return res.status(400).json({
          message: `이미지는 주소록 항목당 최대 ${MAX_ADDRESS_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      const created = await saveAddressBookImages(id, files, currentCount);
      return res.status(201).json(created);
    } catch (err) {
      console.error(err);
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
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "주소록 이미지 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 주소록 생성
export async function createAddressBookEntry(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "인증 정보가 없습니다." });
    const result = await createAddressBookRecord(req.user.userId, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.status(201).json(result.data);
  } catch (err) {
    console.error(err);
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
    const result = await updateAddressBookRecord(req, id, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    console.error(err);
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
    const result = await deleteAddressBookRecord(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "주소록 삭제 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 목록 조회 (로그인 사용자 전체)
export async function listCompanies(_req: AuthRequest, res: Response) {
  try {
    const data = await fetchCompanyNames();
    return res.json(data);
  } catch (err) {
    console.error(err);
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
    return res.status(201).json(record);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "이미 등록된 회사명입니다." });
    }
    console.error(err);
    return res.status(500).json({ message: "회사명 등록 중 오류가 발생했습니다." });
  }
}

// 🔹 회사명 삭제 (ADMIN/DISPATCHER 전용)
export async function deleteCompany(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.companyId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }
    await deleteCompanyNameRecord(id);
    return res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "해당 회사명을 찾을 수 없습니다." });
    }
    console.error(err);
    return res.status(500).json({ message: "회사명 삭제 중 오류가 발생했습니다." });
  }
}
