"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
          Bizmate
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link 
              href="/upload"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Upload Documents
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Upload and manage your business documents, sales reports, and invoices for analysis.
              </p>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Start uploading →
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link 
              href="/chat"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Chat Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Interact with our AI to analyze your business data and get valuable insights.
              </p>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Start chatting →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
