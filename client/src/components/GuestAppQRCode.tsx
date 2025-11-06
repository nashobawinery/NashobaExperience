import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Printer } from "lucide-react";
import QRCodeLib from "qrcode";

export default function GuestAppQRCode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guestAppUrl, setGuestAppUrl] = useState("");

  useEffect(() => {
    // Get the current app URL
    const url = window.location.origin;
    setGuestAppUrl(url);

    // Generate QR code
    if (canvasRef.current && url) {
      QRCodeLib.toCanvas(
        canvasRef.current,
        url,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#7C2D3A", // Primary burgundy color
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, []);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "nashoba-tasting-app-qr.png";
      link.href = url;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && canvasRef.current) {
      const imageUrl = canvasRef.current.toDataURL("image/png");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Nashoba Tasting App - QR Code</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
              }
              h1 {
                font-size: 32px;
                margin-bottom: 10px;
                text-align: center;
                color: #7C2D3A;
              }
              p {
                font-size: 18px;
                margin-bottom: 30px;
                text-align: center;
                color: #666;
              }
              img {
                max-width: 400px;
                border: 2px solid #7C2D3A;
                border-radius: 8px;
                padding: 20px;
                background: white;
              }
              .url {
                margin-top: 20px;
                font-size: 14px;
                color: #999;
                word-break: break-all;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Nashoba Valley Winery</h1>
            <p>Scan to access our Interactive Tasting Companion</p>
            <img src="${imageUrl}" alt="QR Code" />
            <div class="url">${guestAppUrl}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Guest App QR Code
        </CardTitle>
        <CardDescription>
          Display this QR code for guests to scan and access the tasting app on their phones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-muted/30 rounded-lg">
          <canvas ref={canvasRef} data-testid="canvas-qr-code" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            App URL: <span className="font-mono text-foreground">{guestAppUrl}</span>
          </p>
          
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
              data-testid="button-print-qr"
            >
              <Printer className="w-4 h-4" />
              Print QR Code
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <h4 className="font-semibold text-sm mb-2">Instructions for Staff:</h4>
          <ul className="text-sm space-y-1 text-foreground/80">
            <li>• Display this QR code at the tasting bar or on a sign</li>
            <li>• Guests can scan with their phone camera to access the app</li>
            <li>• No app download required - works directly in mobile browsers</li>
            <li>• Print or download the QR code for physical signage</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
