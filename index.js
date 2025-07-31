import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Issuer } from "openid-client";
import authRouter from "./router/authRouter.js";
import userRouter from "./router/userRouter.js";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

dotenv.config();
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

app.use(async (req, res, next) => {
  try {
    const oidcIssuer = await Issuer.discover(process.env.ISSUER);
    console.log(
      "Discovered issuer %s %O",
      oidcIssuer.issuer,
      oidcIssuer.metadata
    );
    const client = new oidcIssuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ["code"],
    });

    req.app.locals.client = client;
    req.app.locals.oidcIssuer = oidcIssuer;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.use("/", authRouter);
app.use("/user", userRouter);

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
