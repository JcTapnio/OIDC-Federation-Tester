import express from "express";
import { getUserInfo, getUserClaims } from "../controller/userController.js";

const userRouter = express.Router();

userRouter.get("/", async (req, res) => {
  await getUserInfo(req, res, req.app.locals.client);
});

userRouter.get("/claims", async (req, res) => {
  await getUserClaims(req, res);
});

export default userRouter;
