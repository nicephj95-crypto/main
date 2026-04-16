import { prisma } from "../prisma/client";

function createHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function normalizeRequiredText(value: unknown, label: string, maxLength: number): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw createHttpError(400, `${label}을(를) 입력해주세요.`);
  }
  return text.slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeEmail(value: unknown): string | null {
  const text = normalizeOptionalText(value, 120);
  if (!text) return null;
  const email = text.toLowerCase();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    throw createHttpError(400, "올바른 이메일 형식을 입력해주세요.");
  }
  return email;
}

async function ensureGroupExists(groupId: number) {
  const group = await prisma.companyName.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group) {
    throw createHttpError(404, "해당 그룹을 찾을 수 없습니다.");
  }
  return group;
}

export async function fetchGroupManagementOverview(options?: {
  q?: string;
  page?: number;
  size?: number;
}) {
  const q = String(options?.q ?? "").trim().slice(0, 100);
  const page = options?.page && options.page > 0 ? options.page : 1;
  const size = options?.size && options.size > 0 ? Math.min(options.size, 200) : 20;
  const skip = (page - 1) * size;

  const where = q
    ? {
        name: {
          contains: q,
        },
      }
    : undefined;

  const [groups, total] = await Promise.all([
    prisma.companyName.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: size,
      include: {
        groupDepartments: {
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { contacts: true },
            },
          },
        },
        groupContacts: {
          orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
          include: {
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.companyName.count({ where }),
  ]);

  return {
    items: groups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      departments: group.groupDepartments.map((department) => ({
        id: department.id,
        groupId: department.groupId,
        name: department.name,
        contactCount: department._count.contacts,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })),
      contacts: group.groupContacts.map((contact) => ({
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
      })),
    })),
    total,
    page,
    size,
  };
}

export async function createGroupDepartmentRecord(groupId: number, name: unknown) {
  await ensureGroupExists(groupId);
  const normalizedName = normalizeRequiredText(name, "부서명", 60);
  return prisma.groupDepartment.create({
    data: {
      groupId,
      name: normalizedName,
    },
  });
}

export async function updateGroupDepartmentRecord(departmentId: number, name: unknown) {
  const existing = await prisma.groupDepartment.findUnique({
    where: { id: departmentId },
    select: { id: true, groupId: true, name: true },
  });
  if (!existing) {
    throw createHttpError(404, "해당 부서를 찾을 수 없습니다.");
  }

  const normalizedName = normalizeRequiredText(name, "부서명", 60);
  const updated = await prisma.groupDepartment.update({
    where: { id: departmentId },
    data: { name: normalizedName },
  });
  return {
    before: existing,
    after: updated,
  };
}

export async function deleteGroupDepartmentRecord(departmentId: number) {
  const existing = await prisma.groupDepartment.findUnique({
    where: { id: departmentId },
    include: {
      _count: {
        select: { contacts: true },
      },
    },
  });
  if (!existing) {
    throw createHttpError(404, "해당 부서를 찾을 수 없습니다.");
  }
  if (existing._count.contacts > 0) {
    throw createHttpError(409, "이 부서를 사용하는 인원이 있어 삭제할 수 없습니다. 먼저 인원을 이동하거나 삭제해주세요.");
  }

  await prisma.groupDepartment.delete({ where: { id: departmentId } });
  return {
    id: existing.id,
    groupId: existing.groupId,
    name: existing.name,
  };
}

export async function createGroupContactRecord(
  groupId: number,
  payload: {
    departmentId: unknown;
    name: unknown;
    position?: unknown;
    phone?: unknown;
    email?: unknown;
  }
) {
  await ensureGroupExists(groupId);

  const departmentId = Number(payload.departmentId);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw createHttpError(400, "부서를 선택해주세요.");
  }

  const department = await prisma.groupDepartment.findFirst({
    where: { id: departmentId, groupId },
    select: { id: true },
  });
  if (!department) {
    throw createHttpError(400, "선택한 부서가 해당 그룹에 속하지 않습니다.");
  }

  return prisma.groupContact.create({
    data: {
      groupId,
      departmentId,
      name: normalizeRequiredText(payload.name, "담당자명", 60),
      position: normalizeOptionalText(payload.position, 40),
      phone: normalizeOptionalText(payload.phone, 30),
      email: normalizeEmail(payload.email),
    },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function updateGroupContactRecord(
  contactId: number,
  payload: {
    departmentId: unknown;
    name: unknown;
    position?: unknown;
    phone?: unknown;
    email?: unknown;
  }
) {
  const existing = await prisma.groupContact.findUnique({
    where: { id: contactId },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });
  if (!existing) {
    throw createHttpError(404, "해당 인원을 찾을 수 없습니다.");
  }

  const departmentId = Number(payload.departmentId);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw createHttpError(400, "부서를 선택해주세요.");
  }

  const department = await prisma.groupDepartment.findFirst({
    where: { id: departmentId, groupId: existing.groupId },
    select: { id: true },
  });
  if (!department) {
    throw createHttpError(400, "선택한 부서가 해당 그룹에 속하지 않습니다.");
  }

  const updated = await prisma.groupContact.update({
    where: { id: contactId },
    data: {
      departmentId,
      name: normalizeRequiredText(payload.name, "담당자명", 60),
      position: normalizeOptionalText(payload.position, 40),
      phone: normalizeOptionalText(payload.phone, 30),
      email: normalizeEmail(payload.email),
    },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });
  return {
    before: existing,
    after: updated,
  };
}

export async function deleteGroupContactRecord(contactId: number) {
  const existing = await prisma.groupContact.findUnique({
    where: { id: contactId },
    include: {
      department: {
        select: { name: true },
      },
    },
  });
  if (!existing) {
    throw createHttpError(404, "해당 인원을 찾을 수 없습니다.");
  }

  await prisma.groupContact.delete({ where: { id: contactId } });
  return {
    id: existing.id,
    groupId: existing.groupId,
    departmentId: existing.departmentId,
    departmentName: existing.department.name,
    name: existing.name,
  };
}
