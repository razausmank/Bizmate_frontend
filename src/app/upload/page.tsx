"use client";

import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import { uploadToS3, deleteFromS3, getSignedFileUrl } from "@/lib/s3-utils";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Home, AlertTriangle } from "lucide-react";
import { Dialog } from '@headlessui/react';
import { isAwsConfigValid } from "@/lib/config";

export default function UploadPage() {
  const { files, addFile, updateFile, removeFile } = useChatStore();
  const [isDragging, setIsDragging] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string; s3Key?: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [configStatus, setConfigStatus] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });
  const [testingConnection, setTestingConnection] = useState(false);

  // Check S3 configuration on component mount
  useEffect(() => {
    const awsValid = isAwsConfigValid();
    setConfigStatus({
      isValid: awsValid,
      message: awsValid ? "" : "S3 configuration is incomplete. File uploads will fail."
    });
  }, []);

  // Test S3 connection
  const testS3Connection = async () => {
    setTestingConnection(true);
    try {
      // Create a tiny test file
      const testBlob = new Blob(["test"], { type: "text/plain" });
      const testFile = new File([testBlob], "connection-test.txt", { type: "text/plain" });
      
      // Try to upload it
      const s3Key = await uploadToS3(testFile);
      
      // If successful, delete it
      await deleteFromS3(s3Key);
      
      setConfigStatus({
        isValid: true,
        message: "S3 connection test successful!"
      });
    } catch (error: any) {
      console.error("S3 connection test failed:", error);
      setConfigStatus({
        isValid: false,
        message: `S3 connection failed: ${error.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

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
        // Check file size
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error("File too large. Maximum size is 10MB.");
        }

        console.log(`Attempting to upload file: ${file.name} (${file.size} bytes)`);
        
        // Upload to S3
        const s3Key = await uploadToS3(file);
        
        console.log(`File uploaded successfully with key: ${s3Key}`);
        
        // Update file status in store
        updateFile(fileId, {
          status: "uploaded",
          s3Key,
        });
      } catch (error: any) {
        console.error(`Upload error for ${file.name}:`, error);
        
        const errorMessage = error.message || "Failed to upload file";
        console.error(errorMessage);
        
        updateFile(fileId, {
          status: "error",
          error: errorMessage,
        });
      }
    }
  };

  const handleFileRemove = async (fileId: string, s3Key?: string, fileName?: string) => {
    setFileToDelete({ id: fileId, name: fileName || '', s3Key });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    const { id, s3Key } = fileToDelete;
    if (s3Key) {
      try {
        await deleteFromS3(s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }
    removeFile(id);
    setIsDeleteDialogOpen(false);
    setFileToDelete(null);
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
          {!configStatus.isValid && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3"
            >
              <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Configuration Warning</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">{configStatus.message}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Please check your AWS S3 configuration in the environment variables.
                </p>
                <button
                  onClick={testS3Connection}
                  disabled={testingConnection}
                  className="mt-2 px-3 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 disabled:opacity-50"
                >
                  {testingConnection ? "Testing..." : "Test S3 Connection"}
                </button>
              </div>
            </motion.div>
          )}
          
          {configStatus.isValid && configStatus.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3"
            >
              <div className="text-green-500 shrink-0 mt-0.5">✓</div>
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">{configStatus.message}</p>
                <button
                  onClick={() => setConfigStatus({ ...configStatus, message: "" })}
                  className="mt-2 px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-700"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
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
              <label htmlFor="file-upload" className="sr-only">
                Choose files to upload
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                accept=".pdf,image/*"
                aria-label="Choose files to upload"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileRemove(file.id, file.s3Key, file.name);
                        }}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              Confirm Delete
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </Dialog.Description>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
} 