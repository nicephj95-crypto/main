// src/routes/addressBookRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import {
  downloadTemplate,
  importAddressBook,
  listAddressBook,
  getAddressBookImages,
  uploadAddressBookImages,
  deleteAddressBookImage,
  createAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
  listCompanies,
} from "../controllers/addressBookController";

const router = Router();

// 모든 주소록 API는 로그인 필수
router.use(authMiddleware);

router.get("/template.xlsx", downloadTemplate);
router.post("/import", importAddressBook);
router.get("/", listAddressBook);
router.get("/:id/images", getAddressBookImages);
router.post("/:id/images", uploadAddressBookImages);
router.delete("/:id/images/:imageId", deleteAddressBookImage);
router.post("/", createAddressBookEntry);
router.patch("/:id", updateAddressBookEntry);
router.delete("/:id", deleteAddressBookEntry);
router.get("/companies", requireRole("ADMIN"), listCompanies);

export default router;
