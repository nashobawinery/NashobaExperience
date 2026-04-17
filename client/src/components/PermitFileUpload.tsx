import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, X, Check } from "lucide-react";

interface PermitFileUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function PermitFileUpload({ value, onChange, disabled = false }: PermitFileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Only PDF files are allowed for food permits.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Permit files must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/media/food-trucks/permit-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update the form with the new URL
      onChange(result.url);
      setUploadedFile({
        name: result.filename,
        size: result.size
      });

      toast({
        title: "Permit Uploaded",
        description: "Food permit PDF has been uploaded successfully.",
      });

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Permit upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload permit file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    onChange('');
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <Label>Food Permit Document</Label>
      
      {!value ? (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="cursor-pointer"
            data-testid="input-permit-file"
          />
          <p className="text-xs text-muted-foreground">
            Upload a PDF of the Board of Health permit (Max 10MB)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {uploadedFile?.name || 'Permit Document'}
              </p>
              {uploadedFile?.size && (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
              data-testid="button-remove-permit"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1"
              data-testid="button-view-permit"
            >
              <a href={value} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                View Permit
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              data-testid="button-replace-permit"
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace
            </Button>
          </div>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
            data-testid="input-permit-file-hidden"
          />
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Uploading permit...
        </div>
      )}
    </div>
  );
}
