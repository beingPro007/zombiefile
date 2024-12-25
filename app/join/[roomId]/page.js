"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { fileTypeFromBuffer } from "file-type";

const socket = io("http://localhost:3000");

export default function FileReceiver() {
    const params = useParams();
    const [roomId, setRoomId] = useState(null);
    const [receivedChunks, setReceivedChunks] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [fileMimeType, setFileMimeType] = useState(null); // Store MIME type
    const [peerJoined, setPeerJoined] = useState(false);
    const [fileReceived, setFileReceived] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const queryRoomId = params?.roomId;

        if (!queryRoomId) {
            setError("Room ID is missing.");
            return;
        }

        setRoomId(queryRoomId);

        const connection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        let dataChannel = null;

        // Join the room via the signaling server
        socket.emit("join-room", queryRoomId);

        socket.on("peer-joined", () => {
            setPeerJoined(true);
            console.log("Peer has joined the room.");
        });

        connection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit("ice-candidate", { roomId: queryRoomId, candidate });
            }
        };

        socket.on("ice-candidate", async ({ candidate }) => {
            if (candidate) {
                await connection.addIceCandidate(candidate);
            }
        });

        // Handle incoming offer
        socket.on("offer", async ({ offer }) => {
            await connection.setRemoteDescription(offer);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            socket.emit("answer", { roomId: queryRoomId, answer });
        });

        // Handle data channel creation by the sender
        connection.ondatachannel = (event) => {
            setPeerJoined(true)
            dataChannel = event.channel;
            console.log("DataChannel received:", dataChannel);

            const chunks = [];
            let currentFileMimeType = null;
            let currentFileName = null;

            dataChannel.onmessage = (event) => {
                if (typeof event.data === "string") {
                    if (currentFileMimeType === null) {
                        // First string message is the MIME type
                        currentFileMimeType = event.data;
                        setFileMimeType(currentFileMimeType);
                        console.log(`Received MIME type: ${currentFileMimeType}`);
                    } else if (currentFileName === null) {
                        // Second string message is the file name
                        currentFileName = event.data;
                        setFileName(currentFileName);
                        console.log(`Received file name: ${currentFileName}`);
                    } else if (event.data === "END") {
                        // End of file transfer
                        const receivedFile = new Blob(chunks, { type: currentFileMimeType });
                        downloadFile(receivedFile, currentFileName);
                        setFileReceived(true);
                        console.log("File transfer complete.");
                    }
                } else {
                    // File chunk received
                    chunks.push(event.data);
                }
            };

            dataChannel.onclose = () => {
                console.log("DataChannel closed.");
            };

            dataChannel.onerror = (error) => {
                console.error("DataChannel error:", error);
                setError("Error occurred during file transfer.");
            };
        };

        // Cleanup on unmount
        return () => {
            connection.close();
            socket.disconnect();
        };
    }, [params]);

    const downloadFile = (fileBuffer, fileName) => {
        console.log(`Starting download for file: ${fileName}`);

        // Use the file-type library to detect the MIME type from the file buffer
        const type = fileTypeFromBuffer(fileBuffer);
        const inferredMimeType = type ? type.mime : "application/octet-stream"; // Fallback if MIME type is not detected

        console.log(`Inferred MIME type for file "${fileName}": ${inferredMimeType}`);

        const blobWithType = new Blob([fileBuffer], { type: inferredMimeType });
        const url = URL.createObjectURL(blobWithType);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`Object URL revoked for file: ${fileName}`);
    };

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Room ID: {roomId || "Loading..."}</h1>
            {peerJoined ? (
                <p>A peer has joined the room. File transfer will begin shortly.</p>
            ) : (
                <p>Waiting for a peer to join...</p>
            )}
            {fileReceived ? (
                <p>File received successfully: {fileName || "Unknown file"}</p>
            ) : (
                <p>Waiting for file...</p>
            )}
        </div>
    );
}
