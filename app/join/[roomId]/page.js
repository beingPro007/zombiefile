"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import styles from "./FileReceiver.module.css";
import { convertToCryptoKeyFromBase64ForPrivateKey, convertToCryptoKeyFromBase64ForPublicKey, importKeyGeneration, publicKeyGenerator, sharedSecretGeneration } from "@/app/lib/keyGenerators";
import { decryptChunk } from "@/app/lib/chunksEncyptionAndDecryption";

export default function FileReceiver() {
    const params = useParams();
    const [roomId, setRoomId] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [fileMimeType, setFileMimeType] = useState(null);
    const [peerJoined, setPeerJoined] = useState(false);
    const [fileReceived, setFileReceived] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [expectedFileSize, setExpectedFileSize] = useState(null);
    const [sharedSecret, setSharedSecret] = useState(null);
    const sharedSecretRef = useRef(null);

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
        if(sharedSecret !== null){
            console.info("Shared Secret set on the receiver side successfully");
            sharedSecretRef.current = sharedSecret;
        }
    }, [sharedSecret])
    
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

            dataChannel.onmessage = async (event) => {

                if (typeof event.data === "string") {
                    
                    if (event.data.startsWith("{") && event.data.endsWith("}")) {
                        try {
                            
                            const parsedData = JSON.parse(event.data);
                            const encryptedChunk = new Uint8Array(parsedData.encryptedChunk).buffer;
                            const iv = new Uint8Array(parsedData.iv);

                            const decryptedChunk = await decryptChunk(sharedSecretRef.current, encryptedChunk, iv);

                            chunks.push(decryptedChunk);
                            receivedSize += encryptedChunk.byteLength;
                            
                            if (expectedFileSize) {
                                const percentage = Math.min((receivedSize / expectedFileSize) * 100, 100);
                                setProgress(Math.floor(percentage));
                            }
                        } catch (error) {
                            console.error("Failed to parse JSON:", error, event.data);
                        }
                    }
                    if (event.data.startsWith("MIME:")) {
                        currentFileMimeType = event.data.replace("MIME:", "");
                        setFileMimeType(currentFileMimeType);
                        console.log("MIME type set to:", currentFileMimeType);
                    } else if (event.data.startsWith("SENDERPUBLICKEY:")) {
                        
                        try {
                            //Step - 1 :- Base64 -> uint8array conversion
                            const base64SenderPublicKey = event.data.split(":")[1];
                            const binarySenderPublicKey = atob(base64SenderPublicKey);
                            const uint8ArraySenderPublicKey = new Uint8Array(binarySenderPublicKey.length);
                            for (let i = 0; i < binarySenderPublicKey.length; i++) {
                                uint8ArraySenderPublicKey[i] = binarySenderPublicKey.charCodeAt(i);
                            }
                            
                            //Step - 3 :- importKey creation --> This is created to ECDH public key object, which the Web Crypto API can now use to derive the shared secret with the receiver’s private key
                            const importKeyGenerationForSharedSecretFromUint8ArrayOfSenderPublicKey = await importKeyGeneration(uint8ArraySenderPublicKey);
    
                            //Step - 4 :- Generate receiver's key pair
                            const keyPair = await publicKeyGenerator();
                            
                            const privateCryptoKey = await convertToCryptoKeyFromBase64ForPrivateKey(keyPair.generatedPrivateKey)
                            //Step - 5 :- Generate the sharedSecret.
                            async function settingSharedSecretState() {  
                                const generatedSharedSecret = await sharedSecretGeneration(privateCryptoKey, importKeyGenerationForSharedSecretFromUint8ArrayOfSenderPublicKey);
                                setSharedSecret(generatedSharedSecret);                             
                            }
                            settingSharedSecretState();

                            //Step - 6 :- Send the receiver public key so that sender generates its own sharedSecret.
                            const publicCryptoKey = await convertToCryptoKeyFromBase64ForPublicKey(keyPair.generatedPublicKey)
                            
                            const receiverPublicKey = await crypto.subtle.exportKey("raw", publicCryptoKey);
                            
                            const receiverPublicKeyBase64 = btoa(
                                String.fromCharCode(...new Uint8Array(receiverPublicKey))
                            );
                            
                            dataChannel.send(`RECEIVERPUBLICKEY:${receiverPublicKeyBase64}`);
                        } catch (error) {
                            console.log("Error in generating the shared secret: ", error);
                            
                        }

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

                        chunks = [];
                        currentFileMimeType = null;
                        currentFileName = null;
                        receivedSize = 0;
                        setFileReceived(true);
                        setProgress(100);
                    }

                }

            };

            dataChannel.onclose = () => {
                console.log("DataChannel closed.");
            };

            dataChannel.onerror = (error) => {
                setError("Error during file transfer.", error);
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