"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

export default function FileReceiver() {
    const params = useParams();
    const [roomId, setRoomId] = useState(null);
    const [receivedChunks, setReceivedChunks] = useState([]); // Store chunks
    const [fileName, setFileName] = useState(null);
    const [fileMimeType, setFileMimeType] = useState(null);
    const [peerJoined, setPeerJoined] = useState(false);
    const [fileReceived, setFileReceived] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0); // Progress percentage
    const [expectedFileSize, setExpectedFileSize] = useState(null); // Expected file size

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

        socket.emit("join-room", queryRoomId);

        socket.on("peer-joined", () => {
            setPeerJoined(true);
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

        socket.on("offer", async ({ offer }) => {
            await connection.setRemoteDescription(offer);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            socket.emit("answer", { roomId: queryRoomId, answer });
        });

        connection.ondatachannel = (event) => {
            setPeerJoined(true);
            dataChannel = event.channel;

            const chunks = [];
            let currentFileMimeType = null;
            let currentFileName = null;

            dataChannel.onmessage = (event) => {
                if (typeof event.data === "string") {
                    if (currentFileMimeType === null) {
                        currentFileMimeType = event.data;
                        setFileMimeType(currentFileMimeType);
                    } else if (currentFileName === null) {
                        currentFileName = event.data;
                        setFileName(currentFileName);
                    } else if (event.data.startsWith("SIZE:")) {
                        const size = parseInt(event.data.split(":")[1], 10);
                        setExpectedFileSize(size);
                    } else if (event.data === "END") {
                        const receivedFile = new Blob(chunks, { type: currentFileMimeType });
                        downloadFile(receivedFile, currentFileName);
                        setFileReceived(true);
                    }
                } else {
                    chunks.push(event.data);
                    setReceivedChunks((prevChunks) => [...prevChunks, event.data]);

                    // Update progress based on expected size
                    if (expectedFileSize) {
                        const receivedSize = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
                        const percentage = Math.min((receivedSize / expectedFileSize) * 100, 100);
                        setProgress(Math.floor(percentage));
                    }
                }
            };

            dataChannel.onclose = () => {
                console.log("DataChannel closed.");
            };

            dataChannel.onerror = (error) => {
                setError("Error during file transfer.");
            };
        };

        return () => {
            connection.close();
            socket.disconnect();
        };
    }, [params]);

    const downloadFile = (fileBuffer, fileName) => {
        const url = URL.createObjectURL(fileBuffer);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
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
            {expectedFileSize && (
                <div>
                    <p>Transfer progress: {progress}%</p>
                    <progress value={progress} max="100"></progress>
                </div>
            )}
            {fileReceived && <p>File received successfully: {fileName || "Unknown file"}</p>}
        </div>
    );
}
