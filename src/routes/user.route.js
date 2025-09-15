import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, getUserChannelProfile,
    registerUser, updateAccountDetails, getCurrentUser, getWatchHistory,
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

userRouter.route("/update-account").patch(verifyJWT, updateAccountDetails)

userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser)

userRouter.route("/update-password").post(verifyJWT, changeCurrentPassword)

userRouter.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

userRouter.route("/update-coverImage").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)

userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile)

userRouter.route("/watch-history").get(verifyJWT, getWatchHistory)

export {userRouter};

