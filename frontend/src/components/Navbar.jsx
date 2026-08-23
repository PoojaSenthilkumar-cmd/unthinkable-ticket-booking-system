import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        TicketSphere
      </Link>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>

        {user ? (
          <div className="user-menu">
            <span className="user-pill">
              {user.name} <small>{user.role}</small>
            </span>
            <button className="btn btn-outline" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-links">
            <Link className="btn btn-ghost" to="/login">
              Login
            </Link>
            <Link className="btn btn-primary" to="/register">
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
