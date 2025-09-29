import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface MobileWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseContinue?: () => void; // Optional continue handler
}

const MobileWarningModal = ({ isOpen, onClose, onCloseContinue }: MobileWarningModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#0a0a0a] border border-blue-900/30 rounded-2xl p-6 max-w-sm w-full relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 opacity-50" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-white">Desktop Only</h3>
                <button 
                  className="text-gray-400 hover:text-white"
                  onClick={onClose}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-900/20 border border-blue-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-blue-400">
                    <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v9.75c0 .83.67 1.5 1.5 1.5h13.5c.83 0 1.5-.67 1.5-1.5V5.25c0-.83-.67-1.5-1.5-1.5H5.25c-.83 0-1.5.67-1.5 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  The GTX platform is currently optimized for desktop use only. The trading interface requires a larger screen for the best experience.
                </p>
                
                <p className="text-gray-300 text-sm">
                  Please access GTX from a desktop computer for full functionality and optimal trading experience.
                </p>
              </div>
              
              <div className="mt-6">
                <button
                  className="block w-full py-3 border border-blue-500/30 text-gray-300 text-center font-medium rounded-lg bg-transparent hover:bg-blue-500/10"
                  onClick={onClose}
                >
                  I Understand
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileWarningModal;