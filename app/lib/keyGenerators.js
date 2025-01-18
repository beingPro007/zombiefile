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

export async function sharedSecretGeneration(privateKey, importedKey) {
    try {
        console.log("Private Key:", privateKey);
        console.log("Imported Public Key:", importedKey);
        const sharedSecret = await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: importedKey, // Peer public key
            },
            privateKey, // Your private key
            { name: "AES-GCM", length: 256 }, // Derived key format
            true, // Whether the derived key is extractable
            ["encrypt", "decrypt"] // Derived key usages
        );
        return sharedSecret;
    } catch (error) {
        console.error("Error during shared secret generation:", error);
        throw error;
    }
}

export async function convertToCryptoKeyFromBase64ForPrivateKey(base64PrivateKey) {
    // Step 1: Decode the Base64 string to an ArrayBuffer
    const rawKey = Uint8Array.from(atob(base64PrivateKey), c => c.charCodeAt(0)).buffer;

    // Step 2: Import the raw key as an ECDH private key
    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8", 
        rawKey, 
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );

    return cryptoKey;
}

export async function convertToCryptoKeyFromBase64ForPublicKey(base64PublicKey) {
    // Step 1: Decode the Base64 string to an ArrayBuffer
    const rawKey = Uint8Array.from(atob(base64PublicKey), c => c.charCodeAt(0)).buffer;

    // Step 2: Import the raw key as an ECDH public key
    const cryptoKey = await crypto.subtle.importKey(
        "raw", 
        rawKey, 
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    return cryptoKey;
}