import { Request } from "express";
import { UserDoc } from "../models/user";

export interface AuthUserRequest extends Request {
  user: UserDoc;
}
