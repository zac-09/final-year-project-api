import { app } from "./app";

import mongoose from "mongoose";
import { config } from "dotenv";
import { AppError } from "./utils/error";
const dotenv = config();

const startApp = async () => {
  const port = process.env.PORT || 3000;
  const MONGO_URI = process.env.DB;
  if (!MONGO_URI) {
    return new AppError("mongo URI not defined", 400);
  }
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("succesfully connected to Mongo!");
  } catch (err) {
    console.log(`An error occured: ${JSON.stringify(err)}`);
  }
  app.listen(port, () => {
    console.log(`listening on ${port}`);
  });
};

startApp();
