import { Response } from "express";
import type { RequestStatus } from "@prisma/client";
import type { AuthRequest } from "../../middleware/authMiddleware";
import {
  updateRequestRecord,
  processOrderNumberUpdate,
  processDeleteAssignment,
  processSaveAssignment,
  processStatusChange,
} from "../../services/requestService";
import { writeAuditLog } from "../../services/auditLogService";
import { ALL_REQUEST_STATUSES } from "../../utils/requestUtils";
import { logError } from "../../utils/logger";

const REQUEST_METHOD_VALUES = ["FORKLIFT", "MANUAL", "SUDOU_SUHAEJUNG", "HOIST", "CRANE", "CONVEYOR"];

export async function updateRequest(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "로그인 정보가 없습니다.(req.user 없음)" });
    }

    const { pickup, dropoff } = req.body as {
      pickup?: { placeName?: string; address?: string; method?: string };
      dropoff?: { placeName?: string; address?: string; method?: string };
    };

    if (
      !pickup || !pickup.placeName || !pickup.address || !pickup.method ||
      !dropoff || !dropoff.placeName || !dropoff.address || !dropoff.method
    ) {
      return res.status(400).json({
        message:
          "pickup.placeName, pickup.address, pickup.method, dropoff.placeName, dropoff.address, dropoff.method 는 필수입니다.",
      });
    }

    const upperPickupMethod = String(pickup.method).toUpperCase();
    const upperDropoffMethod = String(dropoff.method).toUpperCase();

    if (!REQUEST_METHOD_VALUES.includes(upperPickupMethod)) {
      return res.status(400).json({ message: `pickup.method 는 ${REQUEST_METHOD_VALUES.join(", ")} 중 하나여야 합니다.` });
    }
    if (!REQUEST_METHOD_VALUES.includes(upperDropoffMethod)) {
      return res.status(400).json({ message: `dropoff.method 는 ${REQUEST_METHOD_VALUES.join(", ")} 중 하나여야 합니다.` });
    }

    const result = await updateRequestRecord(req, id, req.body);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    void writeAuditLog({
      req,
      action: result.audit?.action ?? "UPDATE",
      resource: "REQUEST",
      resourceId: id,
      target: result.audit?.target ?? "request_edit",
      detail: result.audit?.detail ?? null,
    });
    return res.json(result.data);
  } catch (err: any) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    logError("updateRequest", err);
    return res.status(500).json({ message: "배차 요청 수정 중 오류가 발생했습니다." });
  }
}

export async function changeRequestStatus(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const { status } = req.body as { status?: RequestStatus };
    if (!status) {
      return res.status(400).json({ message: "변경할 상태(status)가 필요합니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!ALL_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ message: `허용되지 않는 상태 값입니다: ${status}` });
    }

    const result = await processStatusChange(req, id, status);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: result.audit?.action ?? "STATUS_CHANGE",
      resource: "REQUEST",
      resourceId: id,
      target: result.audit?.target ?? "request_status",
      detail: result.audit?.detail ?? { newStatus: status },
    });
    return res.json(result.data);
  } catch (err: any) {
    logError("changeRequestStatus", err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "요청 상태 변경 중 오류가 발생했습니다." });
  }
}

export async function updateRequestOrderNumber(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const { orderNumber } = req.body as { orderNumber?: string | null };
    if (orderNumber != null && typeof orderNumber !== "string") {
      return res.status(400).json({ message: "오더번호는 문자열이어야 합니다." });
    }

    const result = await processOrderNumberUpdate(req, id, orderNumber);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: result.audit?.action ?? "UPDATE",
      resource: "REQUEST",
      resourceId: id,
      target: result.audit?.target ?? "request_order_number",
      detail: result.audit?.detail ?? { orderNumber: orderNumber ?? null },
    });
    return res.json(result.data);
  } catch (err) {
    logError("updateRequestOrderNumber", err);
    return res.status(500).json({ message: "오더번호 저장 중 오류가 발생했습니다." });
  }
}

export async function saveAssignment(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!(req.user.role === "ADMIN" || req.user.role === "DISPATCHER" || req.user.role === "SALES")) {
      return res.status(403).json({ message: "배차정보 입력 권한이 없습니다." });
    }

    const result = await processSaveAssignment(id, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: result.audit?.action ?? "UPDATE",
      resource: "REQUEST",
      resourceId: id,
      target: result.audit?.target ?? "assignment",
      detail: result.audit?.detail ?? null,
    });
    return res.json(result.data);
  } catch (err) {
    logError("saveAssignment", err);
    return res.status(500).json({ message: "배차정보 저장 중 오류가 발생했습니다." });
  }
}

export async function deleteAssignment(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!(req.user.role === "ADMIN" || req.user.role === "DISPATCHER" || req.user.role === "SALES")) {
      return res.status(403).json({ message: "배차정보 삭제 권한이 없습니다." });
    }

    const result = await processDeleteAssignment(id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    void writeAuditLog({
      req,
      action: result.audit?.action ?? "DELETE",
      resource: "REQUEST",
      resourceId: id,
      target: result.audit?.target ?? "assignment",
      detail: result.audit?.detail ?? null,
    });
    return res.json(result.data);
  } catch (err) {
    logError("deleteAssignment", err);
    return res.status(500).json({ message: "배차정보 삭제 중 오류가 발생했습니다." });
  }
}
