import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export interface PatientInfo {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  phone?: string;
}

interface FamilyContextType {
  linkedPatientId: string | null;
  patientName: string | null;
  patientInfo: PatientInfo | null;
  isLoading: boolean;
  refreshLink: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLink = async (userId: string) => {
    console.log("=== DEBUG CONTEXT: User ===", userId);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("family_links")
        .select("patient_id")
        .eq("caregiver_id", userId)
        .limit(1)
        .maybeSingle();

      console.log("=== DEBUG CONTEXT: Query Data ===", data, "Error:", error);

      if (error) throw error;

      if (data && data.patient_id) {
        setLinkedPatientId(data.patient_id);
        
        // Query user_view created in Supabase
        const { data: userProfile, error: viewErr } = await supabase
          .from('user_view')
          .select('id, full_name, email, avatar_url')
          .eq('id', data.patient_id)
          .maybeSingle();

        console.log("=== DEBUG CONTEXT: user_view profile ===", userProfile, "Error:", viewErr);

        let name = "";
        let email = "";
        let avatar_url = "";

        if (userProfile) {
          email = userProfile.email || "";
          avatar_url = userProfile.avatar_url || "";
          if (userProfile.full_name && userProfile.full_name.trim()) {
            name = userProfile.full_name.trim();
          } else if (email) {
            name = email.split('@')[0];
          }
        }

        // Secondary fallback to profiles table if needed
        if (!name) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.patient_id)
            .maybeSingle();
            
          if (profile) {
            if (profile.full_name && profile.full_name.trim()) {
              name = profile.full_name.trim();
            } else if (profile.phone) {
              name = profile.phone;
            }
            avatar_url = avatar_url || profile.avatar_url || "";
          }
        }

        // Last resort fallback
        if (!name) {
          name = "Thành viên";
        }

        setPatientName(name);
        setPatientInfo({
          id: data.patient_id,
          name: name,
          email: email,
          avatar_url: avatar_url
        });
      } else {
        setLinkedPatientId(null);
        setPatientName(null);
        setPatientInfo(null);
      }
    } catch (e) {
      console.error("Failed to fetch family link:", e);
      setLinkedPatientId(null);
      setPatientName(null);
      setPatientInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && mounted) {
        await fetchLink(session.user.id);
      } else if (mounted) {
        setIsLoading(false);
      }
    };
    
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id && mounted) {
        fetchLink(session.user.id);
      } else if (mounted) {
        setLinkedPatientId(null);
        setPatientName(null);
        setPatientInfo(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshLink = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await fetchLink(session.user.id);
    }
  };

  useEffect(() => {
    console.log("=== DEBUG CONTEXT: Patient ID ===", linkedPatientId);
  }, [linkedPatientId]);

  return (
    <FamilyContext.Provider value={{ linkedPatientId, patientName, patientInfo, isLoading, refreshLink }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    return { linkedPatientId: null, patientName: null, patientInfo: null, isLoading: false, refreshLink: async () => {} };
  }
  return context;
}
