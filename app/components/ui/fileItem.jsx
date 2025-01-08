"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { File, X } from 'lucide-react'


export function FileItem({ file, onRemove }) {
  return (
    <motion.li
      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center space-x-3">
        <File className="text-blue-500 dark:text-blue-400" size={20} />
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
          {file.name}
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </span>
        <motion.button
          onClick={onRemove}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={16} />
        </motion.button>
      </div>
    </motion.li>
  )
}
