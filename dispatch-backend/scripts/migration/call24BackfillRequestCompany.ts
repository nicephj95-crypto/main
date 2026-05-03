import {
  SourceGroup,
  SourceOrder,
  SourceUser,
  buildGroupNameByCode,
  cleanString,
  deleteNWhere,
  jsonSelect,
  loadCall24RequestMigrationMap,
  mysqlJsonRows,
  normalizeEmail,
  normalizeText,
  printSection,
  prisma,
} from "./call24DryRun";

type CliOptions = {
  execute: boolean;
  force: boolean;
  limit?: number;
  companyName?: string;
  help: boolean;
};

type MigratedRequest = {
  id: number;
  ownerCompanyId: number | null;
  targetCompanyName: string | null;
  createdById: number | null;
  createdBy: { companyName: string | null } | null;
};

const SOURCE_SYSTEM = "call24";
const SOURCE_TABLE = "cargo_order";
const TARGET_TABLE = "Request";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { execute: false, force: false, help: false };
  for (const arg of argv) {
    if (arg === "--execute") {
      options.execute = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
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
    if (arg.startsWith("--company=")) {
      const value = arg.slice("--company=".length).trim();
      if (value) {
        options.companyName = value;
      }
      continue;
    }
  }
  return options;
}

function usage() {
  console.log(`
Call24 migrated Request company backfill

Default mode is DRY-RUN / NO-WRITE. Without --execute this script only prints diagnostics.

Dry-run:
  npm run migration:call24:backfill-company
  npm run migration:call24:backfill-company -- --limit=100
  npm run migration:call24:backfill-company -- --company=이안글로벌

Execute:
  npm run migration:call24:backfill-company -- --execute

Force existing owner/target overwrite for migrated requests only:
  npm run migration:call24:backfill-company -- --execute --force

Safety:
- Only _migration_map rows with sourceSystem='${SOURCE_SYSTEM}', sourceTable='${SOURCE_TABLE}', targetTable='${TARGET_TABLE}' are considered.
- Non-migrated Request rows are never updated.
- Without --execute, Prisma update is never called.
- Without --force, existing ownerCompanyId / targetCompanyName values are not overwritten.
`);
}

function requireExecute(options: CliOptions, action: string) {
  if (!options.execute) {
    throw new Error(`Refusing write without --execute: ${action}`);
  }
}

function applyLimit<T>(rows: T[], limit?: number): T[] {
  return limit ? rows.slice(0, limit) : rows;
}

function normalizeCompanyName(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, " ");
}

function buildSourceCompanyByEmail(
  users: SourceUser[],
  groups: SourceGroup[],
): Map<string, string> {
  const groupNameByCode = buildGroupNameByCode(groups);
  const result = new Map<string, string>();

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    const groupCode = normalizeText(user.group_code);
    const companyName = groupNameByCode.get(groupCode) || groupCode;
    if (companyName) {
      result.set(email, companyName);
    }
  }

  return result;
}

function buildSourceCompanyByCargoSeq(): Map<string, string> {
  const groups = mysqlJsonRows(jsonSelect("user_group", ["id", "code", "group_code", "name"])) as SourceGroup[];
  const users = mysqlJsonRows(
    jsonSelect("user", ["email", "group_code", "delete_yn"]),
  ) as SourceUser[];
  const companyByEmail = buildSourceCompanyByEmail(users, groups);
  const orders = mysqlJsonRows(
    jsonSelect("cargo_order", ["cargo_seq", "create_user"], deleteNWhere("cargo_order")),
  ) as SourceOrder[];

  const result = new Map<string, string>();
  for (const order of orders) {
    const cargoSeq = cleanString(order.cargo_seq);
    const createUserEmail = normalizeEmail(order.create_user);
    if (!cargoSeq || !createUserEmail) continue;

    const companyName = companyByEmail.get(createUserEmail);
    if (companyName) {
      result.set(cargoSeq, companyName);
    }
  }

  return result;
}

function topCompanyCounts(companyByCargoSeq: Map<string, string>, sourceIds: string[]) {
  const counts = new Map<string, number>();
  for (const sourceId of sourceIds) {
    const companyName = companyByCargoSeq.get(sourceId);
    if (!companyName) continue;
    counts.set(companyName, (counts.get(companyName) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .reduce<Record<string, number>>((acc, [companyName, count]) => {
      acc[companyName] = count;
      return acc;
    }, {});
}

function topCountsFromMap(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .reduce<Record<string, number>>((acc, [companyName, count]) => {
      acc[companyName] = count;
      return acc;
    }, {});
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  console.log("Call24 migrated Request company backfill started.");
  console.log(`Mode: ${options.execute ? "EXECUTE / WRITE ENABLED" : "DRY-RUN / NO-WRITE"}`);
  const focusedCompanyName = normalizeCompanyName(options.companyName || "이안글로벌");
  console.log(`Focused company report: ${focusedCompanyName}`);
  if (options.execute) {
    console.warn("WARNING: Confirm a fresh PostgreSQL backup exists before running this command.");
  }

  const migrationMap = await loadCall24RequestMigrationMap();
  const mapEntries = applyLimit(Array.from(migrationMap.entries()), options.limit);
  const targetIds = mapEntries.map(([, targetId]) => targetId);
  const targetIdSet = new Set(targetIds);

  const [requests, companies] = await Promise.all([
    targetIds.length
      ? prisma.request.findMany({
          where: { id: { in: targetIds } },
          select: {
            id: true,
            ownerCompanyId: true,
            targetCompanyName: true,
            createdById: true,
            createdBy: { select: { companyName: true } },
          },
        })
      : Promise.resolve([] as MigratedRequest[]),
    prisma.companyName.findMany({ select: { id: true, name: true } }),
  ]);

  const requestById = new Map(requests.map((request) => [request.id, request]));
  const companyByName = new Map(
    companies.map((company) => [normalizeCompanyName(company.name), company]),
  );
  const companyByCargoSeq = buildSourceCompanyByCargoSeq();

  let ownerCompanyIdNull = 0;
  let targetCompanyNameNull = 0;
  let createdByIdNull = 0;
  let createdByCompanyExists = 0;
  let createdByCompanyMatchesCompanyName = 0;
  let oldCreateUserToGroupCompanyMatched = 0;
  let companyNameMatched = 0;
  let requestRowMissing = 0;
  let backfillOwnerCompanyIdPlanned = 0;
  let backfillTargetCompanyNamePlanned = 0;
  let backfillImpossible = 0;
  let skippedExistingOwnerCompanyId = 0;
  let skippedExistingTargetCompanyName = 0;
  let focusedCompanyMatched = 0;
  let focusedCompanyPlanned = 0;
  let updated = 0;
  const plannedCompanyCounts = new Map<string, number>();

  for (const [sourceId, targetId] of mapEntries) {
    if (!targetIdSet.has(targetId)) continue;
    const request = requestById.get(targetId);
    if (!request) {
      requestRowMissing += 1;
      continue;
    }

    if (request.ownerCompanyId == null) ownerCompanyIdNull += 1;
    if (!request.targetCompanyName?.trim()) targetCompanyNameNull += 1;
    if (request.createdById == null) createdByIdNull += 1;
    if (request.createdBy?.companyName?.trim()) {
      createdByCompanyExists += 1;
      if (companyByName.has(normalizeCompanyName(request.createdBy.companyName))) {
        createdByCompanyMatchesCompanyName += 1;
      }
    }

    const sourceCompanyName = companyByCargoSeq.get(sourceId);
    if (sourceCompanyName) {
      oldCreateUserToGroupCompanyMatched += 1;
    }
    const company = sourceCompanyName ? companyByName.get(normalizeCompanyName(sourceCompanyName)) : undefined;
    if (company) {
      companyNameMatched += 1;
      if (normalizeCompanyName(company.name) === focusedCompanyName) {
        focusedCompanyMatched += 1;
      }
    } else {
      backfillImpossible += 1;
      continue;
    }

    const shouldSetOwnerCompanyId = options.force || request.ownerCompanyId == null;
    const shouldSetTargetCompanyName = options.force || !request.targetCompanyName?.trim();

    if (shouldSetOwnerCompanyId) {
      backfillOwnerCompanyIdPlanned += 1;
    } else {
      skippedExistingOwnerCompanyId += 1;
    }
    if (shouldSetTargetCompanyName) {
      backfillTargetCompanyNamePlanned += 1;
    } else {
      skippedExistingTargetCompanyName += 1;
    }

    if (shouldSetOwnerCompanyId || shouldSetTargetCompanyName) {
      plannedCompanyCounts.set(company.name, (plannedCompanyCounts.get(company.name) ?? 0) + 1);
      if (normalizeCompanyName(company.name) === focusedCompanyName) {
        focusedCompanyPlanned += 1;
      }
    }

    if (!options.execute || (!shouldSetOwnerCompanyId && !shouldSetTargetCompanyName)) {
      continue;
    }

    requireExecute(options, "update migrated Request company fields");
    await prisma.request.update({
      where: { id: targetId },
      data: {
        ...(shouldSetOwnerCompanyId ? { ownerCompanyId: company.id } : {}),
        ...(shouldSetTargetCompanyName ? { targetCompanyName: company.name } : {}),
      },
    });
    updated += 1;
    if (updated % 500 === 0) {
      console.log(`Updated ${updated} migrated Request rows...`);
    }
  }

  printSection("diagnostics", {
    "migration map Request rows considered": mapEntries.length,
    "target Request rows found": requests.length,
    "target Request rows missing": requestRowMissing,
    "migrated Request ownerCompanyId null": ownerCompanyIdNull,
    "migrated Request targetCompanyName null": targetCompanyNameNull,
    "migrated Request createdById null": createdByIdNull,
    "migrated Request createdBy.companyName exists": createdByCompanyExists,
    "createdBy.companyName matches CompanyName.name": createdByCompanyMatchesCompanyName,
    "old create_user -> user_group.name matched": oldCreateUserToGroupCompanyMatched,
    "old company name -> CompanyName.name matched": companyNameMatched,
    "backfill possible request rows": companyNameMatched,
    "backfill ownerCompanyId planned": backfillOwnerCompanyIdPlanned,
    "backfill targetCompanyName planned": backfillTargetCompanyNamePlanned,
    "backfill impossible": backfillImpossible,
    [`${focusedCompanyName} matched request rows`]: focusedCompanyMatched,
    [`${focusedCompanyName} backfill planned request rows`]: focusedCompanyPlanned,
    "skipped existing ownerCompanyId": skippedExistingOwnerCompanyId,
    "skipped existing targetCompanyName": skippedExistingTargetCompanyName,
    "updated rows": updated,
  });

  printSection("top 20 source companies by migrated Request count", topCompanyCounts(
    companyByCargoSeq,
    mapEntries.map(([sourceId]) => sourceId),
  ));
  printSection("top 20 companies by backfill planned Request count", topCountsFromMap(plannedCompanyCounts));

  console.log(options.execute
    ? "\nBackfill finished."
    : "\nDry-run finished. No Request rows were inserted, updated, or deleted.");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Backfill failed.");
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
