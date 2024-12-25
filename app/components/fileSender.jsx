"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromBuffer } from "file-type";

export function FileSender() {
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [peerJoined, setPeerJoined] = useState(false);
  const [connection, setConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [transferStatus, setTransferStatus] = useState(""); // Track transfer status

  const socket = React.useMemo(() => io("http://localhost:3000"), []);

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const generateLink = () => {
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

      // First, send the MIME type
      const reader = new FileReader();

      reader.onload = async () => {
        const fileBuffer = reader.result;
        const type = await fileTypeFromBuffer(fileBuffer);
        const mimeType = type ? type.mime : "application/octet-stream"; // Default MIME type if not detected

        console.log(`Detected MIME type for ${file.name}: ${mimeType}`);

        // Send MIME type first
        channel.send(mimeType);

        // Send the file name next
        channel.send(file.name);
        console.log(`Sent file name: ${file.name}`);

        const chunkSize = 65536; // 16 KB chunks
        let offset = 0;

        const sendChunk = () => {
          if (offset < fileBuffer.byteLength) {
            if (channel.readyState === "open") {
              if (channel.bufferedAmount < chunkSize) {
                const chunk = fileBuffer.slice(offset, offset + chunkSize);
                channel.send(chunk);
                offset += chunkSize;
                console.log(
                  `Sent chunk: Offset ${offset} of ${fileBuffer.byteLength} bytes`
                );
              } else {
                console.log("BufferedAmount is high. Waiting...");
              }
              setTimeout(sendChunk, 50); // Retry after 50ms
            } else {
              setTransferStatus(
                "DataChannel is closed. File transfer aborted."
              );
              console.error("DataChannel is closed. File transfer aborted.");
            }
          } else {
            channel.send("END"); // End of file transfer
            setTransferStatus(`File transfer complete.`);
            console.log("All chunks sent. File transfer complete.");
          }
        };

        sendChunk(); // Start sending chunks
      };

      reader.onerror = (error) => {
        console.error(`Error reading file: ${file.name}`, error);
        setTransferStatus(`Error reading file: ${file.name}`);
      };

      reader.readAsArrayBuffer(file); // Read file as an ArrayBuffer
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
    <div className="max-w-md mx-auto p-6">
      <Card
        {...getRootProps()}
        className={`p-8 text-center border-dashed cursor-pointer ${
          isDragActive ? "border-primary" : "border-input"
        } bg-background`}
      >
        <input {...getInputProps()} />
        <p>Drop files here or click to upload</p>
      </Card>
      {files.length > 0 && (
        <ul>
          {files.map((file, index) => (
            <li key={index}>
              {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
            </li>
          ))}
        </ul>
      )}
      {roomId ? (
        <p>Sharing Link: http://localhost:3001/join/{roomId}</p>
      ) : (
        <Button onClick={generateLink}>Generate Sharing Link</Button>
      )}
      {peerJoined && (
        <Button onClick={startSharing}>Start Sharing Files</Button>
      )}
      <p>{transferStatus}</p> {/* Display transfer status */}
    </div>
  );
}
