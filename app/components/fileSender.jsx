"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromBuffer } from "file-type";
import qrCodeGenerator from "@/components/qrCodeGenerator";
import CopyButton from "./ui/copyButton";
import { Button } from "./ui/button";
import Loader from "./ui/loaderComponent/loader";
import { motion, AnimatePresence } from "framer-motion";


export function FileSender() {
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [peerJoined, setPeerJoined] = useState(false);
  const [connection, setConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [transferStatus, setTransferStatus] = useState("");
  const [transferProgress, setTransferProgress] = useState(0);
  const [link, setlink] = useState(null)
  const [isSharing, setIsSharing] = useState(false);

  const signalingServer =
    process.env.NODE_ENV !== "development"
      ? "https://zombie-file-p2p-server-1060514353958.us-central1.run.app/"
      : "http://localhost:3000";

  const socket = useMemo(
    () =>
      io(signalingServer),
    [signalingServer]
  );

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const generateLink = () => {
    const currentUrl = window.location.href; 
    setlink(currentUrl); 
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    socket.emit("create-room", newRoomId);
    console.log("Room created:", newRoomId);
  };

  const sendFiles = async (channel) => {
    setTransferStatus("Sending files...");
    console.log("Starting file transfer...");

    for (const file of files) {
      try {
        console.log(
          `Preparing to send file: ${file.name} (${(
            file.size /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
        setTransferProgress(0);

        const reader = new FileReader();

        const fileBuffer = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
          reader.readAsArrayBuffer(file);
        });

        const type = await fileTypeFromBuffer(fileBuffer);
        const mimeType = type ? type.mime : "application/octet-stream";

        // Send metadata
        channel.send(`MIME:${mimeType}`);
        channel.send(`NAME:${file.name}`);
        channel.send(`SIZE:${fileBuffer.byteLength}`);
        console.log(`Sent metadata for ${file.name}`);

        const chunkSize = 90000;
        let offset = 0;

        const sendChunk = () =>
          new Promise((resolve) => {
            const sendNextChunk = () => {
              if (offset < fileBuffer.byteLength) {
                if (channel.readyState === "open") {
                  if (channel.bufferedAmount < chunkSize) {
                    const chunk = fileBuffer.slice(offset, offset + chunkSize);
                    channel.send(chunk);
                    offset += chunkSize;

                    const progress = Math.floor(
                      (offset / fileBuffer.byteLength) * 100
                    );
                    setTransferProgress(progress);

                    console.log(
                      `Sent chunk: Offset ${offset} of ${fileBuffer.byteLength} bytes`
                    );
                  } else {
                    console.log("BufferedAmount is high. Waiting...");
                  }
                  setTimeout(sendNextChunk, 50);
                } else {
                  setTransferStatus(
                    "DataChannel is closed. File transfer aborted."
                  );
                  console.error(
                    "DataChannel is closed. File transfer aborted."
                  );
                  resolve(); // Exit if the channel is closed
                }
              } else {
                channel.send("END");
                console.log(`File transfer complete for: ${file.name}`);
                resolve();
              }
            };

            sendNextChunk();
          });

        await sendChunk();

        // Mark the end of this file transfer
        channel.send("FILE_END");
        console.log(`FILE_END sent for ${file.name}`);
      } catch (error) {
        console.error(`Error sending file ${file.name}:`, error);
        setTransferStatus(`Error sending file: ${file.name}`);
      }
    }

    console.log("All files have been sent.");
    setTransferStatus("All files sent.");
  };

  const handleDataChannelEvents = (channel) => {
    channel.onclose = () => {
      console.log("DataChannel closed.");
      setTransferStatus("File transfer completed.");
    };

    channel.onerror = (error) => {
      console.error("DataChannel error:", error);
      setTransferStatus("Error occurred during file transfer.");
    };

    channel.onopen = () => {
      console.log("DataChannel is open.");
      sendFiles(channel);
    };
  };

  const startSharing = async () => {
    if (!peerJoined) {
      alert("Waiting for a peer to join the room...");
      return;
    }

    setIsSharing(true)

    const conn = new RTCPeerConnection(configuration);
    setConnection(conn);

    const channel = conn.createDataChannel("file-transfer");
    setDataChannel(channel);

    handleDataChannelEvents(channel);

    conn.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);

    socket.emit("offer", { roomId, offer });
    console.log("Offer sent to room:", roomId);

    socket.on("answer", async ({ answer }) => {
      await conn.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("Answer received and set.");
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (candidate) {
        await conn.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("ICE candidate added.");
      }
    });
  };

  useEffect(() => {
    socket.on("peer-joined", () => {
      setPeerJoined(true);
      console.log("Peer joined the room.");
    });

    return () => {
      socket.off("peer-joined");
    };
  }, [socket]);

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-2xl font-bold mb-4 text-black dark:text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        File Sender
      </motion.h1>
      <motion.div
        {...getRootProps()}
        className={`p-6 mb-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
            : "border-gray-300 dark:border-gray-600"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        <p className="text-purple-500 dark:text-purple-300">
          Drop files here or click to upload
        </p>
      </motion.div>
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
              Selected Files:
            </h2>
            <ul className="space-y-1 max-h-40 overflow-y-scroll border border-gray-200 dark:border-gray-700 rounded-md p-2">
              {files.map((file, index) => (
                <motion.li
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-300 flex justify-between items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>
                    {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button
                    onClick={() => removeFile(index)}
                    className="ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded"
                  >
                    Remove
                  </Button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-4">
        {roomId ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
              Sharing Link:
            </h2>
            <div className="flex items-center space-x-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
              <input
                type="text"
                value={`${link}join/${roomId}`}
                readOnly
                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
              <CopyButton text={`${link}join/${roomId}`} />
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={generateLink}
            className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Generate Sharing Link
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {peerJoined && files.length > 0 && (
          <motion.button
            onClick={startSharing}
            className={`w-full py-2 text-white font-medium rounded-md transition-colors duration-300 ${
              isSharing
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800"
            }`}
            disabled={isSharing}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: isSharing ? 1 : 1.05 }}
            whileTap={{ scale: isSharing ? 1 : 0.95 }}
          >
            {isSharing ? "Sharing" : "Start Sharing Files"}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {transferStatus && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
              Transfer Status:
            </h2>
            <p className="text-slate-500 dark:text-slate-300 mb-2">
              {transferStatus}
            </p>
            {transferProgress > 0 && (
              <motion.div
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="bg-green-500 h-2.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${transferProgress}%` }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
