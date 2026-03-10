import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/chat';
import Models from './pages/Models';
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
          </Routes>
        </Layout>
      </ChatProvider>
    </BrowserRouter>
  )
}

export default App;