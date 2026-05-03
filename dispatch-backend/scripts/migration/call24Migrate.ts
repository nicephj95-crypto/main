import bcrypt from "bcrypt";
import {
  HOLDING_USER_COMPANY,
  HOLDING_USER_EMAIL,
  HOLDING_USER_NAME,
  SourceAddress,
  SourceBookmark,
  SourceGroup,
  SourceOrder,
  SourceUser,
  addressDuplicateKey,
  addressTypeFromStartEnd,
  buildAddressPlaceName,
  buildGroupNameByCode,
  buildUnmappedAddressMemo,
  cleanString,
  companyNameForUser,
  dateKey,
  deleteNWhere,
  driverKey,
  jsonSelect,
  joinAddress,
  loadCall24RequestMigrationMap,
  main as runDryRun,
  mapLoadMethod,
  mapPaymentMethod,
  mapRequestType,
  mapStatus,
  mapVehicleGroup,
  mysqlJsonRows,
  normalizeEmail,
  normalizeText,
  parseDate,
  parseMoney,
  parseNumber,
  parsePlannedDate,
  printSection,
  prisma,
  requestDuplicateKey,
} from "./call24DryRun";

type CliOptions = {
  execute: boolean;
  limit?: number;
  help: boolean;
};

type TargetUser = {
  id: number;
  email: string;
};

type TargetRequest = {
  id: number;
  orderNumber: string | null;
  call24OrdNo: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: Date | null;
  cargoDescription: string | null;
};

type Counters = Record<string, number>;

const SOURCE_SYSTEM = "call24";
const MIGRATION_MAP_TABLE = "_migration_map";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { execute: false, help: false };
  for (const arg of argv) {
    if (arg === "--execute") {
      options.execute = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--limit must be a positive integer.");
      }
      options.limit = value;
      continue;
    }
  }
  return options;
}

function usage() {
  console.log(`
Call24 migration writer

Default mode is NO-WRITE. Without --execute this runs the dry-run report only.

Dry-run:
  npm run migration:call24
  npm run migration:call24 -- --limit=10

Limited execute:
  CALL24_UNMAPPED_USER_PASSWORD='...' npm run migration:call24 -- --execute --limit=10

Full execute:
  CALL24_UNMAPPED_USER_PASSWORD='...' npm run migration:call24 -- --execute

Safety:
- No Prisma create/update/upsert is called unless --execute is present.
- Images and cargo_order_receipt_image BLOBs are excluded.
- Existing Users are reused and never overwritten.
- Existing production data is preserved; duplicate Request candidates are skipped.
`);
}

function applyLimit<T>(rows: T[], limit?: number): T[] {
  return limit ? rows.slice(0, limit) : rows;
}

function requireExecute(options: CliOptions, action: string) {
  if (!options.execute) {
    throw new Error(`Refusing write without --execute: ${action}`);
  }
}

async function ensureMigrationMapTable(options: CliOptions) {
  requireExecute(options, "create migration map table");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${MIGRATION_MAP_TABLE}" (
      "sourceSystem" TEXT NOT NULL,
      "sourceTable" TEXT NOT NULL,
      "sourceId" TEXT NOT NULL,
      "targetTable" TEXT NOT NULL,
      "targetId" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("sourceSystem", "sourceTable", "sourceId", "targetTable")
    );
  `);
}

async function saveMigrationMap(options: CliOptions, sourceId: string, targetId: number) {
  requireExecute(options, "insert migration map");
  await prisma.$executeRaw`
    INSERT INTO "_migration_map"
      ("sourceSystem", "sourceTable", "sourceId", "targetTable", "targetId")
    VALUES
      (${SOURCE_SYSTEM}, ${"cargo_order"}, ${sourceId}, ${"Request"}, ${targetId})
    ON CONFLICT ("sourceSystem", "sourceTable", "sourceId", "targetTable")
    DO NOTHING;
  `;
}

function sourceRows(limit?: number) {
  const groups = applyLimit(
    mysqlJsonRows(jsonSelect("user_group", ["id", "code", "group_code", "name"])) as SourceGroup[],
    limit,
  );
  const users = applyLimit(
    mysqlJsonRows(jsonSelect("user", ["email", "name", "password", "auth_code", "delete_yn", "group_code"])) as SourceUser[],
    limit,
  );
  const addresses = applyLimit(
    mysqlJsonRows(
      jsonSelect(
        "user_address",
        [
          "email",
          "startEnd",
          "wide",
          "sgg",
          "dong",
          "detail",
          "baseYn",
          "companyName",
          "placeName",
          "name",
          "bookmarkName",
        ],
        deleteNWhere("user_address"),
      ),
    ) as SourceAddress[],
    limit,
  );
  const bookmarks = applyLimit(
    mysqlJsonRows(
      jsonSelect(
        "user_bookmark",
        ["email", "bookmarkName", "wide", "sgg", "dong", "detail", "areaPhone", "delete_yn"],
        deleteNWhere("user_bookmark"),
      ),
    ) as SourceBookmark[],
    limit,
  );
  const orders = applyLimit(
    mysqlJsonRows(
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
    ) as SourceOrder[],
    limit,
  );

  return { groups, users, addresses, bookmarks, orders };
}

async function loadTargetState(migratedTargetIds = new Set<number>()) {
  const [users, addressBooks, requests, drivers] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true } }),
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
        id: true,
        orderNumber: true,
        call24OrdNo: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupDatetime: true,
        cargoDescription: true,
      },
    }) as Promise<TargetRequest[]>,
    prisma.driver.findMany({ select: { id: true, phone: true, vehicleNumber: true } }),
  ]);

  const userByEmail = new Map(users.map((user: TargetUser) => [normalizeEmail(user.email), user]));
  const addressKeys = new Set(
    addressBooks.map((book) =>
      addressDuplicateKey({
        email: normalizeEmail(book.user.email),
        type: book.type,
        placeName: book.placeName,
        address: book.address,
        addressDetail: book.addressDetail || "",
      }),
    ),
  );
  const ordNos = new Set<string>();
  const requestKeys = new Set<string>();
  const nonMigratedRequests = requests.filter((request) => !migratedTargetIds.has(request.id));
  nonMigratedRequests.forEach((request) => {
    if (request.orderNumber) {
      ordNos.add(normalizeText(request.orderNumber));
    }
    if (request.call24OrdNo) {
      ordNos.add(normalizeText(request.call24OrdNo));
    }
    requestKeys.add(
      requestDuplicateKey({
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress,
        pickupDatetime: request.pickupDatetime,
        cargoDescription: request.cargoDescription || "",
      }),
    );
  });
  const driverKeys = new Map(drivers.map((driver) => [driverKey(driver.vehicleNumber, driver.phone), driver.id]));

  return { userByEmail, addressKeys, ordNos, requestKeys, driverKeys };
}

function mapUserRole(authCode: unknown): "ADMIN" | "CLIENT" {
  return cleanString(authCode).toUpperCase() === "ADMIN" ? "ADMIN" : "CLIENT";
}

function isUserActive(user: SourceUser): boolean {
  const authCode = cleanString(user.auth_code).toUpperCase();
  const deleteYn = cleanString(user.delete_yn).toUpperCase();
  return authCode !== "APPLY" && deleteYn !== "Y";
}

function sourcePasswordHash(user: SourceUser): string {
  const value = cleanString(user.password);
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)) {
    throw new Error("Source user password is not a bcrypt hash; refusing to create migrated User.");
  }
  return value;
}

function moneyValue(value: unknown): number | undefined {
  const parsed = parseMoney(value);
  return parsed.value ?? undefined;
}

function tonnageValue(value: unknown): number | undefined {
  const parsed = parseNumber(value);
  return parsed.value ?? undefined;
}

function parsedDateValue(value: unknown): Date | undefined {
  return parseDate(value).value ?? undefined;
}

function plannedDateValue(date: unknown, hour: unknown, minute: unknown): Date | undefined {
  return parsePlannedDate(date, hour, minute).value ?? undefined;
}

function orderCargoSeq(order: SourceOrder): string {
  return cleanString(order.cargo_seq);
}

function orderDuplicateKey(order: SourceOrder) {
  return requestDuplicateKey({
    pickupAddress: joinAddress(order.startWide, order.startSgg, order.startDong),
    dropoffAddress: joinAddress(order.endWide, order.endSgg, order.endDong),
    pickupDatetime: parsePlannedDate(order.startPlanDt, order.startPlanHour, order.startPlanMinute).value,
    cargoDescription: cleanString(order.cargoDsc),
  });
}

function hasAnyDriverData(order: SourceOrder): boolean {
  return Boolean(
    cleanString(order.cjName) ||
      cleanString(order.cjPhone) ||
      cleanString(order.cjCarNum) ||
      cleanString(order.cjCargoTon) ||
      cleanString(order.cjTruckType),
  );
}

async function migrate(options: CliOptions) {
  if (!options.execute) {
    console.log("NO-WRITE mode: --execute not provided. Running dry-run report only.");
    if (options.limit) {
      console.log(`Note: --limit=${options.limit} is only applied by the writer path. Dry-run report remains full-source.`);
    }
    await runDryRun();
    return;
  }

  const holdingPassword = process.env.CALL24_UNMAPPED_USER_PASSWORD;
  if (!holdingPassword) {
    throw new Error("CALL24_UNMAPPED_USER_PASSWORD is required when --execute is used.");
  }

  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("!! CALL24 MIGRATION EXECUTE MODE");
  console.log("!! Confirm a fresh PostgreSQL backup exists before running.");
  console.log("!! Existing production data will be preserved; duplicate Requests are skipped.");
  console.log("!! Images and receipt BLOBs are excluded.");
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  if (options.limit) {
    console.log(`Limited execute: first ${options.limit} source rows per migration phase.`);
  } else {
    console.log("Full execute requested.");
  }

  requireExecute(options, "migration execute");
  await ensureMigrationMapTable(options);
  const existingMap = await loadCall24RequestMigrationMap();
  const { groups, users, addresses, bookmarks, orders } = sourceRows(options.limit);
  const groupNameByCode = buildGroupNameByCode(groups);
  const counters: Counters = {};
  const inc = (key: string, value = 1) => {
    counters[key] = (counters[key] || 0) + value;
  };

  let target = await loadTargetState(new Set(existingMap.values()));

  for (const group of groups) {
    const name = normalizeText(group.name);
    if (!name) {
      inc("company skipped empty name");
      continue;
    }
    const existing = await prisma.companyName.findUnique({ where: { name }, select: { id: true } });
    if (existing) {
      inc("company reused");
      continue;
    }
    requireExecute(options, "create CompanyName");
    await prisma.companyName.create({ data: { name } });
    inc("company created");
  }

  const holdingPasswordHash = await bcrypt.hash(holdingPassword, 10);
  const holdingUser = await prisma.user.findUnique({
    where: { email: HOLDING_USER_EMAIL },
    select: { id: true, email: true },
  });
  if (!holdingUser) {
    requireExecute(options, "create holding User");
    const createdHoldingUser = await prisma.user.create({
      data: {
        email: HOLDING_USER_EMAIL,
        name: HOLDING_USER_NAME,
        passwordHash: holdingPasswordHash,
        role: "CLIENT",
        companyName: HOLDING_USER_COMPANY,
        isActive: true,
      },
      select: { id: true, email: true },
    });
    target.userByEmail.set(HOLDING_USER_EMAIL, createdHoldingUser);
    inc("holding user created");
  } else {
    target.userByEmail.set(HOLDING_USER_EMAIL, holdingUser);
    inc("holding user reused");
  }

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) {
      inc("user skipped invalid email");
      continue;
    }
    if (target.userByEmail.has(email)) {
      inc("user reused no overwrite");
      continue;
    }
    requireExecute(options, "create User");
    const created = await prisma.user.create({
      data: {
        email,
        name: cleanString(user.name) || email,
        passwordHash: sourcePasswordHash(user),
        role: mapUserRole(user.auth_code),
        companyName: companyNameForUser(user, groupNameByCode) || undefined,
        isActive: isUserActive(user),
      },
      select: { id: true, email: true },
    });
    target.userByEmail.set(email, created);
    inc("user created");
  }

  for (const row of addresses) {
    const sourceEmail = normalizeEmail(row.email);
    const mappedUser = sourceEmail ? target.userByEmail.get(sourceEmail) : undefined;
    const targetEmail = mappedUser ? sourceEmail : HOLDING_USER_EMAIL;
    const targetUser = mappedUser || target.userByEmail.get(HOLDING_USER_EMAIL);
    if (!targetUser) {
      throw new Error("Holding user was not available for unmapped user_address rows.");
    }
    const isUnmapped = !mappedUser;
    const address = joinAddress(row.wide, row.sgg, row.dong);
    const placeName = buildAddressPlaceName(row, isUnmapped ? "미매핑 주소" : "주소록");
    const type = addressTypeFromStartEnd(row.startEnd).value as any;
    const key = addressDuplicateKey({
      email: targetEmail,
      type,
      placeName,
      address,
      addressDetail: cleanString(row.detail),
    });
    if (target.addressKeys.has(key)) {
      inc("user_address duplicate skipped");
      continue;
    }
    requireExecute(options, "create AddressBook from user_address");
    await prisma.addressBook.create({
      data: {
        userId: targetUser.id,
        businessName: isUnmapped ? HOLDING_USER_COMPANY : undefined,
        placeName,
        type,
        address: address || "-",
        addressDetail: cleanString(row.detail) || undefined,
        memo: isUnmapped
          ? buildUnmappedAddressMemo(row)
          : cleanString(row.baseYn)
            ? `oldBaseYn=${cleanString(row.baseYn)}\nsource=user_address`
            : undefined,
      },
    });
    target.addressKeys.add(key);
    inc(isUnmapped ? "user_address holding created" : "user_address created");
  }

  for (const row of bookmarks) {
    const email = normalizeEmail(row.email);
    const targetUser = email ? target.userByEmail.get(email) : undefined;
    if (!targetUser) {
      inc("user_bookmark skipped user mapping failed");
      continue;
    }
    const placeName = cleanString(row.bookmarkName);
    if (!placeName) {
      inc("user_bookmark skipped missing placeName");
      continue;
    }
    const address = joinAddress(row.wide, row.sgg, row.dong);
    const key = addressDuplicateKey({
      email,
      type: "BOTH",
      placeName,
      address,
      addressDetail: cleanString(row.detail),
    });
    if (target.addressKeys.has(key)) {
      inc("user_bookmark duplicate skipped");
      continue;
    }
    requireExecute(options, "create AddressBook from user_bookmark");
    await prisma.addressBook.create({
      data: {
        userId: targetUser.id,
        placeName,
        type: "BOTH",
        address: address || "-",
        addressDetail: cleanString(row.detail) || undefined,
        contactPhone: cleanString(row.areaPhone) || undefined,
      },
    });
    target.addressKeys.add(key);
    inc("user_bookmark created");
  }

  target = await loadTargetState(new Set(existingMap.values()));

  for (const order of orders) {
    const cargoSeq = orderCargoSeq(order);
    if (!cargoSeq) {
      inc("request skipped missing cargo_seq");
      continue;
    }
    if (existingMap.has(cargoSeq)) {
      inc("request skipped already mapped");
      if (hasAnyDriverData(order)) {
        inc("assignment skipped because request already migrated");
        inc("driver skipped/reused due to already migrated request");
      }
      continue;
    }

    const ordNo = normalizeText(order.ordNo);
    const ordNoDuplicate = Boolean(ordNo && target.ordNos.has(ordNo));
    const requestKey = orderDuplicateKey(order);
    const addressDateCargoDuplicate = target.requestKeys.has(requestKey);
    if (ordNoDuplicate || addressDateCargoDuplicate) {
      inc("request duplicate suspicious skipped");
      continue;
    }

    const createdByEmail = normalizeEmail(order.create_user);
    const createdBy = createdByEmail ? target.userByEmail.get(createdByEmail) : undefined;
    if (createdByEmail && !createdBy) {
      inc("request createdBy missing");
    }

    const pickupAddress = joinAddress(order.startWide, order.startSgg, order.startDong);
    const dropoffAddress = joinAddress(order.endWide, order.endSgg, order.endDong);
    requireExecute(options, "create Request");
    const createdRequest = await prisma.request.create({
      data: {
        pickupPlaceName: cleanString(order.startCompanyName) || pickupAddress || "상차지",
        pickupAddress: pickupAddress || "-",
        pickupAddressDetail: cleanString(order.startDetail) || undefined,
        pickupContactPhone: cleanString(order.startAreaPhone) || undefined,
        pickupMethod: mapLoadMethod(order.startLoad).value as any,
        pickupDatetime: plannedDateValue(order.startPlanDt, order.startPlanHour, order.startPlanMinute),
        dropoffPlaceName: cleanString(order.endCompanyName) || dropoffAddress || "하차지",
        dropoffAddress: dropoffAddress || "-",
        dropoffAddressDetail: cleanString(order.endDetail) || undefined,
        dropoffContactPhone: cleanString(order.endAreaPhone) || undefined,
        dropoffMethod: mapLoadMethod(order.endLoad).value as any,
        dropoffDatetime: plannedDateValue(order.endPlanDt, order.endPlanHour, order.endPlanMinute),
        vehicleGroup: mapVehicleGroup(order).value as any,
        vehicleTonnage: tonnageValue(order.cargoTon),
        vehicleBodyType: cleanString(order.truckType) || undefined,
        cargoDescription: cleanString(order.cargoDsc) || undefined,
        requestType: mapRequestType(order).value as any,
        paymentMethod: mapPaymentMethod(order.farePaytype).value as any,
        orderNumber: ordNo || undefined,
        call24OrdNo: ordNo || undefined,
        actualFare: moneyValue(order.fare),
        billingPrice: moneyValue(order.fareView),
        status: mapStatus(order.ordStatus).value as any,
        createdById: createdBy?.id,
        createdAt: parsedDateValue(order.create_dtm),
        updatedAt: parsedDateValue(order.change_dtm),
      } as any,
      select: { id: true },
    });
    await saveMigrationMap(options, cargoSeq, createdRequest.id);
    existingMap.set(cargoSeq, createdRequest.id);
    inc("request created");

    if (!hasAnyDriverData(order)) {
      continue;
    }
    const driverName = cleanString(order.cjName);
    const driverPhone = cleanString(order.cjPhone);
    if (!driverName || !driverPhone) {
      inc("driver invalid skipped");
      continue;
    }

    const key = driverKey(order.cjCarNum, order.cjPhone);
    let driverId = target.driverKeys.get(key);
    if (!driverId) {
      const existingDriver = await prisma.driver.findFirst({
        where: {
          phone: driverPhone,
          vehicleNumber: cleanString(order.cjCarNum) || null,
        },
        select: { id: true },
      });
      if (existingDriver) {
        driverId = existingDriver.id;
        inc("driver reused by query");
      } else {
        requireExecute(options, "create Driver");
        const createdDriver = await prisma.driver.create({
          data: {
            name: driverName,
            phone: driverPhone,
            vehicleNumber: cleanString(order.cjCarNum) || undefined,
            vehicleGroup: mapVehicleGroup({ truckType: order.cjTruckType, cjTruckType: order.cjTruckType }).value as any,
            vehicleTonnage: tonnageValue(order.cjCargoTon),
            vehicleBodyType: cleanString(order.cjTruckType) || undefined,
          },
          select: { id: true },
        });
        driverId = createdDriver.id;
        inc("driver created");
      }
      target.driverKeys.set(key, driverId);
    } else {
      inc("driver reused");
    }

    requireExecute(options, "create RequestDriverAssignment");
    await prisma.requestDriverAssignment.create({
      data: {
        requestId: createdRequest.id,
        driverId,
        isActive: true,
        actualFare: moneyValue(order.fare),
        billingPrice: moneyValue(order.fareView),
        extraFare: moneyValue(order.addFare),
        extraFareReason: cleanString(order.addFareReason) || undefined,
        internalMemo: cleanString(order.adminMemo) || undefined,
        customerMemo: cleanString(order.userMemo) || undefined,
        assignedAt: parsedDateValue(order.change_dtm) || parsedDateValue(order.create_dtm) || new Date(),
      },
    });
    inc("assignment created");
  }

  printSection("migration execute result", counters);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  await migrate(options);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Call24 migration failed.");
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
