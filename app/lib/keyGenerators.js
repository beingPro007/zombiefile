export async function publicKeyGenerator() {
    // Generate a key pair using the Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "ECDH", 
            namedCurve: "P-256", // Use the P-256 curve
        },
        true, // Whether the key is extractable
        ["deriveKey"] // Usages of the key
    );

    // Export the public key in raw format
    const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(publicKey)));;
}
