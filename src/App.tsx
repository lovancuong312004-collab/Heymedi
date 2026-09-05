import { useState, useEffect } from "react";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ElderlyApp from "./ElderlyApp";
import CaregiverApp from "./CaregiverApp";
import { supabase } from "./lib/supabase";

export type AppRoute = "splash" | "login" | "register" | "elderly" | "caregiver";

export default function App() {
  const [route, setRoute] = useState<AppRoute>("splash");
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userMeta = session.user.user_metadata;
        setUser(session.user);
        setRoute(userMeta?.role === 'ELDERLY' ? 'elderly' : 'caregiver');
      }
    });

    // Lắng nghe sự kiện đăng nhập/đăng xuất
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRoute('login');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        const userMeta = session.user.user_metadata;
        setRoute(userMeta?.role === 'ELDERLY' ? 'elderly' : 'caregiver');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (r: AppRoute) => setRoute(r);

  return (
    <div className="flex justify-center bg-gray-300 min-h-screen">
      <div className="w-full max-w-md bg-[#F4F7FB] min-h-screen relative flex flex-col font-sans overflow-hidden shadow-2xl">
        {route === "splash"    && <SplashScreen   onDone={() => navigate("login")} />}
        {route === "login"     && <LoginScreen    onLogin={(role) => navigate(role === "elderly" ? "elderly" : "caregiver")} onRegister={() => navigate("register")} />}
        {route === "register"  && <RegisterScreen onDone={(role) => navigate(role === "elderly" ? "elderly" : "caregiver")} onBack={() => navigate("login")} />}
        {route === "elderly"   && <ElderlyApp     user={user} onLogout={async () => { await supabase.auth.signOut(); navigate("login"); }} />}
        {route === "caregiver" && <CaregiverApp   user={user} onLogout={async () => { await supabase.auth.signOut(); navigate("login"); }} />}
      </div>
    </div>
  );
}
