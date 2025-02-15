// zstdHelper.js
import { ZstdCodec } from 'zstd-codec';

let simpleZstd = null;

// Initialize the codec and cache the Simple instance
export const initZstd = () =>
    new Promise((resolve) => {
        ZstdCodec.run((zstd) => {
            simpleZstd = new zstd.Simple();
            resolve();
        });
    });

// Compress a chunk using Zstd
export const compressWithZstd = (chunk) => {
    if (!simpleZstd) {
        throw new Error('Zstd has not been initialized. Call initZstd() first.');
    }
    // Ensure the chunk is a Uint8Array
    const input = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    // Compress returns a Uint8Array containing the compressed data.
    return simpleZstd.compress(input);
};

// Decompress a chunk using Zstd
export const decompressWithZstd = (compressedChunk) => {
    if (!simpleZstd) {
        throw new Error('Zstd has not been initialized. Call initZstd() first.');
    }
    // Ensure the compressed chunk is a Uint8Array
    const input = compressedChunk instanceof Uint8Array ? compressedChunk : new Uint8Array(compressedChunk);
    // Decompress returns a Uint8Array containing the decompressed data.
    return simpleZstd.decompress(input);
};
