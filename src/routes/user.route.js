import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken,
    registerUser, updateAccountDetails, getCurrentUser,
    changeCurrentPassword, updateUserAvatar, updateUserCoverImage }
    from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

userRouter.route("/login").post(loginUser)   

userRouter.route("/logout").post(verifyJWT, logoutUser)  

userRouter.route("/refresh-token").post(refreshAccessToken)

userRouter.route("/update-account").post(verifyJWT, updateAccountDetails)

userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser)

userRouter.route("/update-password").post(verifyJWT, changeCurrentPassword)

userRouter.route("/update-avatar").post(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

userRouter.route("/update-coverImage").post(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)

export {userRouter};

