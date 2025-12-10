-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AddressBook" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "placeName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AddressBook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicleGroup" TEXT,
    "vehicleTonnage" REAL,
    "vehicleBodyType" TEXT,
    "region" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pickupPlaceName" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupAddressDetail" TEXT,
    "pickupContactName" TEXT,
    "pickupContactPhone" TEXT,
    "pickupMethod" TEXT NOT NULL,
    "pickupIsImmediate" BOOLEAN NOT NULL DEFAULT false,
    "pickupDatetime" DATETIME,
    "dropoffPlaceName" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "dropoffAddressDetail" TEXT,
    "dropoffContactName" TEXT,
    "dropoffContactPhone" TEXT,
    "dropoffMethod" TEXT NOT NULL,
    "dropoffIsImmediate" BOOLEAN NOT NULL DEFAULT false,
    "dropoffDatetime" DATETIME,
    "vehicleGroup" TEXT,
    "vehicleTonnage" REAL,
    "vehicleBodyType" TEXT,
    "cargoDescription" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'NORMAL',
    "driverNote" TEXT,
    "paymentMethod" TEXT,
    "distanceKm" REAL,
    "quotedPrice" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestDriverAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    CONSTRAINT "RequestDriverAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequestDriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
