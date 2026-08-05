 import cors from "cors";
 import express from "express";
 import mongoose from "mongoose";
 import deletedDebateSchema from "../models/DeletedDebate.js";
 import debateSchema from "../models/debate.model.js";
 import authMiddleware from "../middleware/auth.js";
 import  multer  from "multer";
 import uploadFile from "../services/storage.service.js";

import dotenv from "dotenv";


dotenv.config();
  const router = express.Router();

// Lazily flip any overdue debates to `ended` on read, so ending never
// depends on the every-10-min cron actually being awake (the Render free
// tier sleeps). This mirrors what cron/expireDebates.js does.
async function endOverdueDebates() {
  const now = new Date();
  await debateSchema.updateMany(
    { expiresAt: { $lte: now }, ended: { $ne: true } },
    { $set: { ended: true, endedAt: now } }
  );
}

// A debate is over if it's flagged ended OR its expiry time has passed.
const isDebateEnded = (d) =>
  d.ended === true || (d.expiresAt && new Date(d.expiresAt) <= new Date());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/");
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});


router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file" });
    }

    const base64 = req.file.buffer.toString("base64");
    const result = await uploadFile(base64, req.file.originalname);

    return res.json({ success: true, url: result.url });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


// POST /upload -> returns { url }
router.post("/create", async (req, res) => {
  try {
    const { name, description, duration, image, user, id } = req.body;

    let expire = 1;
    if (duration === "7 Days") expire = 7;
    else if (duration === "3 Days") expire = 3;

    const expiresAt = new Date(Date.now() + expire * 24 * 60 * 60 * 1000);

    const debate = await debateSchema.create({
      id,
      name,
      description,
      image,      // ImageKit URL here
      duration,
      user,
      expiresAt,
    });

    return res.status(201).json({ success: true, debate });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});




// Active debates only (ended ones are excluded so they stop showing as "live").
router.get("/debates", async (req, res) => {
   try {
     await endOverdueDebates();
     const debates = await debateSchema.find({ ended: { $ne: true } });

     return res.status(200).json({
       success: true,
       debates,
     });
   } catch (err) {
     console.error("GET /debates error:", err);

     return res.status(500).json({
       success: false,
       message: err.message,
     });
   }
 });

// Ended debates — served from the real Debate collection ({ ended: true }),
// not the never-populated DeletedDebate collection.
 router.get("/ended-debates", async (req, res) => {
   try {
     await endOverdueDebates();
     const debates = await debateSchema
       .find({ ended: true })
       .sort({ endedAt: -1 });

     return res.status(200).json({
       success: true,
       debates,
     });
   } catch (err) {
     console.error("GET /ended-debates error:", err);

     return res.status(500).json({
       success: false,
       message: err.message,
     });
   }
 });

// A single ended debate by Mongo _id or numeric id.
 router.get("/ended-debates/:id", async (req, res) => {
   try {
     await endOverdueDebates();
     let debate = null;
     if (mongoose.isValidObjectId(req.params.id)) {
       debate = await debateSchema.findById(req.params.id);
     }
     if (!debate) {
       debate = await debateSchema.findOne({ id: Number(req.params.id) });
     }
     if (!debate) return res.status(404).json({ message: "Not found" });
     return res.status(200).json(debate);
   } catch (err) {
     console.error("GET /ended-debates/:id error:", err);
     return res.status(500).json({ success: false, message: err.message });
   }
 });

// A single debate by numeric id, active OR ended (used by the debate page,
// so it can show an "ended" state instead of "no debate found").
 router.get("/debate/:id", async (req, res) => {
   try {
     await endOverdueDebates();
     const debate = await debateSchema.findOne({ id: Number(req.params.id) });
     if (!debate) return res.status(404).json({ success: false, message: "Not found" });
     return res.status(200).json({ success: true, debate });
   } catch (err) {
     console.error("GET /debate/:id error:", err);
     return res.status(500).json({ success: false, message: err.message });
   }
 });

// Kept for backwards-compat; the DeletedDebate collection is unused/empty.
 router.get("/delete-debates", async (req, res) => {
   try {
     const debates = await deletedDebateSchema.find();

     return res.status(200).json({
       success: true,
       debates,
     });
   } catch (err) {
     console.error("GET /debates error:", err);

     return res.status(500).json({
       success: false,
       message: err.message,
     });
   }
 });
 
 
router.post("/debates/:id", async (req, res) => {
   const { voter, agree , disagree } = req.body;
 
 
   try {
     const debate = await debateSchema.findOne({ id: Number(req.params.id) });
 
     if (!debate) {
       return res.status(404).json({ message: "Debate not found" });
     }

     if (isDebateEnded(debate)) {
       return res.status(400).json({ message: "This debate has ended" });
     }

     if (!debate.Voters.includes(voter)) {
       debate.Voters.push(voter);
      
     } else {
       return res.status(400).json({ message: "User has already voted" });
     }
     
     if (agree) { 
        debate.agree += 1;
      } else if (disagree) {
        debate.disagree += 1;
      }
  
    
     await debate.save();
 
     res.status(200).json({
       message: "Agree vote added",
       agree: debate.agree,
     });
   } catch (err) {
     res.status(500).json({ message: "Server error" });
   }
 });
 
 router.get("/debates/:id", async (req, res) => {
  const debate = await debateSchema.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Not found" });
  res.json(debate);
});

router.put("/debates/:id/agree", authMiddleware, async (req, res) => {
  const userId = req.userId; // ✅ correct

  const debate = await debateSchema.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  if (isDebateEnded(debate)) {
    return res.status(400).json({ message: "This debate has ended" });
  }

  if (debate.Voters.includes(userId)) {
    return res.status(400).json({ message: "Already voted" });
  }

  debate.agree += 1;
  debate.Voters.push(userId);

  await debate.save();
  res.json(debate);
});


router.put("/debates/:id/disagree", authMiddleware, async (req, res) => {
  const userId = req.userId;

  const debate = await debateSchema.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  if (isDebateEnded(debate)) {
    return res.status(400).json({ message: "This debate has ended" });
  }

  if (debate.Voters.includes(userId)) {
    return res.status(400).json({ message: "Already voted" });
  }

  debate.disagree += 1;
  debate.Voters.push(userId);

  await debate.save();
  res.json(debate);
});


router.put("/debates/:id/discommets",authMiddleware , async (req, res)=>{
  const userId = req.userId;
  const {commets ,user} = req.body;

  const debate = await debateSchema.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  if (isDebateEnded(debate)) {
    return res.status(400).json({ message: "This debate has ended" });
  }

   debate.disagreeCom.push({
        user,
        commets,
        createdAt: new Date(),
      });

  await debate.save();
  res.json(debate);

 })

 router.put("/debates/:id/aggcommets",authMiddleware , async (req, res)=>{
 
  const {commets ,user} = req.body;

  const debate = await debateSchema.findById(req.params.id);
  if (!debate) return res.status(404).json({ message: "Debate not found" });

  if (isDebateEnded(debate)) {
    return res.status(400).json({ message: "This debate has ended" });
  }

  debate.agreeCom.push({
        user,
         commets,
        createdAt: new Date(),
      });

  await debate.save();
  res.json(debate);

 })
 
 
 
 
export default router;