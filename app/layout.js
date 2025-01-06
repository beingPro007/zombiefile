"use client"

import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { motion } from 'framer-motion'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Header Section */}
            <motion.header
              className="bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950 text-white p-4 text-center relative overflow-hidden"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h1
                className="text-3xl font-bold relative z-10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Zombie File
              </motion.h1>
            </motion.header>

            {/* Main Content */}
            <main className="flex flex-grow relative">
              {/* Left Section */}
              <motion.div
                className="w-1/2 h-[calc(100vh-4rem)] relative overflow-hidden"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Smooth Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700 opacity-20" />

                {/* Subtle Moving Waves */}
                <motion.div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M0 50 Q 25 30, 50 50 T 100 50' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E")`,
                    backgroundSize: '100px 100px',
                  }}
                  animate={{
                    backgroundPosition: ['0px 0px', '100px 0px'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 10,
                    ease: 'linear',
                  }}
                />

                <div className="relative z-10 h-full p-6 flex flex-col justify-center">
                  {children}
                </div>
              </motion.div>

              {/* Right Section */}
              <motion.div
                className="w-1/2 h-[calc(100vh-4rem)] relative overflow-hidden"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {/* Smooth Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 opacity-20" />

                {/* Subtle Floating Particles */}
                <div className="absolute inset-0">
                  {[...Array(20)].map((_, index) => (
                    <motion.div
                      key={index}
                      className="absolute rounded-full bg-white dark:bg-gray-300"
                      style={{
                        width: Math.random() * 4 + 1,
                        height: Math.random() * 4 + 1,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        y: [0, -30, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 p-8 flex flex-col justify-center h-full">
                  <motion.h2
                    className="text-2xl font-bold text-gray-800 dark:text-white mb-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    Welcome to Zombie File
                  </motion.h2>
                  <motion.p
                    className="text-gray-600 dark:text-gray-200 mb-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    Zombie File is a modern file upload platform designed to make
                    file sharing easy, secure, and stylish. With dark mode support
                    and a clean interface, it's perfect for both personal and
                    professional use.
                  </motion.p>
                  <motion.p
                    className="text-gray-600 dark:text-gray-200"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                  >
                    Start by uploading your files using the card on the left. Once
                    uploaded, you'll be able to generate sharing links, manage
                    transfers, and more!
                  </motion.p>
                </div>
              </motion.div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
