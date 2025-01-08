"use client"

import './globals.css'
import { Inter } from 'next/font/google'
import { motion } from 'framer-motion'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen">
            {/* Header Section */}
            <motion.header
              className="bg-transparent text-white p-4 text-left relative z-10"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h1
                className="text-2xl from-neutral-600 font-serif relative cursor-pointer"
              >
                Zombie File
              </motion.h1>
            </motion.header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row">
              {/* Left Section */}
              <motion.div
                className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-[calc(100vh-64px)] relative"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Smooth Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-800 to-pink-500 dark:from-purple-600 dark:to-pink-700 opacity-20" />

                {/* Subtle Moving Waves */}
                <motion.div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M0 50 Q 25 30, 50 50 T 100 50' fill='none' stroke='green' stroke-width='2'/%3E%3C/svg%3E")`,
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
                className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-[calc(100vh-64px)] relative"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {/* Smooth Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 opacity-20" />

                {/* Subtle Floating Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(20)].map((_, index) => (
                    <motion.div
                      key={index}
                      className="absolute rounded-full dark:bg-red-500"
                      style={{
                        width: Math.random() * 140 + 1,
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
                  <motion.div
                    className="text-start relative z-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <motion.h2
                      className="text-3xl font-bold mb-6 text-accent-color dark:text-accent-color"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      Welcome to Zombie File
                    </motion.h2>

                    <div className="grid grid-cols-2 gap-6 text-left">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Features</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            P2P File Sharing
                          </li>
                          <li className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            No Intermediate Servers
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Benefits</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Speed Transfers
                          </li>
                          <li className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Secure Sharing
                          </li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>


                </div>
              </motion.div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
