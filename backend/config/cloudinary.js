// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dfglqcttk",
  api_key:    process.env.CLOUDINARY_API_KEY || "271118378265163",
  api_secret: process.env.CLOUDINARY_API_SECRET || "BtWUJxLwSeJ_owGsjAHA4Pbgf0g",
});

export default cloudinary;