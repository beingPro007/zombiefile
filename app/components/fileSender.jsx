"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromBuffer } from "file-type";
import qrCodeGenerator from "@/components/qrCodeGenerator";
import CopyButton from "./ui/copyButton";

export function FileSender() {
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [peerJoined, setPeerJoined] = useState(false);
  const [connection, setConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [transferStatus, setTransferStatus] = useState("");
  const [transferProgress, setTransferProgress] = useState(0);
  const [link, setlink] = useState(null)

  const socket = React.useMemo(
    () =>
      io("https://zombie-file-p2p-server-1060514353958.us-central1.run.app/"),
    []
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

  const sendFiles = (channel) => {
    setTransferStatus("Sending files...");
    console.log("Starting file transfer...");

    files.forEach((file) => {
      console.log(
        `Preparing to send file: ${file.name} (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );

      const reader = new FileReader();

      reader.onload = async () => {
        const fileBuffer = reader.result;
        const type = await fileTypeFromBuffer(fileBuffer);
        const mimeType = type ? type.mime : "application/octet-stream";

        console.log(`Detected MIME type for ${file.name}: ${mimeType}`);

        channel.send(mimeType);

        channel.send(file.name);
        console.log(`Sent file name: ${file.name}`);

        const chunkSize = 65536;
        let offset = 0;

        const sendChunk = () => {
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
              setTimeout(sendChunk, 50); 
            } else {
              setTransferStatus(
                "DataChannel is closed. File transfer aborted."
              );
              console.error("DataChannel is closed. File transfer aborted.");
            }
          } else {
            channel.send("END");
            setTransferStatus(`File transfer complete.`);
            setTransferProgress(100);
            console.log("All chunks sent. File transfer complete.");
          }
        };

        sendChunk();
      };

      reader.onerror = (error) => {
        console.error(`Error reading file: ${file.name}`, error);
        setTransferStatus(`Error reading file: ${file.name}`);
      };

      reader.readAsArrayBuffer(file);
      console.log(`Reading file: ${file.name}`);
    });
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
              <li key={index} className="text-sm text-gray-600">
                {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
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
              <CopyButton text={`${link}join/${roomId}` } />
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

      {peerJoined && (
        <button
          onClick={startSharing}
          className="w-full mb-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          Start Sharing Files
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
