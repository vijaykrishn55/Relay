import { useState, useEffect } from "react";
import { modelsAPI } from "../services/api";

function ModelDropdown({value, onChange, disabled}) {
  const [models, setModels] = useState([]);


  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await modelsAPI.getAll();
        setModels(response.data);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };

    fetchModels();
  }, []);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Model Selection
      </label>
              <select 
        value={value}
        onChange={(e) => { onChange(e.target.value) }}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
                <option value="">Auto (Router decides)</option>
                {models.map((model)=>(
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
  );
}

export default ModelDropdown;
