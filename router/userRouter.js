import express from "express";
import { getUserInfo, getUserClaims } from "../controller/userController.js";

const userRouter = express.Router();

userRouter.get("/", async (req, res) => {
  await getUserInfo(req, res, req.app.locals.client);
});

userRouter.get("/claims", async (req, res) => {
  await getUserClaims(req, res);
});

// Add a redirect route for handling BPID form submission
userRouter.post("/set-bpid", (req, res) => {
  const bpid = req.body.bpid;
  res.redirect(`/welcome/user?bpid=${encodeURIComponent(bpid)}`);
});

export default userRouter;
