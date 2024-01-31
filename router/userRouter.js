import express from "express";
import { getUserInfo } from "../controller/userController.js";

const userRouter = express.Router();

userRouter.get("/", async (req, res) => {
  await getUserInfo(req, res, req.app.locals.client);
});

export default userRouter;
