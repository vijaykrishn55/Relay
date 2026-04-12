import { Loader } from 'lucide-react'

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="p-8 flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block">
          <Loader className="animate-spin h-12 w-12 text-neon-cyan mb-4 drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]" />
        </div>
        <p className="text-gray-300">{message}</p>
      </div>
    </div>
  )
}

export default LoadingSpinner