// import mongoose from "mongoose";
// import { DB_NAME } from "./constants"

// require("dotenv").config({path: "./env"})

import { app } from "./app.js";
import connectDB from "./db/db_connection.js";
import dotenv from "dotenv";

dotenv.config({ 
    path: "./env"
})

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("not able to talk to DB", error);
        throw error;
    })
    app.listen(process.env.PORT || 3000, () => {
        console.log(`server is running at port: ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("mongodb connection failed", err);
})







// import express from "express"
// const app = express();
// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("not able to talk to DB", error);
//             throw error;
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`app is listening on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("ERROR:", error)
//     }
// })()