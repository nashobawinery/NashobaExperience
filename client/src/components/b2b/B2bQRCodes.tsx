import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Printer } from "lucide-react";
import QRCodeLib from "qrcode";

interface QRCodeCardProps {
  title: string;
  description: string;
  path: string;
  filename: string;
  printTitle: string;
  printDescription: string;
}

function QRCodeCard({ title, description, path, filename, printTitle, printDescription }: QRCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    const url = window.location.origin + path;
    setFullUrl(url);

    if (canvasRef.current && url) {
      QRCodeLib.toCanvas(
        canvasRef.current,
        url,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#7C2D3A",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [path]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = filename;
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
            <title>${printTitle}</title>
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
            <p>${printDescription}</p>
            <img src="${imageUrl}" alt="QR Code" />
            <div class="url">${fullUrl}</div>
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

  const testIdBase = filename.replace('.png', '');
  
  return (
    <Card data-testid={`card-${testIdBase}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid={`heading-${testIdBase}`}>
          <QrCode className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription data-testid={`text-description-${testIdBase}`}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-muted/30 rounded-lg">
          <canvas ref={canvasRef} data-testid={`canvas-qr-${testIdBase}`} />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4" data-testid={`text-url-${testIdBase}`}>
            URL: <span className="font-mono text-foreground">{fullUrl}</span>
          </p>
          
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
              data-testid={`button-download-${testIdBase}`}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
              data-testid={`button-print-${testIdBase}`}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function B2bQRCodes() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" data-testid="heading-qr-codes">B2B Platform QR Codes</h2>
        <p className="text-muted-foreground" data-testid="text-qr-description">
          Generate and print QR codes for quick access to B2B platform pages
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <QRCodeCard
          title="B2B Landing Page"
          description="QR code for wholesale customers to access the B2B platform landing page"
          path="/b2b"
          filename="nashoba-b2b-landing-qr.png"
          printTitle="B2B Landing Page - QR Code"
          printDescription="Scan to access Nashoba Valley Winery B2B Platform"
        />

        <QRCodeCard
          title="Customer Login Page"
          description="QR code for wholesale customers to login directly to their accounts"
          path="/b2b/login/customer"
          filename="nashoba-b2b-customer-login-qr.png"
          printTitle="B2B Customer Login - QR Code"
          printDescription="Scan to login to your wholesale customer account"
        />
      </div>

      <Card className="bg-primary/5 border-primary/20" data-testid="card-usage-instructions">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2" data-testid="heading-usage-instructions">Usage Instructions:</h4>
          <ul className="text-sm space-y-1 text-foreground/80">
            <li data-testid="text-instruction-landing">• <strong>Landing Page QR:</strong> Display at trade shows, in marketing materials, or send to potential wholesale customers</li>
            <li data-testid="text-instruction-login">• <strong>Customer Login QR:</strong> Include in customer welcome packets or display at pickup locations for quick account access</li>
            <li data-testid="text-instruction-download">• Download individual QR codes as PNG images for use in digital materials</li>
            <li data-testid="text-instruction-print">• Print QR codes for physical signage, business cards, or promotional materials</li>
            <li data-testid="text-instruction-smartphone">• QR codes work on any smartphone camera - no app download required</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
