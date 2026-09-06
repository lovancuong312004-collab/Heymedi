import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

interface FamilyContextType {
  linkedPatientId: string | null;
  patientName: string | null;
  isLoading: boolean;
  refreshLink: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLink = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("family_links")
        .select("elderly_id, elderly_name")
        .eq("caregiver_id", userId)
        .limit(1)
        .single();

      if (data && data.elderly_id) {
        setLinkedPatientId(data.elderly_id);
        setPatientName(data.elderly_name || "Người bệnh");
      } else {
        setLinkedPatientId(null);
        setPatientName(null);
      }
    } catch (e) {
      console.error("Failed to fetch family link:", e);
      setLinkedPatientId(null);
      setPatientName(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLink();
  }, [userId]);

  return (
    <FamilyContext.Provider value={{ linkedPatientId, patientName, isLoading, refreshLink: fetchLink }}>
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
