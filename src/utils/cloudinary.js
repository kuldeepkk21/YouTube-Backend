import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFlePath) => {
    try {
        if (!localFlePath) return null
        const response = await cloudinary.uploader.upload(localFlePath, {
            resource_type: "auto"
        })
        console.log("kullu", response);
        console.log("file is uploaded on cloudinary", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFlePath)
        return null;
    }
}
    
export {uploadOnCloudinary}