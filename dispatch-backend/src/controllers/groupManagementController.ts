import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { logError } from "../utils/logger";
import { buildUpdateAuditDetail, writeAuditLog } from "../services/auditLogService";
import {
  fetchGroupManagementOverview,
  createGroupDepartmentRecord,
  updateGroupDepartmentRecord,
  deleteGroupDepartmentRecord,
  createGroupContactRecord,
  updateGroupContactRecord,
  deleteGroupContactRecord,
} from "../services/groupManagementService";

function handleError(res: Response, scope: string, err: any, fallbackMessage: string) {
  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
  if (statusCode >= 500) {
    logError(scope, err);
  }
  return res.status(statusCode).json({ message: err?.message || fallbackMessage });
}

export async function listGroups(req: AuthRequest, res: Response) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const size = typeof req.query.size === "string" ? Number(req.query.size) : undefined;
    const groups = await fetchGroupManagementOverview({ q, page, size });
    return res.json(groups);
  } catch (err) {
    return handleError(res, "listGroups", err, "그룹 목록 조회 중 오류가 발생했습니다.");
  }
}

export async function createGroupDepartment(req: AuthRequest, res: Response) {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "유효한 그룹 ID가 필요합니다." });
    }

    const department = await createGroupDepartmentRecord(groupId, req.body?.name);
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "GROUP_DEPARTMENT",
      resourceId: department.id,
      target: "group_department",
      detail: { groupId, name: department.name },
    });
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "GROUP",
      resourceId: groupId,
      target: "group_department",
      detail: { target: "department", departmentId: department.id, name: department.name },
    });
    return res.status(201).json(department);
  } catch (err) {
    if (err && (err as any).code === "P2002") {
      return res.status(409).json({ message: "같은 그룹에 동일한 부서명이 이미 있습니다." });
    }
    return handleError(res, "createGroupDepartment", err, "부서 생성 중 오류가 발생했습니다.");
  }
}

export async function updateGroupDepartment(req: AuthRequest, res: Response) {
  try {
    const departmentId = Number(req.params.departmentId);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ message: "유효한 부서 ID가 필요합니다." });
    }

    const department = await updateGroupDepartmentRecord(departmentId, req.body?.name);
    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "GROUP_DEPARTMENT",
      resourceId: department.after.id,
      target: "group_department",
      detail: buildUpdateAuditDetail({
        entity: "그룹 부서",
        summary: "부서 정보 수정",
        context: {
          groupId: department.after.groupId,
          departmentId: department.after.id,
        },
        fields: [
          {
            field: "name",
            label: "부서명",
            before: department.before.name,
            after: department.after.name,
          },
        ],
      }),
    });
    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "GROUP",
      resourceId: department.after.groupId,
      target: "group_department",
      detail: buildUpdateAuditDetail({
        entity: "그룹 부서",
        summary: "그룹 내 부서 정보 수정",
        context: {
          departmentId: department.after.id,
        },
        fields: [
          {
            field: "name",
            label: "부서명",
            before: department.before.name,
            after: department.after.name,
          },
        ],
      }),
    });
    return res.json(department.after);
  } catch (err) {
    if (err && (err as any).code === "P2002") {
      return res.status(409).json({ message: "같은 그룹에 동일한 부서명이 이미 있습니다." });
    }
    return handleError(res, "updateGroupDepartment", err, "부서 수정 중 오류가 발생했습니다.");
  }
}

export async function deleteGroupDepartment(req: AuthRequest, res: Response) {
  try {
    const departmentId = Number(req.params.departmentId);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ message: "유효한 부서 ID가 필요합니다." });
    }

    const deleted = await deleteGroupDepartmentRecord(departmentId);
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "GROUP_DEPARTMENT",
      resourceId: departmentId,
      target: "group_department",
      detail: { groupId: deleted.groupId, name: deleted.name },
    });
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "GROUP",
      resourceId: deleted.groupId,
      target: "group_department",
      detail: { target: "department", departmentId, name: deleted.name },
    });
    return res.status(204).send();
  } catch (err) {
    return handleError(res, "deleteGroupDepartment", err, "부서 삭제 중 오류가 발생했습니다.");
  }
}

export async function createGroupContact(req: AuthRequest, res: Response) {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "유효한 그룹 ID가 필요합니다." });
    }

    const contact = await createGroupContactRecord(groupId, {
      departmentId: req.body?.departmentId,
      name: req.body?.name,
      position: req.body?.position,
      phone: req.body?.phone,
      email: req.body?.email,
    });

    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "GROUP_CONTACT",
      resourceId: contact.id,
      target: "group_contact",
      detail: {
        groupId,
        departmentId: contact.departmentId,
        name: contact.name,
      },
    });
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "GROUP",
      resourceId: groupId,
      target: "group_contact",
      detail: {
        target: "contact",
        contactId: contact.id,
        departmentId: contact.departmentId,
        departmentName: contact.department.name,
        name: contact.name,
      },
    });

    return res.status(201).json({
      id: contact.id,
      groupId: contact.groupId,
      departmentId: contact.departmentId,
      departmentName: contact.department.name,
      name: contact.name,
      position: contact.position,
      phone: contact.phone,
      email: contact.email,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    });
  } catch (err) {
    return handleError(res, "createGroupContact", err, "인원 생성 중 오류가 발생했습니다.");
  }
}

export async function updateGroupContact(req: AuthRequest, res: Response) {
  try {
    const contactId = Number(req.params.contactId);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return res.status(400).json({ message: "유효한 인원 ID가 필요합니다." });
    }

    const contact = await updateGroupContactRecord(contactId, {
      departmentId: req.body?.departmentId,
      name: req.body?.name,
      position: req.body?.position,
      phone: req.body?.phone,
      email: req.body?.email,
    });

    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "GROUP_CONTACT",
      resourceId: contact.after.id,
      target: "group_contact",
      detail: buildUpdateAuditDetail({
        entity: "그룹 인원",
        summary: "인원 정보 수정",
        context: {
          groupId: contact.after.groupId,
          contactId: contact.after.id,
        },
        fields: [
          {
            field: "departmentId",
            label: "부서",
            before: contact.before.department.name,
            after: contact.after.department.name,
          },
          { field: "name", label: "이름", before: contact.before.name, after: contact.after.name },
          { field: "position", label: "직책", before: contact.before.position, after: contact.after.position },
          { field: "phone", label: "연락처", before: contact.before.phone, after: contact.after.phone },
          { field: "email", label: "이메일", before: contact.before.email, after: contact.after.email },
        ],
      }),
    });
    void writeAuditLog({
      req,
      action: "UPDATE",
      resource: "GROUP",
      resourceId: contact.after.groupId,
      target: "group_contact",
      detail: buildUpdateAuditDetail({
        entity: "그룹 인원",
        summary: "그룹 내 인원 정보 수정",
        context: {
          contactId: contact.after.id,
        },
        fields: [
          {
            field: "departmentId",
            label: "부서",
            before: contact.before.department.name,
            after: contact.after.department.name,
          },
          { field: "name", label: "이름", before: contact.before.name, after: contact.after.name },
          { field: "position", label: "직책", before: contact.before.position, after: contact.after.position },
          { field: "phone", label: "연락처", before: contact.before.phone, after: contact.after.phone },
          { field: "email", label: "이메일", before: contact.before.email, after: contact.after.email },
        ],
      }),
    });

    return res.json({
      id: contact.after.id,
      groupId: contact.after.groupId,
      departmentId: contact.after.departmentId,
      departmentName: contact.after.department.name,
      name: contact.after.name,
      position: contact.after.position,
      phone: contact.after.phone,
      email: contact.after.email,
      createdAt: contact.after.createdAt,
      updatedAt: contact.after.updatedAt,
    });
  } catch (err) {
    return handleError(res, "updateGroupContact", err, "인원 수정 중 오류가 발생했습니다.");
  }
}

export async function deleteGroupContact(req: AuthRequest, res: Response) {
  try {
    const contactId = Number(req.params.contactId);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      return res.status(400).json({ message: "유효한 인원 ID가 필요합니다." });
    }

    const deleted = await deleteGroupContactRecord(contactId);
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "GROUP_CONTACT",
      resourceId: contactId,
      target: "group_contact",
      detail: {
        groupId: deleted.groupId,
        departmentId: deleted.departmentId,
        departmentName: deleted.departmentName,
        name: deleted.name,
      },
    });
    void writeAuditLog({
      req,
      action: "DELETE",
      resource: "GROUP",
      resourceId: deleted.groupId,
      target: "group_contact",
      detail: {
        target: "contact",
        contactId,
        departmentId: deleted.departmentId,
        departmentName: deleted.departmentName,
        name: deleted.name,
      },
    });
    return res.status(204).send();
  } catch (err) {
    return handleError(res, "deleteGroupContact", err, "인원 삭제 중 오류가 발생했습니다.");
  }
}
