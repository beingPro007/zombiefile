"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import styles from "./FileReceiver.module.css";

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

     const signalingServer =
        process.env.NODE_ENV !== "development"
          ? "https://zombie-file-p2p-server-1060514353958.us-central1.run.app/"
          : "http://localhost:3000";
    
      const socket = useMemo(
        () =>
          io(signalingServer),
        [signalingServer]
      );

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
            const dataChannel = event.channel;

            let chunks = [];
            let currentFileMimeType = null;
            let currentFileName = null;
            let receivedSize = 0;

            dataChannel.onmessage = (event) => {
                if (typeof event.data === "string") {
                    console.log("Message received:", event.data);

                    if (event.data.startsWith("MIME:")) {
                        currentFileMimeType = event.data.replace("MIME:", "");
                        setFileMimeType(currentFileMimeType);
                        console.log("MIME type set to:", currentFileMimeType);
                    } else if (event.data.startsWith("NAME:")) {
                        currentFileName = event.data.replace("NAME:", "");
                        setFileName(currentFileName);
                        console.log("File name set to:", currentFileName);
                    } else if (event.data.startsWith("SIZE:")) {
                        const size = parseInt(event.data.split(":")[1], 10);
                        setExpectedFileSize(size);
                        console.log("File size set to:", size);
                    } else if (event.data === "END") {
                        console.log("File transfer complete.");
                        const receivedFile = new Blob(chunks, { type: currentFileMimeType });
                        downloadFile(receivedFile, currentFileName);

                        // Resetting the states and the chucks so that next file transfer happens smoothly and uniquely
                        chunks = [];
                        currentFileMimeType = null;
                        currentFileName = null;
                        receivedSize = 0;
                        setFileReceived(true);
                        setProgress(100);
                    }
                } else {
                    // Handle binary data (file chunks) that means which data chunks come after the mime type initializations ans all
                    chunks.push(event.data);
                    receivedSize += event.data.byteLength;

                    // Update progress
                    if (expectedFileSize) {
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
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.header}>Room ID: {roomId || "Loading..."}</h1>
            {peerJoined ? (
                <p className={styles.info}>A peer has joined the room. File transfer will begin shortly.</p>
            ) : (
                <p className={styles.info}>Waiting for a peer to join...</p>
            )}
            {expectedFileSize && (
                <div className={styles.progressContainer}>
                    <p>Transfer progress: {progress}%</p>
                    <progress value={progress} max="100" className={styles.progressBar}></progress>
                </div>
            )}
            {fileReceived && <p className={styles.success}>File received successfully: {fileName || "Unknown file"}</p>}
        </div>
    );
}