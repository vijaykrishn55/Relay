import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Models from './pages/Models';

function App() {
  return (
    <BrowserRouter>
    <Layout>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/models" element={<Models />} />
            </Routes>
          </div>
        </Layout>
    </BrowserRouter>
  )
}

export default App;

//