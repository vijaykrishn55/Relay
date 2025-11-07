import {useState, useEffect} from "react";
import {Activity, DollarSign, Zap, Database} from "lucide-react";
import MetricCard from "../components/MetricCard";
import RequestsTable from "../components/RequestsTable";
import {analyticsAPI} from "../services/api";
import LoadingSpinner from '../components/LoadingSpinner'

function Dashboard() {
        // Sample data for metrics
        // const metrics = {
        //         totalRequests: 1247,
        //         avgCost: 0.023,
        //         avgLatency: 342,
        //         activeModels: 3
        // }
        // // Sample data for requests
        // const recentRequests = [
        //         {time: '2:34 PM', model: 'GPT-4', latency: 450, cost: 0.05, status: 'success'},
        //         {time: '2:30 PM', model: 'GPT-3.5', latency: 300, cost: 0.02, status: 'success'},
        //         {time: '2:25 PM', model: 'Claude', latency: 280, cost: 0.015, status: 'error'},
        //         {time: '2:20 PM', model: 'GPT-4', latency: 500, cost: 0.06, status: 'success'},
        // ]

        const [metrics, setMetrics] = useState(null)
        const [recentRequests, setRecentRequests] = useState([])
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)

        //fetch data
        useEffect(()=>{
                fetchDashboardData()
        }, [])
        const fetchDashboardData= async()=>{
                try{
                        setLoading(true)
                        const response= await analyticsAPI.getDashboard()
                        setMetrics(response.data.metrics)
                        setRecentRequests(response.data.recentRequests)
                        setError('')
                } catch(err){
                        console.error('Error fetching dashboard data:', err)
                        setError('Failed to load dashboard data.')
                        
                } finally{
                         setLoading(false)
                }
        }
        if(loading){
                  return <LoadingSpinner message="Loading dashboard..." /> 
        }
        if(error){
                return(
                        <div className="p-8">
                                <div className="border border-red-200 rounded-lg p-4 text-red-600">
                                        {error}
                                </div>
                        </div>
                )
        }

        //fetch models 
        

        return (
                <div className="p-8">
                        {/* header */}
                        <div className="mb-8">
                                <h1 className="text-3xl font-bold text-gray-8">Dashboard</h1>
                                <p className="text-gray-600 mt-2">Monitor your AI model performance and usage</p>
                        </div>
                        {/* metrics grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md-8">
                                <MetricCard
                                title="Total Requests"
                                value={metrics.totalRequests}
                                icon={Activity}
                                
                                />
                                <MetricCard
                                title="Average Cost"
                                value={`$${metrics.avgCost}`}
                                icon={DollarSign}
                              
                                />
                                <MetricCard
                                title="Average Latency"
                                value={`${metrics.avgLatency}`}
                                icon={Zap}
                                />
                                <MetricCard
                                title="Active Models"
                                value={metrics.activeModels}
                                icon={Database}
                                />
                                <MetricCard
                                title="AI Providers"
                                value="4"
                                icon={Activity}
                                />
                        </div>
                        {/* requests table */}
                        <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Requests</h2>
                                <RequestsTable requests={recentRequests}/>
                        </div>
                </div>
        )
}

export default Dashboard;

