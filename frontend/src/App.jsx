import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  // 检查本地有没有 Token，有就认为是登录状态
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 */}
        <Route path="/login" element={<Login />} />
        {/* 主页：如果没登录，强行跳回登录页 */}
        <Route
          path="/"
          element={isLoggedIn ? <Home /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;