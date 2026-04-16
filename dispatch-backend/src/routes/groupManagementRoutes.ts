import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import {
  listGroups,
  createGroupDepartment,
  updateGroupDepartment,
  deleteGroupDepartment,
  createGroupContact,
  updateGroupContact,
  deleteGroupContact,
} from "../controllers/groupManagementController";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("ADMIN", "DISPATCHER", "SALES"));

router.get("/", listGroups);
router.post("/:groupId/departments", createGroupDepartment);
router.patch("/departments/:departmentId", updateGroupDepartment);
router.delete("/departments/:departmentId", deleteGroupDepartment);
router.post("/:groupId/contacts", createGroupContact);
router.patch("/contacts/:contactId", updateGroupContact);
router.delete("/contacts/:contactId", deleteGroupContact);

export default router;
