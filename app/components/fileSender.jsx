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
    <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-black">File Sender</h1>
      <div
        {...getRootProps()}
        className={`p-6 mb-4 border-2 border-dashed rounded-lg text-center cursor-pointer ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-purple-700">Drop files here or click to upload</p>
      </div>
      {files.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-black">
            Selected Files:
          </h2>
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li
                key={index}
                className="text-sm text-gray-600 flex justify-between items-center"
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
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-4">
        {roomId ? (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-black">
              Sharing Link:
            </h2>
            <div className="flex items-center space-x-2 p-4">
              <input
                type="text"
                value={`${link}join/${roomId}`}
                readOnly
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800"
              />
              <CopyButton text={`${link}join/${roomId}`} />
            </div>
          </div>
        ) : (
          <button
            onClick={generateLink}
            className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Generate Sharing Link
          </button>
        )}
      </div>

      {peerJoined && files.length > 0 && (
        <button
          onClick={startSharing}
          className={`w-full py-2 text-white font-medium rounded-md ${
            isSharing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
          disabled={isSharing}
        >
          {isSharing ? "Sharing" : "Start Sharing Files"}
        </button>
      )}
      {transferStatus && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Transfer Status:</h2>
          <p className="text-slate-500">{transferStatus}</p>
          {transferProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-green-500 h-2.5 rounded-full"
                style={{ width: `${transferProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
