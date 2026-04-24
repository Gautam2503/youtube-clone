import express from 'express'
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import cors from "cors"
import { z } from "zod"
import { prisma } from "./db"
import { Gender } from './generated/prisma/enums';

const app = express();
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.secret || "your-secret-key";


const signupSchema = z.object({
    username : z.string().min(3) , 
    password : z.string().min(6) ,
    gender : z.enum(["male" , "female" , "other"]) ,
    channelName: z.string().min(1) , 
});

const signinSchema = z.object({
    username: z.string().min(3) , 
    password: z.string().min(6)
});

const uploadSchema = z.object({
    videoUrl: z.string() ,
    thumbnail: z.string()
});

function getUserId(req : express.Request): string | null {
    const auth = req.headers.authorization;
    if(!auth?.startsWith("Bearer ")) return null;
    try{
        const payload = jwt.verify(auth.slice(7) , JWT_SECRET) as {userId : string};
        return payload.userId;
    }
    catch{
        return null;
    }
}

app.post("/api/signup" , async (req ,res) => {
    const parsed = signupSchema.safeParse(req.body);
    if(!parsed.success) {
        res.status(400).json({ error : parsed.error.message });
        return;
    }
    const { username , password , gender , channelName} = parsed.data;
    
    const existing = await prisma.user.findFirst({where : {username}});
    if(existing) {
        res.status(409).json({error : "Username already taken"});
        return;
    }
    const hashedPassword = await bcrypt.hash(password,10);
    const user = await prisma.user.create({
        data : {
            username,
            password: hashedPassword,
            gender: gender as Gender,
            channelName,
            description: "",
        },
    });

    const token = jwt.sign({ userId : user.id} , JWT_SECRET);
    res.status(201).json({token , userId:user.id});

})

