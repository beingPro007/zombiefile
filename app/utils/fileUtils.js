import { deflateSync } from "fflate";

export const getDynamicChunkSize = (channel, fileBuffer, offset) => {
    const TARGET_BUFFER = 75000;
    const MIN_CHUNK_SIZE = 10000;
    const MAX_CHUNK_SIZE = 100000;

    const availableBuffer = TARGET_BUFFER - channel.bufferedAmount;

    if (availableBuffer < MIN_CHUNK_SIZE) return 0;

    const remainingBytes = fileBuffer.byteLength - offset;
    const maxPossible = Math.min(
        availableBuffer,
        MAX_CHUNK_SIZE,
        remainingBytes
    );

    const dynamicChunkSize =
        Math.floor(Math.random() * (maxPossible - MIN_CHUNK_SIZE + 1)) +
        MIN_CHUNK_SIZE;

    return dynamicChunkSize;
}

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