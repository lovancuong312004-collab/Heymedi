import { useState } from "react";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ElderlyApp from "./ElderlyApp";
import CaregiverApp from "./CaregiverApp";

export type AppRoute = "splash" | "login" | "register" | "elderly" | "caregiver";

export default function App() {
  const [route, setRoute] = useState<AppRoute>("splash");

  const navigate = (r: AppRoute) => setRoute(r);

  return (
    <div className="flex justify-center bg-gray-300 min-h-screen">
      <div className="w-full max-w-md bg-[#F4F7FB] min-h-screen relative flex flex-col font-sans overflow-hidden shadow-2xl">
        {route === "splash"    && <SplashScreen   onDone={() => navigate("login")} />}
        {route === "login"     && <LoginScreen    onLogin={(role) => navigate(role === "elderly" ? "elderly" : "caregiver")} onRegister={() => navigate("register")} />}
        {route === "register"  && <RegisterScreen onDone={(role) => navigate(role === "elderly" ? "elderly" : "caregiver")} onBack={() => navigate("login")} />}
        {route === "elderly"   && <ElderlyApp     onLogout={() => navigate("login")} />}
        {route === "caregiver" && <CaregiverApp   onLogout={() => navigate("login")} />}
      </div>
    </div>
  );
}
