import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { auth, db } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import ProtectedRoute from "./components/ProtectedRoute";
import AppSkeleton from "./components/AppSkeleton";
import ModalProvider from "./components/ModalProvider";
import { faUtensils } from '@fortawesome/free-solid-svg-icons';

const Login = lazy(() => import("./pages/Login/Login"));
const Verification = lazy(() => import("./pages/Verification/Verification"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Workout = lazy(() => import("./pages/Workout/Workout"));
const Routines = lazy(() => import("./pages/Routines/Routines"));
const Progress = lazy(() => import("./pages/Progress/Progress"));
const ComingSoon = lazy(() => import("./pages/ComingSoon/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

function App() {
    const [user, setUser] = useState(null);
    const [profileComplete, setProfileComplete] = useState(false);
    const [loading, setLoading] = useState(true);

    const authCallSeq = useRef(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            const callId = ++authCallSeq.current;

            setLoading(true);
            setUser(currentUser);

            let nextProfileComplete = false;
            if (currentUser && currentUser.emailVerified) {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                nextProfileComplete = userDoc.exists() && userDoc.data().isProfileComplete === true;
            }

            // A newer onAuthStateChanged invocation has since started - discard this
            // now-stale result instead of letting it clobber the more recent one.
            if (callId !== authCallSeq.current) return;

            setProfileComplete(nextProfileComplete);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <ModalProvider><AppSkeleton /></ModalProvider>;

    const rootElement = () => {
        if (!user) return <Login />;
        if (!user.emailVerified) return <Navigate to="/verify" />;
        if (!profileComplete) return <Navigate to="/onboarding" />;
        return <Navigate to="/dashboard" />;
    };

    return (
        <ModalProvider>
        <Router>
        <Suspense fallback={<AppSkeleton />}>
        <Routes>
            <Route path="/" element={rootElement()} />

            <Route path="/verify" element={<ProtectedRoute user={user}><Verification /></ProtectedRoute>} />

            <Route path="/onboarding" element={<ProtectedRoute user={user}><Profile isOnboarding={true} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile isOnboarding={false} /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard/></ProtectedRoute>} />
            {/* <Route path="/onboarding" element={<Onboarding />} /> */}

            <Route path="/workout" element={<ProtectedRoute user={user}><Workout /></ProtectedRoute>} />
            <Route path="/workout/:workoutId" element={<ProtectedRoute user={user}><Workout /></ProtectedRoute>} />
            <Route path="/routines" element={<ProtectedRoute user={user}><Routines /></ProtectedRoute>} />

            <Route path="/meals" element={<ProtectedRoute user={user}><ComingSoon title="Meals" icon={faUtensils} description="Meal logging and macro tracking are on the way." /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute user={user}><Progress /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </Router>
        </ModalProvider>
    );
}

export default App;
