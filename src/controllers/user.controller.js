import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

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

export {registerUser}

