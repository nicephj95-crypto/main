import { Response } from "express";
import { prisma } from "../../prisma/client";
import type { AuthRequest } from "../../middleware/authMiddleware";
import { getStorageServiceForProvider } from "../../services/storage";
import {
  canAccessRequestByRole,
  canManageRequestImagesByRole,
  fetchRequestImagesList,
  saveRequestImageRecords,
} from "../../services/requestService";
import { writeAuditLog } from "../../services/auditLogService";
import {
  MAX_REQUEST_IMAGES,
  requestImageUploader,
} from "../../utils/requestUtils";
import { logError } from "../../utils/logger";
import { sendStoredImageFile } from "../../utils/storedFile";
import { validateUploadedImageFiles } from "../../utils/imageUpload";

export async function getRequestImages(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id가 올바르지 않습니다." });
  }

  try {
    const result = await fetchRequestImagesList(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    return res.json(
      result.data.map((img) => ({
        ...img,
        url: `/requests/${id}/images/${img.id}/file`,
      }))
    );
  } catch (err) {
    logError("getRequestImages", err);
    return res.status(500).json({ message: "이미지 목록 조회 중 오류가 발생했습니다." });
  }
}

export async function downloadRequestImage(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  if (Number.isNaN(id) || Number.isNaN(imageId)) {
    return res.status(400).json({ message: "유효하지 않은 ID입니다." });
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        ownerCompanyId: true,
        targetCompanyName: true,
        createdBy: { select: { companyName: true } },
      },
    });
    if (!request) {
      return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
    }
    if (!(await canAccessRequestByRole(req, request))) {
      return res.status(403).json({ message: "이 이미지에 접근할 권한이 없습니다." });
    }

    const image = await prisma.requestImage.findFirst({
      where: { id: imageId, requestId: id },
    });
    if (!image) {
      return res.status(404).json({ message: "이미지를 찾을 수 없습니다." });
    }

    const sent = await sendStoredImageFile(
      res,
      image.storageKey,
      image.mimeType,
      image.originalName,
      image.storageProvider
    );
    if (!sent) {
      return res.status(404).json({ message: "이미지 파일을 찾을 수 없습니다." });
    }
    return;
  } catch (err) {
    logError("downloadRequestImage", err);
    return res.status(500).json({ message: "이미지 파일 조회 중 오류가 발생했습니다." });
  }
}

export function uploadRequestImages(req: AuthRequest, res: Response): void {
  requestImageUploader.array("images", MAX_REQUEST_IMAGES)(req as any, res as any, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        message: uploadErr?.message || "이미지 업로드 요청 처리 중 오류가 발생했습니다.",
      });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id가 올바르지 않습니다." });
    }

    try {
      const request = await prisma.request.findUnique({
        where: { id },
        select: {
          id: true,
          ownerCompanyId: true,
          targetCompanyName: true,
          createdBy: { select: { companyName: true } },
        },
      });

      if (!request) {
        return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
      }
      if (!(await canAccessRequestByRole(req, request))) {
        return res.status(403).json({ message: "이 요청에 이미지를 업로드할 권한이 없습니다." });
      }
      if (!canManageRequestImagesByRole(req)) {
        return res.status(403).json({ message: "직원 계정만 요청 이미지를 업로드할 수 있습니다." });
      }

      const files = ((req as any).files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
      }
      const validation = validateUploadedImageFiles(files);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const currentCount = await prisma.requestImage.count({ where: { requestId: id } });
      if (currentCount + files.length > MAX_REQUEST_IMAGES) {
        return res.status(400).json({
          message: `이미지는 요청당 최대 ${MAX_REQUEST_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      const imageKind = (req as any).body?.kind === "receipt" ? "receipt" : "cargo";
      const created = await saveRequestImageRecords(id, files, imageKind, currentCount);

      void writeAuditLog({
        req,
        action: "IMAGE_UPLOAD",
        resource: "REQUEST",
        resourceId: id,
        target: "request_image",
        detail: { kind: imageKind, count: created.length },
      });
      return res.status(201).json(
        created.map((img) => ({
          ...img,
          url: `/requests/${id}/images/${img.id}/file`,
          autoCompleted: false,
        }))
      );
    } catch (err) {
      logError("uploadRequestImages", err);
      return res.status(500).json({ message: "이미지 업로드 중 오류가 발생했습니다." });
    }
  });
}

export async function deleteRequestImage(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if (Number.isNaN(id) || Number.isNaN(imageId)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const img = await prisma.requestImage.findFirst({ where: { id: imageId, requestId: id } });
    if (!img) return res.status(404).json({ message: "삭제할 이미지를 찾을 수 없습니다." });

    const request = await prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        ownerCompanyId: true,
        targetCompanyName: true,
        createdBy: { select: { companyName: true } },
      },
    });
    if (!request) return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
    if (!(await canAccessRequestByRole(req, request))) {
      return res.status(403).json({ message: "이 이미지를 삭제할 권한이 없습니다." });
    }
    if (!canManageRequestImagesByRole(req)) {
      return res.status(403).json({ message: "직원 계정만 요청 이미지를 삭제할 수 있습니다." });
    }

    await prisma.requestImage.delete({ where: { id: imageId } });
    try { await getStorageServiceForProvider(img.storageProvider).deleteObject(img.storageKey); } catch { /* 무시 */ }

    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "REQUEST",
      resourceId: id,
      target: "request_image",
      detail: {
        imageId,
        kind: img.kind,
        originalName: img.originalName,
        changes: [`이미지삭제: ${img.originalName}`],
      },
    });

    return res.status(204).send();
  } catch (err) {
    logError("deleteRequestImage", err);
    return res.status(500).json({ message: "이미지 삭제 중 오류가 발생했습니다." });
  }
}
