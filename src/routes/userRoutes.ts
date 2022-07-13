import express from "express";
import {
  login,
  signup,
  protect,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/userController";
const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);
router.patch("/updatePassword", protect, updatePassword);
export { router as userRouter };
