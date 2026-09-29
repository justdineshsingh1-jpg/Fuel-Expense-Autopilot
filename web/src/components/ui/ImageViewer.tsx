import React, { useState } from 'react';
import Image from 'next/image';
import { Modal } from './Modal';
import { ZoomIn } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageViewer({ src, alt, className }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">No Image</div>;

  return (
    <>
      <div 
        className={`relative group cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-gray-50 ${className || 'h-32 w-full'}`}
        onClick={() => setIsOpen(true)}
      >
        <Image src={src} alt={alt} fill className="object-cover transition-transform group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="text-white h-6 w-6" />
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={alt}>
        <div className="relative h-[60vh] w-full">
          <Image src={src} alt={alt} fill className="object-contain" />
        </div>
      </Modal>
    </>
  );
}
