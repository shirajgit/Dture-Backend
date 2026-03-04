import express from "express";
import ImageKit from "@imagekit/nodejs";
 

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_cSXDV72kwEcrN57SGCoO6NlFgJ0=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_cP4I8uOFYNyCNgRNZQCPmQkVTJg=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/g6hmvtb4c",
});
 
async function uploadFile(file, fileName) {
  const result = imagekit.files.upload({
    file,
    fileName: fileName || "Debate_" + Date.now(),
    folder: "DTrue"
  });

  return result
}


export default  uploadFile ;