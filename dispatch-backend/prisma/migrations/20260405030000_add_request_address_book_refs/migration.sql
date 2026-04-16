ALTER TABLE "Request"
  ADD COLUMN IF NOT EXISTS "pickupAddressBookId" INTEGER,
  ADD COLUMN IF NOT EXISTS "dropoffAddressBookId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Request_pickupAddressBookId_fkey'
  ) THEN
    ALTER TABLE "Request"
      ADD CONSTRAINT "Request_pickupAddressBookId_fkey"
      FOREIGN KEY ("pickupAddressBookId") REFERENCES "AddressBook"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Request_dropoffAddressBookId_fkey'
  ) THEN
    ALTER TABLE "Request"
      ADD CONSTRAINT "Request_dropoffAddressBookId_fkey"
      FOREIGN KEY ("dropoffAddressBookId") REFERENCES "AddressBook"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Request_pickupAddressBookId_idx"
  ON "Request"("pickupAddressBookId");

CREATE INDEX IF NOT EXISTS "Request_dropoffAddressBookId_idx"
  ON "Request"("dropoffAddressBookId");
