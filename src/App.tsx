import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RepositoryPage } from './pages/RepositoryPage';
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
    </Router>
  );
}

export default App;
