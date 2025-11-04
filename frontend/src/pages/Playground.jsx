import {useState} from "react";
import {Send, Loader, AlertCircle} from "lucide-react";
import {aiAPI} from "../services/api";

function Playground() {

  const[input, setInput]= useState("");
  const [ output, setOutput] = useState('');
  const [ loading, setLoading ] = useState(false);
  const [modelUsed, setModelUsed ] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [strategy, setStrategy] = useState('balanced');
  const [ error, setError ] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()){
      setError('Pease enter some text');
      return;
    }
    setLoading (true);
    setError('');
    setOutput('');
    setMetrics(null);

    try{
      const response =await aiAPI.process({
        input: input,
        strategy: strategy,
        requiredCapabilities:['text-generation']
      })

      setOutput(response.data.output)
      setModelUsed(response.data.model)
      setMetrics({
        latency:`${response.data.metrics.latency}ms`,
        cost:`$${response.data.metrics.cost}`,
        tokensUsed: response.data.metrics.tokensUsed
      })
    } catch (err){
      console.error('Error processing request:', err);
      setError('Failed to process the request. Please try again.');
    } finally{
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
{/* header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Playground</h1>
        <p className="text-gray-600 mt-2">Test AI models with real-time feedback</p>
      </div>

      {/* Multi-Provider Info Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚀</div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">
              Multi-Provider AI Router Active
            </p>
            <p className="text-sm text-gray-700">
              <strong>10 FREE models</strong> from 4 providers: 
              <span className="ml-1 px-2 py-0.5 bg-white rounded text-xs">OpenRouter</span>
              <span className="ml-1 px-2 py-0.5 bg-white rounded text-xs">Mistral</span>
              <span className="ml-1 px-2 py-0.5 bg-white rounded text-xs">Cerebras</span>
              <span className="ml-1 px-2 py-0.5 bg-white rounded text-xs">Groq</span>
            </p>
            <p className="text-xs text-gray-600 mt-2">
              ⚡ Rate limits: 10-30 RPM per model • All completely free!
            </p>
          </div>
        </div>
      </div>

      {/* main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* input section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Input</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Routing Strategy</label>
              <select 
              value={strategy}
              onChange={(e)=>{setStrategy(e.target.value)}}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              >
                <option value="balanced">Balanced - Best cost-performance balance</option>
                <option value="cost-optimized">Cost Optimized - Cheapest model</option>
                <option value="performance-optimized">Performance Optimized - Fastest model</option>
                <option value="quality-optimized">Quality Optimized - Best quality</option>

              </select>
            </div>
            <textarea
              className="w-full border h-64 p-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your prompt here..."
              disabled={loading}
            />
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600"/>
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                </>
              ) : (
                <>
                <Send size={20} />
                Send Request
                </>
              )
            }
            </button>
          </form>

        </div>
          {/*output section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Output</h2>
            {!output && !loading && (
              <div className="h-64 flex items-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mx-auto">Response will appear here...</p>
              </div>
            )}
            {loading &&(
              <div className="h-64 flex items-center justify-center">
                <Loader size={32} className="animate-spin text-blue-600"/>
              </div>
            )}
            {output && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{output}</p>
              </div>
              {/* Routing Decision */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1">
                🎯 Why this model?
              </p>
              <p className="text-sm text-blue-600">
                Selected <span className="font-bold">{modelUsed}</span> because it offers the best {strategy.replace('-', ' ')}
              </p>
            </div>
              {/* Metrics */}
              {metrics && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Request Metrics
                  </h3>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600">Model Used</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        {modelUsed}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Latency</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        {metrics.latency}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">Cost</p>
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        {metrics.cost}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-600">Strategy</p>
                      <p className="text-sm font-bold text-gray-800 mt-1 capitalize">
                        {strategy.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
      </div>
    </div>
  )
}

export default Playground