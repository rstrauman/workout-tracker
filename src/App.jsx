import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login/Login";
import Verification from "./pages/Verification/Verification";
import Profile from "./pages/Profile/Profile";
import Workout from "./pages/Workout/Workout";

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

            <Route path="/verify" element={<Verification />} />
            
            <Route path="/onboarding" element={<Profile isOnboarding={true} />} />
            <Route path="/profile" element={<Profile isOnboarding={false} />} />
            
            {/* <Route path="/onboarding" element={<Onboarding />} /> */}
            
            <Route path="/workout" element={<Workout />} />
            
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Router>
    );
}

export default App;
