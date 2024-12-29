import QRCode from "qrcode";
import React from "react";

const generateQR = async (text) => {
  try {
    console.log(await QRCode.toDataURL(text));
  } catch (err) {
    console.error(err);
  }
};

function qrCodeGenerator({text}) {
  return <div>
    generateQR(text)
  </div>;
}

export default qrCodeGenerator;
