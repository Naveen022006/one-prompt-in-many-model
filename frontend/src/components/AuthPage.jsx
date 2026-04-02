import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPage({ onLoginComplete }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const oldLocalStorageId = localStorage.getItem("ai_hub_user_id");

    if (!isLogin) {
      // Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Account created! You may need to check your email to confirm depending on Supabase settings.");
        if (data?.session) { // Sometimes Supabase auto-logs in if confirm email is off
           onLoginComplete(data.session, oldLocalStorageId);
        }
      }
    } else {
      // Log In
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data?.session) {
        onLoginComplete(data.session, oldLocalStorageId);
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="hero-label">Authentication portal</div>
          <h1 className="auth-title">AI Hub Identity</h1>
          <p className="auth-subtitle">
            {isLogin ? "Sign in to access your curated intelligence and history." : "Create a new terminal to securely save your API keys and history."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="operator@neural.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passphrase</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Authenticating..." : isLogin ? "Initialize Session" : "Create Authorization"}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "No access node yet? " : "Already initialized? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}>
            {isLogin ? "Establish New Protocol" : "Return to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
