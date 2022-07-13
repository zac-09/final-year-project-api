import { catchAsync } from "../utils/catchAsync";
import { Request, Response, NextFunction } from "express";
import { AuthUserRequest } from "./../utils/interfaces";
import { User } from "../models/user";
import { AppError } from "../utils/error";
import { createHash } from "crypto";
import jwt, { Secret } from "jsonwebtoken";
import { Email } from "../utils/email";
import { promisify } from "util";
const signToken = (id: string) => {
  const jwtScret: Secret = process.env.JWT_SECRET!;
  return jwt.sign({ id }, jwtScret, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = async (
  user: any,
  statusCode: number,
  res: Response
) => {
  const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN_HOURS!);
  const token = signToken(user._id);

  const expirationtime = new Date(Date.now() + JWT_EXPIRES_IN * 60 * 60 * 1000);
  const expiresIn = JWT_EXPIRES_IN * 60 * 60 * 1000;

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    expiresIn,
    expirationtime,
    user,
  });
};
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({
      email,
    }).select("+password");
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Invalid crendetials", 403));
    }
    await createSendToken(user, 200, res);
  }
);

export const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({
      email,
    });
    if (user) return next(new AppError("Email already exists", 400));
    const newUser = await User.create(req.body);
    await createSendToken(newUser, 201, res);
    await new Email(email, "welcome", "welcome to our platform").sendWelcome(
      newUser.first_name
    );
  }
);

export const protect = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    // 2) Verification token
    //ts-ignore
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401
        )
      );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req["user"] = currentUser;
    res.locals.user = currentUser;
    next();

    // console.log("user object",req.locals.user)
  }
);

export const updatePassword = catchAsync(
  async (req: AuthUserRequest, res: Response, next: NextFunction) => {
    // 1) Get user from collection
    const user = await User.findOne({ email: req.user.email });
    if (!user)
      return next(
        new AppError("User not found, please check the supplied id", 404)
      );
    // 2) Check if POSTed current password is correct
    if (
      !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return next(new AppError("Your current password is wrong.", 401));
    }

    // 3) If so, update password
    user.password = req.body.newPassword;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
  }
);

export const resetPassword = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const token = req.params.token;
    if (!token) {
      return next(new AppError("please supply a token", 400));
    }
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  }
);

export const forgotPassword = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const email = req.body.email;
    if (!email) {
      return next(new AppError("please supply a valid email address", 400));
    }
    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("There is no user with email address.", 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetURL = `${req.protocol}://davsafaris.com/reset-password/${resetToken}`;
      const subject = "Reset Password";
      const message = "Request for password reset"; 
      console.log("the url is", resetURL);
      await new Email(email, subject, message).sendPasswordReset(
        resetURL,
        user.first_name
      );

      res.status(200).json({
        status: "success",
        message: "Token sent to email!",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          "There was an error sending the email. Try again later!",
          500
        )
      );
    }
  }
);
