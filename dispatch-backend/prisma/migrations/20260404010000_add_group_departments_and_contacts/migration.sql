-- CreateTable
CREATE TABLE "GroupDepartment" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupContact" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupDepartment_groupId_idx" ON "GroupDepartment"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupDepartment_groupId_name_key" ON "GroupDepartment"("groupId", "name");

-- CreateIndex
CREATE INDEX "GroupContact_groupId_idx" ON "GroupContact"("groupId");

-- CreateIndex
CREATE INDEX "GroupContact_departmentId_idx" ON "GroupContact"("departmentId");

-- CreateIndex
CREATE INDEX "GroupContact_name_idx" ON "GroupContact"("name");

-- AddForeignKey
ALTER TABLE "GroupDepartment"
ADD CONSTRAINT "GroupDepartment_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "CompanyName"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupContact"
ADD CONSTRAINT "GroupContact_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "CompanyName"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupContact"
ADD CONSTRAINT "GroupContact_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "GroupDepartment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
