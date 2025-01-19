export async function encryptChunk(sharedSecret, chunk) {
    
    const iv = crypto.getRandomValues(new Uint8Array(12));    

    const encryptedChunk = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedSecret,
        chunk
    );

    return JSON.stringify({
        encryptedChunk: Array.from(new Uint8Array(encryptedChunk)),
        iv: Array.from(iv),
    });
    
}

export async function decryptChunk(sharedSecret, receivedData, iv) {
    
    const decryptedChunk = await crypto.subtle.decrypt(
        { name : "AES-GCM", iv: iv},
        sharedSecret,
        receivedData
    )

    return decryptedChunk;
}