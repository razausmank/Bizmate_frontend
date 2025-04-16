import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsConfig, isAwsConfigValid } from "@/lib/config";

// Initialize S3 client 
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

export async function GET(request: NextRequest) {
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
    
    // Generate signed URL
    const command = new GetObjectCommand({
      Bucket: awsConfig.bucketName,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({ success: true, url: signedUrl });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { success: false, error: `Failed to generate signed URL: ${error.message}` },
      { status: 500 }
    );
  }
} 