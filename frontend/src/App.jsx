import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/dashboard';
import Chat from './pages/chat';
import Models from './pages/models';
import Memory from './pages/memory';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/models" element={<Models />} />
            <Route path="/memory" element={<Memory />} />
          </Routes>
        </Layout>
      </ChatProvider>
    </BrowserRouter>
  )
}

export default App;