import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { awsConfig, isAwsConfigValid } from "@/lib/config";

// Initialize S3 client 
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Check S3 config
    if (!isAwsConfigValid()) {
      return NextResponse.json(
        { error: "AWS S3 configuration is incomplete" },
        { status: 500 }
      );
    }
    
    // Get the file data from form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Create a key for the file
    const key = `uploads/${Date.now()}-${file.name}`;
    
    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      })
    );
    
    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("Error in S3 upload:", error);
    return NextResponse.json(
      { error: `S3 upload failed: ${error.message}` },
      { status: 500 }
    );
  }
} 