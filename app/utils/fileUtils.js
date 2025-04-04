import { deflateSync } from "fflate";

async function getBandwidthStats(peerConnection) {
    const stats = await peerConnection.getStats();
    let availableBitrate = 0;

    stats.forEach(report => {
        if (report.type === "candidate-pair" && report.nominated) {
            availableBitrate = report.availableOutgoingBitrate;
        }
    });

    return availableBitrate; // in bits per second
}

export const getDynamicChunkSize = async (peerConnection, channel, fileBuffer, offset) => {
    const TARGET_BUFFER = 60000;  // Prevents WebRTC congestion
    const MIN_CHUNK_SIZE = 10000;
    const MAX_CHUNK_SIZE = 160000;

    // 🟢 Available buffer space (prevents buffer overloading)
    const availableBuffer = TARGET_BUFFER - channel.bufferedAmount;
    if (availableBuffer < MIN_CHUNK_SIZE) return 0;

    // 🟢 Fetch real-time network stats
    let bandwidth = 1000000; // Default to 1Mbps if unavailable
    const stats = await peerConnection.getStats();

    stats.forEach(report => {
        if (report.type === "candidate-pair" && report.nominated) {
            bandwidth = report.availableOutgoingBitrate || bandwidth;
        }
    });

    console.log("📡 Available Bandwidth:", bandwidth / 1000, "kbps");

    // 🟢 Compute chunk size based on bandwidth (use ~10% of bitrate)
    const dynamicChunkSize = Math.min(
        Math.max(bandwidth / 8 / 2, MIN_CHUNK_SIZE), // Ensure min chunk size
        MAX_CHUNK_SIZE,
        availableBuffer,
        fileBuffer.byteLength - offset // Avoid exceeding file size
    );

    console.log("📝 Dynamic Chunk Size:", dynamicChunkSize);

    return Math.floor(dynamicChunkSize);
};



export const compressionChunk = (chunk) => {
    const chunkInUInt8Buffer = new Uint8Array(chunk);
    const compressedData = deflateSync(chunkInUInt8Buffer);
    console.log(
        "Data is compressing... And the data length after compression is...",
        compressedData.length
    );
    return compressedData;
}


export const shouldCompress = (fileMimeType) => {
    if (!fileMimeType) return true;

    const nonCompressibleTypes = [
        "video/",
        "audio/",
        "image/",
        "application/zip",
        "application/x-rar",
        "application/pdf",
        "application/x-7z-compressed",
    ];

    return !nonCompressibleTypes.some((prefix) =>
        fileMimeType.startsWith(prefix)
    );
};

export const isItWorthCompressing = (fileBuffer) => {
    const compressed = deflateSync(fileBuffer);
    const compressionRatio = compressed.length / fileBuffer.length;
    return compressionRatio < 0.9;
};