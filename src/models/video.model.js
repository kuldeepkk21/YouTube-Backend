import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = mongoose.Schema({
    videoFile: {
        type: String,  //cloudinary url
        required: true,
    },
    thumbNail: {
        type: String,  //cloudinary url
        required: true,
    },
    title: {
        type: String,  
        required: true,
        index: true
    },
    decription: {
        type: String,  
    },
    duration: {
        type: Number,   //cloudinary
        required: true,
    },
    views: {
        type: Number,  
        required: true,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamnps: true})

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video", videoSchema)
