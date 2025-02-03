"use client";

import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import { uploadToS3, deleteFromS3, getSignedFileUrl } from "@/lib/s3-utils";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { useState } from "react";
import { Home } from "lucide-react";

export default function UploadPage() {
  const { files, addFile, updateFile, removeFile } = useChatStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    const newFiles = Array.from(uploadedFiles);
    for (const file of newFiles) {
      const fileId = uuidv4();
      // Add file to store with uploading status
      addFile({
        id: fileId,
        name: file.name,
        size: file.size,
        status: "uploading",
      });

      try {
        // Upload to S3
        const s3Key = await uploadToS3(file);
        
        // Update file status in store
        updateFile(fileId, {
          status: "uploaded",
          s3Key,
        });
      } catch (error) {
        updateFile(fileId, {
          status: "error",
          error: "Failed to upload file",
        });
      }
    }
  };

  const handleFileRemove = async (fileId: string, s3Key?: string) => {
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }
    removeFile(fileId);
  };

  const handleFileView = async (s3Key: string) => {
    try {
      const url = await getSignedFileUrl(s3Key);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error getting signed URL:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <Home size={24} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Upload Documents
            </h1>
          </div>
          <Link
            href="/chat"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go to Chat →
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 transition-colors text-center
                ${isDragging 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" 
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
                }`}
            >
              <input
                type="file"
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                accept=".pdf,image/*"
                className="w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-gray-700 dark:file:text-gray-200"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Drag and drop your files here or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Supported formats: PDF, Images
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Uploaded Files
                </h3>
                <div className="space-y-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => file.s3Key && handleFileView(file.s3Key)}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB
                          <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
                            file.status === "error" ? "bg-red-100 text-red-800" :
                            file.status === "uploading" ? "bg-yellow-100 text-yellow-800" :
                            file.status === "processing" ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {file.status}
                          </span>
                          {file.error && (
                            <span className="ml-2 text-red-500">{file.error}</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleFileRemove(file.id, file.s3Key)}
                        className="ml-4 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <span className="text-xl">×</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 