import express from "express"
const app = express()

import cors from "cors"
import cookieParser from "cookie-parser"

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(cookieParser())

app.use(express.json({limit: "21kb"}))
app.use(express.urlencoded({
    extended: true,
    limit: "21kb"
}))
app.use(express.static("public"))



import {userRouter} from "./routes/user.route.js"

app.use("/api/v1/users", userRouter)

export {app}
