"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { translations } from "@/lib/translations"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  selectedImage: File | null
  onClear: () => void
}

export function ImageUpload({ onImageSelect, selectedImage, onClear }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        onImageSelect(file)
        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setPreview(reader.result as string)
          }
          reader.readAsDataURL(file)
        } else {
          setPreview(null)
        }
      }
    },
    [onImageSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  })

  const handleClear = () => {
    setPreview(null)
    onClear()
  }

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-2">{translations.dragAndDrop}</p>
          <p className="text-xs text-muted-foreground">{translations.supportedFormats}</p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileImage className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{selectedImage.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedImage.size / 1024 / 1024).toFixed(2)} МБ</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {preview && (
            <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
