import express from "express";
import ImageKit from "@imagekit/nodejs";

const ImageKitClient = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY, 
});

async function uploadFile(file) {
  const result = ImageKitClient.files.upload({
    file,
    fileName : "Debate_" + Date.now(),
    folder :"DTrue"
  })

  return result
}


export default  uploadFile ;