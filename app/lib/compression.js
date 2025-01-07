import Pako from "pako";

export const compressFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const compressed = Pako.Deflate(new Uint8Array(arrayBuffer))
    return compressed;
}

export const decompressFile = async (compressdFile) => {
    const decompressed = Pako.inflate(new Uint8Array(compressdFile))
    return decompressed;
}