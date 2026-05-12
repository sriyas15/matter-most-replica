import mongoose from "mongoose";
console.log(process.env.MONGO_DB_URL);
export const connectDB = async (req,res) => {
    
    try {
        await mongoose.connect(process.env.MONGO_DB_URL);
        console.log(`MongoDB Connected Successfully`);
    } catch (error) {
        console.log(`Something Error in DB ${error}`);
        process.exit(1);
    }
};