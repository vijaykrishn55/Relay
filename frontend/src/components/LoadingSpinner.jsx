import { Loader } from 'lucide-react'

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="p-8 flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mb-4" />
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export default LoadingSpinner