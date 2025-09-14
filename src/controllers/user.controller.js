import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = User.findById(userId)
        const accessToken = user.generateAccesssToken()
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

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

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
            $set: { refreshToken: undefined }
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

export {registerUser, loginUser, logoutUser}

