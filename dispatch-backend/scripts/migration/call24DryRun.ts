import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const backendRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true, quiet: true });

type JsonRow = Record<string, unknown>;

type SourceUser = {
  email?: unknown;
  name?: unknown;
  password?: unknown;
  auth_code?: unknown;
  delete_yn?: unknown;
  group_code?: unknown;
};

type SourceAddress = {
  email?: unknown;
  startEnd?: unknown;
  wide?: unknown;
  sgg?: unknown;
  dong?: unknown;
  detail?: unknown;
  baseYn?: unknown;
  companyName?: unknown;
  placeName?: unknown;
  name?: unknown;
  bookmarkName?: unknown;
};

type SourceBookmark = {
  email?: unknown;
  bookmarkName?: unknown;
  wide?: unknown;
  sgg?: unknown;
  dong?: unknown;
  detail?: unknown;
  areaPhone?: unknown;
  delete_yn?: unknown;
};

type SourceOrder = {
  cargo_seq?: unknown;
  ordNo?: unknown;
  ordStatus?: unknown;
  startCompanyName?: unknown;
  startWide?: unknown;
  startSgg?: unknown;
  startDong?: unknown;
  startDetail?: unknown;
  startAreaPhone?: unknown;
  startPlanDt?: unknown;
  startPlanHour?: unknown;
  startPlanMinute?: unknown;
  endCompanyName?: unknown;
  endWide?: unknown;
  endSgg?: unknown;
  endDong?: unknown;
  endDetail?: unknown;
  endAreaPhone?: unknown;
  endPlanDt?: unknown;
  endPlanHour?: unknown;
  endPlanMinute?: unknown;
  startLoad?: unknown;
  endLoad?: unknown;
  cargoTon?: unknown;
  truckType?: unknown;
  cjTruckType?: unknown;
  cargoDsc?: unknown;
  farePaytype?: unknown;
  fare?: unknown;
  fareView?: unknown;
  create_user?: unknown;
  create_dtm?: unknown;
  change_dtm?: unknown;
  multiCargoGub?: unknown;
  urgent?: unknown;
  shuttleCargoInfo?: unknown;
  cjName?: unknown;
  cjPhone?: unknown;
  cjCarNum?: unknown;
  cjCargoTon?: unknown;
  addFare?: unknown;
  addFareReason?: unknown;
  adminMemo?: unknown;
  userMemo?: unknown;
};

type WarningCounts = {
  statusMappingFailures: number;
  loadMethodMappingFailures: number;
  paymentMethodMappingFailures: number;
  requestTypeMappingFailures: number;
  vehicleGroupMappingFailures: number;
  dateParsingFailures: number;
  tonnageParsingFailures: number;
  fareParsingFailures: number;
};

const MYSQL_DATABASE = process.env.CALL24_MYSQL_DATABASE || "call24_import";
const OVERLAP_START = new Date("2026-04-29T00:00:00.000Z");

const prisma = new PrismaClient();
const tableColumnsCache = new Map<string, Set<string>>();

function usage() {
  console.log(`
Call24 migration dry-run

This script is read-only:
- MySQL: SELECT/SHOW only
- PostgreSQL: Prisma count/findMany only
- No insert/update/delete/migrate/truncate/drop

Run from dispatch-backend:
  npm run migration:call24:dry-run

MySQL connection defaults:
  database: ${MYSQL_DATABASE}
  cli: mysql

Useful env options:
  CALL24_MYSQL_DATABASE=call24_import
  CALL24_MYSQL_HOST=127.0.0.1
  CALL24_MYSQL_PORT=3306
  CALL24_MYSQL_USER=readonly_user
  CALL24_MYSQL_PASSWORD=...
  CALL24_MYSQL_SOCKET=/var/run/mysqld/mysqld.sock

If the restored DB is only readable through sudo mysql:
  CALL24_MYSQL_USE_SUDO=1 npm run migration:call24:dry-run

Optional raw CLI override:
  CALL24_MYSQL_CLI=mysql
  CALL24_MYSQL_ARGS="--protocol=socket --socket=/var/run/mysqld/mysqld.sock"
`);
}

function splitArgs(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) => arg.replace(/^"|"$/g, "")) || [];
}

function mysqlCommand() {
  const baseCli = process.env.CALL24_MYSQL_CLI || "mysql";
  const baseArgs = [
    "--batch",
    "--raw",
    "--skip-column-names",
    "--default-character-set=utf8mb4",
    `--database=${MYSQL_DATABASE}`,
  ];

  if (process.env.CALL24_MYSQL_HOST) {
    baseArgs.push(`--host=${process.env.CALL24_MYSQL_HOST}`);
  }
  if (process.env.CALL24_MYSQL_PORT) {
    baseArgs.push(`--port=${process.env.CALL24_MYSQL_PORT}`);
  }
  if (process.env.CALL24_MYSQL_USER) {
    baseArgs.push(`--user=${process.env.CALL24_MYSQL_USER}`);
  }
  if (process.env.CALL24_MYSQL_SOCKET) {
    baseArgs.push(`--socket=${process.env.CALL24_MYSQL_SOCKET}`);
  }

  baseArgs.push(...splitArgs(process.env.CALL24_MYSQL_ARGS));

  if (process.env.CALL24_MYSQL_USE_SUDO === "1") {
    return { cli: "sudo", args: [baseCli, ...baseArgs] };
  }

  return { cli: baseCli, args: baseArgs };
}

function runMysql(sql: string): string {
  const { cli, args } = mysqlCommand();
  const env = {
    ...process.env,
    MYSQL_PWD: process.env.CALL24_MYSQL_PASSWORD || process.env.MYSQL_PWD || "",
  };
  const result = spawnSync(cli, args, {
    input: sql,
    encoding: "utf8",
    env,
    maxBuffer: 1024 * 1024 * 200,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`mysql command failed (${result.status}): ${result.stderr.trim()}`);
  }

  return result.stdout;
}

function mysqlJsonRows(sql: string): JsonRow[] {
  const stdout = runMysql(sql);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JsonRow);
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

function escapeSqlString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function jsonSelect(table: string, fields: string[], where = ""): string {
  const columns = tableColumns(table);
  const jsonPairs = fields.flatMap((field) => {
    const expression = columns.has(field) ? quoteIdentifier(field) : "NULL";
    return [escapeSqlString(field), expression];
  });
  return `SELECT JSON_OBJECT(${jsonPairs.join(", ")}) FROM ${quoteIdentifier(table)} ${where};`;
}

function tableColumns(table: string): Set<string> {
  const cached = tableColumnsCache.get(table);
  if (cached) {
    return cached;
  }

  const rows = mysqlJsonRows(
    [
      "SELECT JSON_OBJECT('Field', COLUMN_NAME)",
      "FROM INFORMATION_SCHEMA.COLUMNS",
      "WHERE TABLE_SCHEMA = DATABASE()",
      `AND TABLE_NAME = ${escapeSqlString(table)};`,
    ].join(" "),
  );
  const columns = new Set(rows.map((row) => cleanString(row.Field)).filter(Boolean));
  tableColumnsCache.set(table, columns);
  return columns;
}

function hasColumn(table: string, column: string): boolean {
  return tableColumns(table).has(column);
}

function deleteNWhere(table: string): string {
  return hasColumn(table, "delete_yn") ? "WHERE delete_yn = 'N'" : "";
}

function countSql(table: string, where = ""): number {
  const rows = mysqlJsonRows(
    `SELECT JSON_OBJECT('count', COUNT(*)) FROM ${quoteIdentifier(table)} ${where};`,
  );
  return Number(rows[0]?.count || 0);
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function normalizeEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function normalizeText(value: unknown): string {
  return cleanString(value).replace(/\s+/g, " ");
}

function joinAddress(...parts: unknown[]): string {
  return parts.map(cleanString).filter(Boolean).join(" ");
}

function booleanLikeYes(value: unknown): boolean {
  const text = normalizeText(value).toUpperCase();
  return ["Y", "YES", "TRUE", "1", "긴급", "왕복", "혼적"].some((token) => text.includes(token));
}

function parseNumber(value: unknown): { value: number | null; failed: boolean } {
  const text = cleanString(value);
  if (!text) {
    return { value: null, failed: false };
  }
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) {
    return { value: null, failed: true };
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? { value: parsed, failed: false } : { value: null, failed: true };
}

function parseMoney(value: unknown): { value: number | null; failed: boolean } {
  const parsed = parseNumber(value);
  if (parsed.value === null || parsed.failed) {
    return parsed;
  }
  return { value: Math.round(parsed.value), failed: false };
}

function normalizeDateText(value: unknown): string {
  const text = cleanString(value);
  if (!text) {
    return "";
  }
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return text.replace(" ", "T").replace(/\.\d+$/, "");
}

function parseDate(value: unknown): { value: Date | null; failed: boolean } {
  const text = normalizeDateText(value);
  if (!text) {
    return { value: null, failed: false };
  }
  const date = new Date(text.includes("T") ? text : `${text}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? { value: null, failed: true } : { value: date, failed: false };
}

function parsePlannedDate(dateValue: unknown, hourValue: unknown, minuteValue: unknown): {
  value: Date | null;
  failed: boolean;
} {
  const dateText = normalizeDateText(dateValue);
  if (!dateText) {
    return { value: null, failed: false };
  }

  const datePart = dateText.split("T")[0];
  const hourText = cleanString(hourValue) || "00";
  const minuteText = cleanString(minuteValue) || "00";
  const hour = hourText.padStart(2, "0");
  const minute = minuteText.padStart(2, "0");
  const date = new Date(`${datePart}T${hour}:${minute}:00+09:00`);
  return Number.isNaN(date.getTime()) ? { value: null, failed: true } : { value: date, failed: false };
}

function dateKey(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 16);
}

function mapStatus(value: unknown): { value: string; failed: boolean } {
  const text = cleanString(value);
  if (!text) {
    return { value: "PENDING", failed: false };
  }
  const map: Record<string, string> = {
    완료: "ASSIGNED",
    배차완료: "ASSIGNED",
    화물접수: "PENDING",
    배차신청: "DISPATCHING",
    배차취소: "CANCELLED",
    화물취소: "CANCELLED",
  };
  return map[text] ? { value: map[text], failed: false } : { value: "PENDING", failed: true };
}

function mapLoadMethod(value: unknown): { value: string; failed: boolean } {
  const text = cleanString(value);
  if (!text || text === "기타") {
    return { value: "SUDOU_SUHAEJUNG", failed: false };
  }
  if (text.includes("지게차")) {
    return { value: "FORKLIFT", failed: false };
  }
  if (text.includes("수작업")) {
    return { value: "MANUAL", failed: false };
  }
  if (text.includes("호이스트")) {
    return { value: "HOIST", failed: false };
  }
  if (text.includes("크레인")) {
    return { value: "CRANE", failed: false };
  }
  if (text.includes("컨베이어")) {
    return { value: "CONVEYOR", failed: false };
  }
  return { value: "SUDOU_SUHAEJUNG", failed: true };
}

function mapPaymentMethod(value: unknown): { value: string; failed: boolean } {
  const text = cleanString(value);
  if (!text || text.includes("인수증") || text.includes("신용")) {
    return { value: "CREDIT", failed: false };
  }
  if (text.includes("카드")) {
    return { value: "CARD", failed: false };
  }
  if (text.includes("선착불") || text.includes("착불")) {
    return { value: "CASH_COLLECT", failed: false };
  }
  if (text.includes("선불")) {
    return { value: "CASH_PREPAID", failed: false };
  }
  return { value: "CREDIT", failed: true };
}

function mapRequestType(order: SourceOrder): { value: string; failed: boolean } {
  const text = [
    cleanString(order.multiCargoGub),
    cleanString(order.urgent),
    cleanString(order.shuttleCargoInfo),
  ].join(" ");

  if (booleanLikeYes(order.urgent) || text.includes("긴급")) {
    return { value: "URGENT", failed: false };
  }
  if (booleanLikeYes(order.multiCargoGub) || text.includes("혼적")) {
    return { value: "DIRECT", failed: false };
  }
  if (text.includes("왕복")) {
    return { value: "ROUND_TRIP", failed: false };
  }
  return { value: "NORMAL", failed: false };
}

function mapVehicleGroup(order: SourceOrder): { value: string; failed: boolean } {
  const text = `${cleanString(order.truckType)} ${cleanString(order.cjTruckType)}`;
  if (text.includes("오토") || text.includes("바이크")) {
    return { value: "MOTORCYCLE", failed: false };
  }
  if (text.includes("다마스")) {
    return { value: "DAMAS", failed: false };
  }
  if (text.includes("라보")) {
    return { value: "LABO", failed: false };
  }
  return { value: "ONE_TON_PLUS", failed: false };
}

function addressTypeFromStartEnd(value: unknown): { value: string; failed: boolean } {
  const text = cleanString(value).toLowerCase();
  if (text === "start") {
    return { value: "PICKUP", failed: false };
  }
  if (text === "end") {
    return { value: "DROPOFF", failed: false };
  }
  return { value: "BOTH", failed: Boolean(text) };
}

function addressDuplicateKey(row: {
  email: string;
  type: string;
  placeName: string;
  address: string;
  addressDetail: string;
}) {
  return [
    row.email,
    row.type,
    normalizeText(row.placeName),
    normalizeText(row.address),
    normalizeText(row.addressDetail),
  ].join("|");
}

function requestDuplicateKey(row: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: Date | null;
  cargoDescription: string;
}) {
  return [
    normalizeText(row.pickupAddress),
    normalizeText(row.dropoffAddress),
    dateKey(row.pickupDatetime),
    normalizeText(row.cargoDescription),
  ].join("|");
}

function driverKey(vehicleNumber: unknown, phone: unknown): string {
  const vehicle = normalizeText(vehicleNumber);
  const digits = cleanString(phone).replace(/\D/g, "");
  return `${vehicle}|${digits}`;
}

function printSection(title: string, rows: Record<string, unknown>) {
  console.log(`\n## ${title}`);
  for (const [key, value] of Object.entries(rows)) {
    console.log(`- ${key}: ${value}`);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  console.log("Call24 migration dry-run started.");
  console.log("Mode: read-only / no writes / images excluded from phase 1.");

  const sourceCounts = {
    userGroupTarget: countSql("user_group"),
    userTarget: countSql("user"),
    userAddressTarget: countSql("user_address", deleteNWhere("user_address")),
    userBookmarkTarget: countSql("user_bookmark", deleteNWhere("user_bookmark")),
    cargoOrderTarget: countSql("cargo_order", deleteNWhere("cargo_order")),
    imagePhase2Target:
      hasColumn("cargo_order_receipt_image", "receipt_image")
        ? countSql(
            "cargo_order_receipt_image",
            `${deleteNWhere("cargo_order_receipt_image") || "WHERE"} ${
              deleteNWhere("cargo_order_receipt_image") ? "AND" : ""
            } receipt_image IS NOT NULL`,
          )
        : 0,
  };

  const targetCounts = {
    CompanyName: await prisma.companyName.count(),
    User: await prisma.user.count(),
    AddressBook: await prisma.addressBook.count(),
    Request: await prisma.request.count(),
    Driver: await prisma.driver.count(),
    RequestDriverAssignment: await prisma.requestDriverAssignment.count(),
  };

  const [
    existingCompanies,
    existingUsers,
    existingAddressBooks,
    existingRequests,
    existingDrivers,
    requestRange,
  ] = await Promise.all([
    prisma.companyName.findMany({ select: { name: true } }),
    prisma.user.findMany({ select: { email: true, name: true, passwordHash: true, role: true, companyName: true } }),
    prisma.addressBook.findMany({
      select: {
        type: true,
        placeName: true,
        address: true,
        addressDetail: true,
        user: { select: { email: true } },
      },
    }),
    prisma.request.findMany({
      select: {
        orderNumber: true,
        call24OrdNo: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupDatetime: true,
        cargoDescription: true,
        createdAt: true,
      },
    }),
    prisma.driver.findMany({ select: { phone: true, vehicleNumber: true } }),
    prisma.request.aggregate({ _min: { createdAt: true }, _max: { createdAt: true } }),
  ]);

  const existingCompanyNames = new Set(existingCompanies.map((company) => normalizeText(company.name)));
  const existingUserByEmail = new Map(existingUsers.map((user) => [normalizeEmail(user.email), user]));
  const existingAddressKeys = new Set(
    existingAddressBooks.map((book) =>
      addressDuplicateKey({
        email: normalizeEmail(book.user.email),
        type: book.type,
        placeName: book.placeName,
        address: book.address,
        addressDetail: book.addressDetail || "",
      }),
    ),
  );
  const existingOrdNos = new Set<string>();
  const existingRequestKeys = new Set<string>();
  existingRequests.forEach((request) => {
    if (request.orderNumber) {
      existingOrdNos.add(normalizeText(request.orderNumber));
    }
    if (request.call24OrdNo) {
      existingOrdNos.add(normalizeText(request.call24OrdNo));
    }
    existingRequestKeys.add(
      requestDuplicateKey({
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress,
        pickupDatetime: request.pickupDatetime,
        cargoDescription: request.cargoDescription || "",
      }),
    );
  });
  const existingDriverKeys = new Set(existingDrivers.map((driver) => driverKey(driver.vehicleNumber, driver.phone)));

  const sourceGroups = mysqlJsonRows(jsonSelect("user_group", ["name"]));
  const sourceUsers = mysqlJsonRows(
    jsonSelect("user", ["email", "name", "password", "auth_code", "delete_yn", "group_code"]),
  ) as SourceUser[];
  const sourceAddresses = mysqlJsonRows(
    jsonSelect(
      "user_address",
      ["email", "startEnd", "wide", "sgg", "dong", "detail", "baseYn", "companyName", "placeName", "name", "bookmarkName"],
      deleteNWhere("user_address"),
    ),
  ) as SourceAddress[];
  const sourceBookmarks = mysqlJsonRows(
    jsonSelect("user_bookmark", ["email", "bookmarkName", "wide", "sgg", "dong", "detail", "areaPhone", "delete_yn"], deleteNWhere("user_bookmark")),
  ) as SourceBookmark[];
  const sourceOrders = mysqlJsonRows(
    jsonSelect(
      "cargo_order",
      [
        "cargo_seq",
        "ordNo",
        "ordStatus",
        "startCompanyName",
        "startWide",
        "startSgg",
        "startDong",
        "startDetail",
        "startAreaPhone",
        "startPlanDt",
        "startPlanHour",
        "startPlanMinute",
        "endCompanyName",
        "endWide",
        "endSgg",
        "endDong",
        "endDetail",
        "endAreaPhone",
        "endPlanDt",
        "endPlanHour",
        "endPlanMinute",
        "startLoad",
        "endLoad",
        "cargoTon",
        "truckType",
        "cjTruckType",
        "cargoDsc",
        "farePaytype",
        "fare",
        "fareView",
        "create_user",
        "create_dtm",
        "change_dtm",
        "multiCargoGub",
        "urgent",
        "shuttleCargoInfo",
        "cjName",
        "cjPhone",
        "cjCarNum",
        "cjCargoTon",
        "addFare",
        "addFareReason",
        "adminMemo",
        "userMemo",
      ],
      deleteNWhere("cargo_order"),
    ),
  ) as SourceOrder[];

  const companyNamesFromGroups = new Set(
    sourceGroups.map((group) => normalizeText(group.name)).filter(Boolean),
  );
  const companyCreatePlanned = [...companyNamesFromGroups].filter((name) => !existingCompanyNames.has(name)).length;
  const companyReuse = companyNamesFromGroups.size - companyCreatePlanned;

  const sourceUserEmails = new Set<string>();
  const sourceUserDuplicateEmails = new Set<string>();
  let userCreatePlanned = 0;
  let userReuse = 0;
  let userConflicts = 0;
  let userInactivePlanned = 0;
  let userInvalidEmail = 0;

  for (const user of sourceUsers) {
    const email = normalizeEmail(user.email);
    if (!email) {
      userInvalidEmail += 1;
      continue;
    }
    if (sourceUserEmails.has(email)) {
      sourceUserDuplicateEmails.add(email);
    }
    sourceUserEmails.add(email);

    const authCode = cleanString(user.auth_code).toUpperCase();
    const deleteYn = cleanString(user.delete_yn).toUpperCase();
    if (authCode === "APPLY" || deleteYn === "Y") {
      userInactivePlanned += 1;
    }

    const existing = existingUserByEmail.get(email);
    if (!existing) {
      userCreatePlanned += 1;
      continue;
    }

    userReuse += 1;
    const expectedRole = authCode === "ADMIN" ? "ADMIN" : "CLIENT";
    const expectedCompany = cleanString(user.group_code);
    const sourcePassword = cleanString(user.password);
    if (
      existing.role !== expectedRole ||
      (expectedCompany && normalizeText(existing.companyName) !== expectedCompany) ||
      (sourcePassword && existing.passwordHash !== sourcePassword)
    ) {
      userConflicts += 1;
    }
  }

  const knownUserEmails = new Set([...existingUserByEmail.keys(), ...sourceUserEmails]);
  const sourceAddressKeys = new Set<string>();
  let addressCreatePlanned = 0;
  let addressDuplicateExpected = 0;
  let addressUserMappingFailures = 0;

  for (const row of sourceAddresses) {
    const email = normalizeEmail(row.email);
    if (!email || !knownUserEmails.has(email)) {
      addressUserMappingFailures += 1;
      continue;
    }
    const type = addressTypeFromStartEnd(row.startEnd).value;
    const address = joinAddress(row.wide, row.sgg, row.dong);
    const placeName =
      cleanString(row.placeName) ||
      cleanString(row.bookmarkName) ||
      cleanString(row.companyName) ||
      cleanString(row.name) ||
      cleanString(row.detail) ||
      address ||
      "주소록";
    const key = addressDuplicateKey({
      email,
      type,
      placeName,
      address,
      addressDetail: cleanString(row.detail),
    });
    if (existingAddressKeys.has(key) || sourceAddressKeys.has(key)) {
      addressDuplicateExpected += 1;
    } else {
      addressCreatePlanned += 1;
    }
    sourceAddressKeys.add(key);
  }

  let bookmarkCreatePlanned = 0;
  let bookmarkDuplicateExpected = 0;
  let bookmarkUserMappingFailures = 0;
  let bookmarkMissingPlaceName = 0;

  for (const row of sourceBookmarks) {
    const email = normalizeEmail(row.email);
    if (!email || !knownUserEmails.has(email)) {
      bookmarkUserMappingFailures += 1;
      continue;
    }
    const placeName = cleanString(row.bookmarkName);
    if (!placeName) {
      bookmarkMissingPlaceName += 1;
      continue;
    }
    const key = addressDuplicateKey({
      email,
      type: "BOTH",
      placeName,
      address: joinAddress(row.wide, row.sgg, row.dong),
      addressDetail: cleanString(row.detail),
    });
    if (existingAddressKeys.has(key) || sourceAddressKeys.has(key)) {
      bookmarkDuplicateExpected += 1;
    } else {
      bookmarkCreatePlanned += 1;
    }
    sourceAddressKeys.add(key);
  }

  const warnings: WarningCounts = {
    statusMappingFailures: 0,
    loadMethodMappingFailures: 0,
    paymentMethodMappingFailures: 0,
    requestTypeMappingFailures: 0,
    vehicleGroupMappingFailures: 0,
    dateParsingFailures: 0,
    tonnageParsingFailures: 0,
    fareParsingFailures: 0,
  };

  let createdByMappingFailures = 0;
  let emptyCreatedBy = 0;
  let oldAfterOverlapStart = 0;
  let oldInTargetDateRange = 0;
  let ordNoDuplicateSuspicious = 0;
  let addressDateCargoDuplicateSuspicious = 0;
  let duplicateSkipCandidates = 0;
  let driverRowsWithAnyData = 0;
  let invalidDriverData = 0;
  let assignmentPlanned = 0;
  const sourceDriverKeys = new Set<string>();
  const sourceDriverCreateKeys = new Set<string>();
  const sourceDriverReuseKeys = new Set<string>();

  const targetMinCreatedAt = requestRange._min.createdAt;
  const targetMaxCreatedAt = requestRange._max.createdAt;

  for (const order of sourceOrders) {
    const status = mapStatus(order.ordStatus);
    if (status.failed) {
      warnings.statusMappingFailures += 1;
    }

    const pickupLoad = mapLoadMethod(order.startLoad);
    const dropoffLoad = mapLoadMethod(order.endLoad);
    if (pickupLoad.failed) {
      warnings.loadMethodMappingFailures += 1;
    }
    if (dropoffLoad.failed) {
      warnings.loadMethodMappingFailures += 1;
    }

    const payment = mapPaymentMethod(order.farePaytype);
    if (payment.failed) {
      warnings.paymentMethodMappingFailures += 1;
    }

    const requestType = mapRequestType(order);
    if (requestType.failed) {
      warnings.requestTypeMappingFailures += 1;
    }

    const vehicleGroup = mapVehicleGroup(order);
    if (vehicleGroup.failed) {
      warnings.vehicleGroupMappingFailures += 1;
    }

    const pickupDatetime = parsePlannedDate(order.startPlanDt, order.startPlanHour, order.startPlanMinute);
    const dropoffDatetime = parsePlannedDate(order.endPlanDt, order.endPlanHour, order.endPlanMinute);
    const createdAt = parseDate(order.create_dtm);
    const updatedAt = parseDate(order.change_dtm);
    if (pickupDatetime.failed || dropoffDatetime.failed || createdAt.failed || updatedAt.failed) {
      warnings.dateParsingFailures += Number(pickupDatetime.failed) + Number(dropoffDatetime.failed) + Number(createdAt.failed) + Number(updatedAt.failed);
    }

    const cargoTonnage = parseNumber(order.cargoTon);
    const driverTonnage = parseNumber(order.cjCargoTon);
    if (cargoTonnage.failed || driverTonnage.failed) {
      warnings.tonnageParsingFailures += Number(cargoTonnage.failed) + Number(driverTonnage.failed);
    }

    const fare = parseMoney(order.fare);
    const fareView = parseMoney(order.fareView);
    const addFare = parseMoney(order.addFare);
    if (fare.failed || fareView.failed || addFare.failed) {
      warnings.fareParsingFailures += Number(fare.failed) + Number(fareView.failed) + Number(addFare.failed);
    }

    const createdByEmail = normalizeEmail(order.create_user);
    if (!createdByEmail) {
      emptyCreatedBy += 1;
    } else if (!knownUserEmails.has(createdByEmail)) {
      createdByMappingFailures += 1;
    }

    if (createdAt.value && createdAt.value >= OVERLAP_START) {
      oldAfterOverlapStart += 1;
    }
    if (
      createdAt.value &&
      targetMinCreatedAt &&
      targetMaxCreatedAt &&
      createdAt.value >= targetMinCreatedAt &&
      createdAt.value <= targetMaxCreatedAt
    ) {
      oldInTargetDateRange += 1;
    }

    const ordNo = normalizeText(order.ordNo);
    const ordNoDup = Boolean(ordNo && existingOrdNos.has(ordNo));
    if (ordNoDup) {
      ordNoDuplicateSuspicious += 1;
    }

    const requestKey = requestDuplicateKey({
      pickupAddress: joinAddress(order.startWide, order.startSgg, order.startDong),
      dropoffAddress: joinAddress(order.endWide, order.endSgg, order.endDong),
      pickupDatetime: pickupDatetime.value,
      cargoDescription: cleanString(order.cargoDsc),
    });
    const requestKeyDup = existingRequestKeys.has(requestKey);
    if (requestKeyDup) {
      addressDateCargoDuplicateSuspicious += 1;
    }
    const duplicateCandidate = ordNoDup || requestKeyDup;
    if (duplicateCandidate) {
      duplicateSkipCandidates += 1;
    }

    const hasAnyDriverData = Boolean(
      cleanString(order.cjName) ||
        cleanString(order.cjPhone) ||
        cleanString(order.cjCarNum) ||
        cleanString(order.cjCargoTon) ||
        cleanString(order.cjTruckType),
    );
    if (!hasAnyDriverData) {
      continue;
    }

    driverRowsWithAnyData += 1;
    const name = cleanString(order.cjName);
    const phone = cleanString(order.cjPhone);
    if (!name || !phone) {
      invalidDriverData += 1;
      continue;
    }

    const key = driverKey(order.cjCarNum, order.cjPhone);
    sourceDriverKeys.add(key);
    if (existingDriverKeys.has(key)) {
      sourceDriverReuseKeys.add(key);
    } else {
      sourceDriverCreateKeys.add(key);
    }
    if (!duplicateCandidate) {
      assignmentPlanned += 1;
    }
  }

  printSection("source counts", sourceCounts);
  printSection("target existing counts", targetCounts);
  printSection("planned changes", {
    "CompanyName create planned": companyCreatePlanned,
    "CompanyName existing reuse": companyReuse,
    "User create planned": userCreatePlanned,
    "User existing reuse": userReuse,
    "User conflict candidates": userConflicts,
    "User inactive planned": userInactivePlanned,
    "User invalid email rows": userInvalidEmail,
    "User source duplicate email rows": sourceUserDuplicateEmails.size,
    "AddressBook from user_address create planned": addressCreatePlanned,
    "AddressBook from user_address duplicate expected": addressDuplicateExpected,
    "AddressBook from user_address user mapping failures": addressUserMappingFailures,
    "AddressBook from user_bookmark create planned": bookmarkCreatePlanned,
    "AddressBook from user_bookmark duplicate expected": bookmarkDuplicateExpected,
    "AddressBook from user_bookmark user mapping failures": bookmarkUserMappingFailures,
    "AddressBook from user_bookmark placeName missing": bookmarkMissingPlaceName,
    "Request create planned after duplicate candidates": sourceOrders.length - duplicateSkipCandidates,
    "Request duplicate suspicious skip candidates": duplicateSkipCandidates,
    "Request createdBy mapping failures": createdByMappingFailures,
    "Request empty createdBy": emptyCreatedBy,
    "Driver rows with any cj data": driverRowsWithAnyData,
    "Driver create planned unique keys": sourceDriverCreateKeys.size,
    "Driver existing reuse candidate unique keys": sourceDriverReuseKeys.size,
    "Driver invalid data": invalidDriverData,
    "Assignment create planned": assignmentPlanned,
    "Image phase 2 target": sourceCounts.imagePhase2Target,
  });
  printSection("conversion warnings", warnings);
  printSection("overlap report", {
    "old cargo_order create_dtm >= 2026-04-29": oldAfterOverlapStart,
    "old cargo_order inside current request createdAt range": oldInTargetDateRange,
    "orderNumber/call24OrdNo duplicate suspicious": ordNoDuplicateSuspicious,
    "address+date+cargo duplicate suspicious": addressDateCargoDuplicateSuspicious,
    "target request min createdAt": targetMinCreatedAt?.toISOString() || "-",
    "target request max createdAt": targetMaxCreatedAt?.toISOString() || "-",
  });
  printSection("phase 1 exclusions / notes", {
    "Images": "excluded; cargo_order_receipt_image BLOB count is reported for phase 2 only",
    "vehicleinfo": "excluded; confirmed no reliable cargo_order relation in phase 1",
    "old cargo_seq mapping": "required for real migration; use a separate MigrationMap/internal mapping in insert phase",
    "PostgreSQL writes": "not performed",
  });

  console.log("\nDry-run finished. No database rows were inserted, updated, or deleted.");
}

main()
  .catch((error) => {
    console.error("Dry-run failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
