import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RepositoryPage } from './pages/RepositoryPage';
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="repository/:repoName" element={<RepositoryPage />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
