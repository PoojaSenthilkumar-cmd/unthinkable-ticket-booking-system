import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import EventDetails from './pages/EventDetails';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SeatSelection from './pages/SeatSelection';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/:eventId/seats" element={<SeatSelection />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
