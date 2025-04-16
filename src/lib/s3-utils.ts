import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsConfig, isAwsConfigValid } from "./config";
import axios from "axios";

// Define types for our API responses
interface UploadResponse {
  success: boolean;
  key?: string;
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

interface UrlResponse {
  success: boolean;
  url?: string;
  error?: string;
}

interface ConnectionTestResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Log AWS configuration (without sensitive values)
console.log("S3 Configuration:", {
  region: awsConfig.region,
  accessKeyIdProvided: !!awsConfig.accessKeyId,
  secretAccessKeyProvided: !!awsConfig.secretAccessKey,
  bucketName: awsConfig.bucketName,
});

// Check if AWS config is valid
if (!isAwsConfigValid()) {
  console.error("AWS configuration is incomplete. S3 operations will fail.");
}

let s3Client: S3Client;

try {
  s3Client = new S3Client({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    },
  });
} catch (error) {
  console.error("Failed to initialize S3 client:", error);
  // Create a dummy client that will throw errors when used
  s3Client = {} as S3Client;
}

const BUCKET_NAME = awsConfig.bucketName;

// Log configuration status
console.log("S3 client-side utilities loaded, config valid:", isAwsConfigValid());

export async function uploadToS3(file: File): Promise<string> {
  try {
    console.log(`Starting upload for file: ${file.name} (${file.size} bytes)`);
    
    // Create form data for the file
    const formData = new FormData();
    formData.append("file", file);
    
    // Send to our server-side API route
    const response = await axios.post<UploadResponse>("/api/s3/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Upload failed");
    }
    
    if (!response.data.key) {
      throw new Error("No file key returned from server");
    }
    
    console.log(`File uploaded successfully with key: ${response.data.key}`);
    return response.data.key;
  } catch (error: any) {
    console.error('Error uploading to S3:', error);
    
    // Enhanced error messaging
    let errorMessage = 'Failed to upload file to S3: ';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage += error.response.data.error || error.response.statusText;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage += 'No response received from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage += error.message;
    }
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    console.log(`Requesting deletion for file with key: ${key}`);
    
    // Send delete request to server-side API
    const response = await axios.delete<DeleteResponse>(`/api/s3/delete`, {
      params: { key }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Delete failed");
    }
    
    console.log(`File with key ${key} deleted successfully`);
    return true;
  } catch (error: any) {
    console.error("Error deleting file from S3:", error.message);
    return false;
  }
}

export async function getSignedFileUrl(key: string): Promise<string> {
  try {
    console.log(`Requesting signed URL for file with key: ${key}`);
    
    // Request signed URL from server-side API
    const response = await axios.get<UrlResponse>(`/api/s3/get-url`, {
      params: { key }
    });
    
    if (!response.data.success || !response.data.url) {
      throw new Error(response.data.error || "Failed to get signed URL");
    }
    
    return response.data.url;
  } catch (error: any) {
    console.error("Error getting signed URL:", error.message);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
}

export async function testS3Connection(): Promise<{ success: boolean, message: string }> {
  try {
    const response = await axios.get<ConnectionTestResponse>("/api/s3/test-connection");
    
    return {
      success: response.data.success,
      message: response.data.message
    };
  } catch (error: any) {
    console.error("Error testing S3 connection:", error.message);
    return {
      success: false,
      message: `Connection test failed: ${error.message}`
    };
  }
} 