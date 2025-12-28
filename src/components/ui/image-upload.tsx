"use client";

import { UploadButton } from "@/lib/uploadthing";
import { X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "./button";

interface ImageUploadProps {
    endpoint: "recipeImage" | "platingImages";
    value: string[];
    onChange: (value: string[]) => void;
    onRemove: (url: string) => void;
    className?: string;
}

export const ImageUpload = ({
    endpoint,
    value,
    onChange,
    onRemove,
    className
}: ImageUploadProps) => {
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Image Preview Grid */}
            {value.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {value.map((url) => (
                        <div key={url} className="relative w-full aspect-square rounded-md overflow-hidden border border-border">
                            <div className="absolute top-2 right-2 z-10">
                                <Button
                                    type="button"
                                    onClick={() => onRemove(url)}
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <Image
                                fill
                                src={url}
                                alt="Image"
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            <div className="flex items-center justify-center p-4 border border-dashed rounded-md bg-muted/10">
                <UploadButton
                    endpoint={endpoint}
                    onClientUploadComplete={(res: any[]) => {
                        const urls = res.map((r: { url: any; }) => r.url);
                        onChange([...value, ...urls]);
                        toast.success("Image uploaded successfully");
                    }}
                    onUploadError={(error: Error) => {
                        toast.error(`Error: ${error.message}`);
                    }}
                    appearance={{
                        button: "bg-primary text-primary-foreground hover:bg-primary/90 ut-uploading:cursor-not-allowed"
                    }}
                />
            </div>
        </div>
    );
};
