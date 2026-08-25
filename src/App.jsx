import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login/Login";
import Verification from "./pages/Verification/Verification";
import Profile from "./pages/Profile/Profile";
import Dashboard from "./pages/Dashboard/Dashboard";
import Workout from "./pages/Workout/Workout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    const [user, setUser] = useState(null);
    const [profileComplete, setProfileComplete] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser && currentUser.emailVerified) {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                setProfileComplete(userDoc.exists() && userDoc.data().isProfileComplete === true);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <h2 style={{color: 'white', textAlign: 'center'}}>Loading...</h2>;

    const rootElement = () => {
        if (!user) return <Login />;
        if (!user.emailVerified) return <Navigate to="/verify" />;
        if (!profileComplete) return <Navigate to="/onboarding" />;
        return <Navigate to="/dashboard" />;
    };

    return (
        <Router>
        <Routes>
            <Route path="/" element={rootElement()} />

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
