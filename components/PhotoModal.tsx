/**
 * PhotoModal Component
 * 
 * Modal for viewing photos with navigation support
 */
import React from 'react';

export const PhotoModal: React.FC<{
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}> = ({ photos, currentIndex, onClose, onNavigate }) => {
  const [currentIdx, setCurrentIdx] = React.useState(currentIndex);

  React.useEffect(() => {
    setCurrentIdx(currentIndex);
  }, [currentIndex]);

  const handlePrevious = () => {
    if (onNavigate && photos.length > 1) {
      const newIndex = currentIdx > 0 ? currentIdx - 1 : photos.length - 1;
      setCurrentIdx(newIndex);
      onNavigate(newIndex);
    }
  };

  const handleNext = () => {
    if (onNavigate && photos.length > 1) {
      const newIndex = currentIdx < photos.length - 1 ? currentIdx + 1 : 0;
      setCurrentIdx(newIndex);
      onNavigate(newIndex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  if (photos.length === 0) return null;

  const currentPhoto = photos[currentIdx];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative max-w-7xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
        >
          ×
        </button>
        
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
              {currentIdx + 1} / {photos.length}
            </div>
          </>
        )}
        
        <img
          src={currentPhoto}
          alt={`Photo ${currentIdx + 1}`}
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
};

