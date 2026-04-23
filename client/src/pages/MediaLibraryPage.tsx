import { ArrowLeft, HardDrive, Images } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaLibrary } from "@/components/MediaLibrary";
import ObjectStorageManager from "@/components/ObjectStorageManager";

export default function MediaLibraryPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">
            Search, tag, and manage shared media assets and object storage.
          </p>
        </div>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library" className="gap-2">
            <Images className="w-4 h-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="w-4 h-4" />
            Storage Manager
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <MediaLibrary />
        </TabsContent>

        <TabsContent value="storage">
          <ObjectStorageManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
