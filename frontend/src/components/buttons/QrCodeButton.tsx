import QrCodeIcon from "@/assets/QrCodeIcon";
import { useState } from "react";

interface Props {
  qrCodeImage: string;
}

export default function QrCodeButton({ qrCodeImage }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 w-10 h-10 rounded flex items-center justify-center bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
        aria-label={"Show QR code to access this checklist on your phone"}
        title={"QR Code"}
      >
        <QrCodeIcon />
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <img
            src={qrCodeImage}
            alt="QR Code"
            className="max-w-full max-h-full rounded-lg shadow-lg"
          />
        </div>
      )}
    </>
  );
}
