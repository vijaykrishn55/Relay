function MetricCard({ title, value, icon:Icon, trend, trendValue}){
        return (
                <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                                <div>
                                        <p className="text-sm text-gray-500 font-medium">{title}</p>
                                        <h3 className="text-2xl font-bold text-gray-800 mt-2">{value}</h3>
                                        
                                </div>
                        {Icon && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                        <Icon className="text-blue-600" size={24}></Icon>
                                </div>
                        )}
                        </div>
                </div>
        )
}

export default MetricCard;