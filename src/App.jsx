import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login/Login";
import Verification from "./pages/Verification/Verification";
import Profile from "./pages/Profile/Profile";
import Dashboard from "./pages/Dashboard/Dashboard";
import Workout from "./pages/Workout/Workout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <h2 style={{color: 'white', textAlign: 'center'}}>Loading...</h2>;

    return (
        <Router>
        <Routes>
            <Route path="/" element={
            user ? (user.emailVerified ? <Navigate to="/workout" /> : <Navigate to="/verify" />) : <Login />
            } />

            <Route path="/verify" element={<ProtectedRoute user={user}><Verification /></ProtectedRoute>} />

            <Route path="/onboarding" element={<ProtectedRoute user={user}><Profile isOnboarding={true} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile isOnboarding={false} /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard/></ProtectedRoute>} />
            {/* <Route path="/onboarding" element={<Onboarding />} /> */}

            <Route path="/workout" element={<ProtectedRoute user={user}><Workout /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Router>
    );
}

export default App;
