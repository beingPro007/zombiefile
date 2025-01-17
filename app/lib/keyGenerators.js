export async function publicKeyGenerator() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true, // Extractable keys
        ["deriveKey"]
    );

    // Export the public key in raw format
    const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

    // Export the private key in PKCS8 format
    const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

    return {
        generatedPrivateKey: privateKeyBase64,
        generatedPublicKey: publicKeyBase64,
    };
}


export async function importKeyGeneration(uint8ArraySenderPublicKey){
    const generatedImportKey = await crypto.subtle.importKey(
        "raw",
        uint8ArraySenderPublicKey,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        []
    )
    return generatedImportKey;
} 

export async function sharedSecretGeneration(privateKey, importedKey){
    const sharedSecret = await crypto.subtle.deriveKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    )
    return sharedSecret
}