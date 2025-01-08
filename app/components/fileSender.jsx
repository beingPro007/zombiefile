"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromBuffer } from "file-type";
import CopyButton from "./ui/copyButton";
import { UploadIcon, LinkIcon,ShareIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FileItem } from "./ui/fileItem";


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
      className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Modern File Sharing
      </motion.h1>

      <motion.div
        {...getRootProps()}
        className={`p-8 mb-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-300 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
            : "border-gray-300 dark:border-gray-600"
        }`}
        whileHover={{ scale: 1.02, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        <UploadIcon
          className="mx-auto mb-4 text-blue-500 dark:text-blue-400"
          size={48}
        />
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Drop files here or click to upload
        </p>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
              Selected Files:
            </h2>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {files.map((file, index) => (
                <FileItem
                  key={index}
                  file={file}
                  onRemove={() => removeFile(index)}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        {roomId ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
              Sharing Link:
            </h2>
            <div className="flex items-center space-x-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <LinkIcon
                className="text-blue-500 dark:text-blue-400"
                size={20}
              />
              <input
                type="text"
                value={`${link}join/${roomId}`}
                readOnly
                className="flex-grow min-w-0 px-3 py-2 bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none"
              />
              <CopyButton text={`${link}join/${roomId}`} />
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={generateLink}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LinkIcon size={20} />
            <span>Generate Sharing Link</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {peerJoined && files.length > 0 && (
          <motion.button
            onClick={startSharing}
            className={`w-full py-3 text-white font-semibold rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 ${
              isSharing
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            }`}
            disabled={isSharing}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: isSharing ? 1 : 1.02 }}
            whileTap={{ scale: isSharing ? 1 : 0.98 }}
          >
            <ShareIcon size={20} />
            <span>{isSharing ? "Sharing" : "Start Sharing Files"}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transferStatus && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
              Transfer Status:
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              {transferStatus}
            </p>
            {transferProgress > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className="bg-green-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${transferProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
