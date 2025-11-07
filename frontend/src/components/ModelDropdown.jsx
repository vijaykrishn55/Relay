import { useState, useEffect } from "react";
import { modelsAPI } from "../services/api";

function ModelDropdown() {
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

    <select>
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  return (
    <div className="mb-4">
              <select 
              value={manual}
              onChange={(e)=>{setManual(e.target.value)}}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {models.map((model)=>(
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
  );
}

export default ModelDropdown;
