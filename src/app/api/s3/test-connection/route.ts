import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
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
        { 
          success: false, 
          error: "AWS S3 configuration is incomplete",
          details: {
            region: !!awsConfig.region,
            accessKeyId: !!awsConfig.accessKeyId,
            secretAccessKey: !!awsConfig.secretAccessKey,
            bucketName: !!awsConfig.bucketName
          }
        },
        { status: 500 }
      );
    }
    
    // Test connection by listing buckets
    const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
    
    // Check if our bucket is in the list
    const bucketExists = Buckets?.some(bucket => bucket.Name === awsConfig.bucketName);
    
    if (!bucketExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Bucket '${awsConfig.bucketName}' not found or not accessible`,
          availableBuckets: Buckets?.map(b => b.Name)
        },
        { status: 404 }
      );
    }
    
    // Upload a test file
    const testKey = `test-connection-${Date.now()}.txt`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: testKey,
        Body: Buffer.from('Test connection'),
        ContentType: 'text/plain',
      })
    );
    
    // Delete the test file
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: testKey,
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      message: "S3 connection successful" 
    });
  } catch (error: any) {
    console.error("Error testing S3 connection:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `S3 connection test failed: ${error.message}`,
        code: error.Code || error.name
      },
      { status: 500 }
    );
  }
} 