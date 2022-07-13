import express, { Request, Response } from "express";
import "express-async-errors";
import bodyParser, { json } from "body-parser";
import { errorHandler } from "./controllers/errorController";
import { userRouter } from "./routes/userRoutes";

import { BodyParser } from "body-parser";
import cors from "cors";


const app = express();
app.use(
  cors({
    credentials: true, 
  })
);
 
app.options(
  "*",
  function (req, res, next) {
    // pass
  },
  cors()
);
app.set("trust proxy", true);
app.use(json());
app.use("/api/v1/users", userRouter);


app.use(errorHandler);
// app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    status: "error end point not found!",
    message: req.originalUrl,
  });
});

export { app };
