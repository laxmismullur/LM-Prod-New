import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const LMAuthContext = createContext(null);

export function LMAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // LOAD USER FROM STORAGE
  // =========================
  useEffect(() => {
    const token = localStorage.getItem('lm_token');
    const userData = localStorage.getItem('lm_user');

    if (token && userData) {
      setUser(JSON.parse(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  // =========================
  // LOGIN FUNCTION
  // =========================
  const login = async (username, password) => {
    const res = await axios.post(
      'http://localhost:8085/api/lm/auth/login',
      { username, password }
    );

    const { token, ...userData } = res.data;

    // 🔥 SAVE TOKEN HERE (THIS IS WHAT YOU WERE ASKING)
    localStorage.setItem('lm_token', token);

    // optional user storage
    localStorage.setItem('lm_user', JSON.stringify(userData));

    // attach token globally
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const meRes = await axios.get('http://localhost:8085/api/lm/auth/me');
    const currentUser = {
      ...userData,
      ...meRes.data,
      role: meRes.data?.role || userData.role
    };

    localStorage.setItem('lm_user', JSON.stringify(currentUser));
    setUser(currentUser);

    return currentUser;
  };

  // =========================
  // LOGOUT FUNCTION
  // =========================
  const logout = () => {
    localStorage.removeItem('lm_token');
    localStorage.removeItem('lm_user');

    delete axios.defaults.headers.common['Authorization'];

    setUser(null);
  };

  return (
    <LMAuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </LMAuthContext.Provider>
  );
}

export const useLMAuth = () => useContext(LMAuthContext);
