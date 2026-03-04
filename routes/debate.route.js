 import cors from "cors";
 import express from "express";
 import deletedDebateSchema from "../models/DeletedDebate.js";
 import debateSchema from "../models/debate.model.js";
import authMiddleware from "../middleware/auth.js";
 
import dotenv from "dotenv";

dotenv.config();
  
 const  router = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/");
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});

// POST /upload -> returns { url }
router.post("/create", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "File missing" });

    const fileBase64 = req.file.buffer.toString("base64");

    const result = await imagekit.upload({
      file: fileBase64,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/debates",          // optional
      useUniqueFileName: true,     // optional
    });

    return res.status(200).json({
      success: true,
      url: result.url,             // use this in frontend
      fileId: result.fileId,       // optional
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/debates", async (req, res) => {
   try {
     const debates = await debateSchema.find();
 
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
   
  debate.agreeCom.push({
        user,
         commets,
        createdAt: new Date(),
      });

  await debate.save();
  res.json(debate);

 })
 
 
 
 
export default router;