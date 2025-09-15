import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save( { validateBeforeSave: false } )

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating access and refresh tokens")
    }
}

// get user details from the frontend
// validation, not empty and others
// check if user already exist, username, email
// check for images, avatar
// upload them to cloudinary
// create user objext, create entry in db
// remove password and refresh token field from response
// check for user creation
// return response

const registerUser = asyncHandler( async (req, res) => {

    // get user details from the frontend
    const {username, email, password, fullName} = req.body;
    console.log("email:", email);
    console.log(req.body);
    
    // validation, not empty and others
    if (
        [username, email, password, fullName].some( (field) => field?.trim() === "") 
    ) {
        throw new ApiError(400, "all fields are required")
    } 
    if (!email.includes("@")) {
        throw new ApiError(400, "email should contain @")
    }

    // check if user already exist, username, email
    const existedUser = await User.findOne({
        $or: [ {username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exist")
    }

    // check for images, avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) 
    && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "avatar file is required")
    }

    // create user objext, create entry in db
    const user = await User.create( {
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while creating the user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
    
})

// req body -> data
// check on username or email
// find the user & check it exists or not
// password check
// access and refresh token
// send cookie

const loginUser = asyncHandler( async (req, res) => {
    
    const {username, email, password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "email or username must required for login")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "password is incorrect")
    }

    console.log("kuldeep");

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    console.log("simran");
    
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )


})

const logoutUser = asyncHandler( async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "user logged out successfully")
    )
})

const refreshAccessToken = asyncHandler ( async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401, "invalid refreshToken")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "refresh tokem is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken },
            "access token refreshed successfully"
        )
    )
})

const changeCurrentPassword = asyncHandler ( async(req, res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword;
    await user.save( {validateBeforeSave: false} )

    return res.status(200)
    .json(
        new ApiResponse(201, {}, "password changed successfully")
    )
})

const getCurrentUser = asyncHandler ( async(req, res) => {
    return res.status(200)
    .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler ( async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "all fields are required")
    }

    const updateduser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(201, updateduser, "account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }
    const updatedAvatar = await uploadOnCloudinary(avatarLocalPath)
    
    if (!updatedAvatar.url) {
        throw new ApiError(400, "error while uploading avatar")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: updatedAvatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    if (!user) {
        throw new ApiError(500, "error while updating avatar")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "user avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }
    const updatedCoverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!updatedCoverImage.url) {
        throw new ApiError(400, "error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: updatedCoverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    if (!user) {
        throw new ApiError(500, "error while updating coverImage")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "user coverImage updated successfully")
    )
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params
    if (!username) {
        throw new ApiError(400, "user is missing")
    }
    
    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if : {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
 

})

const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully")
    )
})

export {registerUser, loginUser, logoutUser, getUserChannelProfile,
refreshAccessToken, getCurrentUser, changeCurrentPassword, getWatchHistory,
updateAccountDetails, updateUserAvatar, updateUserCoverImage}

