# Zombie File 🧟🧟🧟

A ***P2P file-sharing*** web application that lets you send files from one device to another without relying on an external source—except for the signaling server, which is only used at the start.

## Key Features 
- **P2P File Sending Architecture**
- **File Chunking** to reduce buffer load on the data channel
- **Encrypted Transfers** using public-key cryptography

## Future Goals
- **Faster Transfers** with Parallel Processing
- **TypeScript Support**
- **Messaging Feature**
- **Pause / Resume Functionality**
- **Retry Mechanism**
- **Modular File Structure**
- **Custom Domain (zombiefile)** independent of Vercel deployments

## Contribution
Contributions are welcome! Feel free to **fork the repo** and submit a pull request.  

## Build
### **1. Clone this repository**
```bash
git clone https://github.com/beingPro007/zombiefile.git
```

### **2. Run the Signaling Server**
#### **Using Docker (Recommended)**
Ensure you're in the correct directory:
```bash
cd zombiefile
docker build -t zombiefile/p2p-core-signaling:latest .
```
Then, run the container:
```bash
docker run -d --name p2p-signaling -p 3000:3000 zombiefile/p2p-core-signaling:latest
```

#### **Without Docker (Directly Using Node.js)**
Alternatively, you can start the server using:
```bash
npm run server
