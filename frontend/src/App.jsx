import "./App.css";
import { Routes, Route, Link } from "react-router-dom";
import Eligibility from "./pages/Eligibility";

function Home() {
  return (
    <div className="extension-container">

      <header className="extension-header">
        <div>
          <h2>Smart e-District Delhi</h2>
          <p>Citizen Assistance Extension</p>
        </div>

        <span className="extension-status">
          ● e-District Assistant
        </span>
      </header>

      <main className="extension-main">

        <h1>How can we help you?</h1>

        <p>
          Find government schemes and services based on your
          eligibility.
        </p>

        <div className="extension-actions">

          <Link
            to="/eligibility"
            className="extension-button"
          >
            Check My Eligibility
          </Link>

          <button className="extension-button secondary">
            Find a Service
          </button>

        </div>

        <div className="extension-info">

          <div className="info-card">
            <h3>Find Schemes</h3>
            <p>
              Discover government schemes you may be eligible for.
            </p>
          </div>

          <div className="info-card">
            <h3>Check Eligibility</h3>
            <p>
              Answer a few questions and get personalized schemes.
            </p>
          </div>

          <div className="info-card">
            <h3>Ask Assistant</h3>
            <p>
              Ask about certificates, documents and application
              procedures.
            </p>
          </div>

        </div>

      </main>

      <footer className="extension-footer">
        Smart e-District Delhi
      </footer>

    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/eligibility"
        element={<Eligibility />}
      />
    </Routes>
  );
}

export default App;