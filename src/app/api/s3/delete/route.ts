import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { awsConfig, isAwsConfigValid } from "@/lib/config";

// Initialize S3 client 
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

export async function DELETE(request: NextRequest) {
  try {
    // Check S3 config
    if (!isAwsConfigValid()) {
      return NextResponse.json(
        { error: "AWS S3 configuration is incomplete" },
        { status: 500 }
      );
    }
    
    // Get the key from query parameters
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    
    if (!key) {
      return NextResponse.json(
        { error: "No file key provided" },
        { status: 400 }
      );
    }
    
    // Delete from S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: key,
      })
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in S3 delete:", error);
    return NextResponse.json(
      { error: `S3 delete failed: ${error.message}` },
      { status: 500 }
    );
  }
} 