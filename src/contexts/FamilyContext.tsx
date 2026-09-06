import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

interface PatientInfo {
  id: string;
  name: string;
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
      // Use maybeSingle() instead of single() to avoid throwing error when 0 rows found
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
        
        // Fetch patient profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.patient_id)
          .single();
          
        if (profile) {
          setPatientName(profile.full_name || "Người bệnh");
          setPatientInfo({
            id: profile.id,
            name: profile.full_name || "Người bệnh",
            avatar_url: profile.avatar_url,
            phone: profile.phone
          });
        } else {
          setPatientName("Người bệnh");
          setPatientInfo({ id: data.patient_id, name: "Người bệnh" });
        }
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
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
}
