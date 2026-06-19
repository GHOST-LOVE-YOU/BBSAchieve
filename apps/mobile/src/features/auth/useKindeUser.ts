import { useEffect, useRef, useState } from "react";

import { useMobileAuth } from "./useMobileAuth";

type KindeUser = {
  id: string;
  givenName: string;
  familyName: string;
  email: string;
};

export function useKindeUser() {
  const { getUserProfile, isAuthenticated } = useMobileAuth();
  const [user, setUser] = useState<KindeUser | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    let active = true;
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;

    const load = async () => {
      if (!isAuthenticated) {
        if (!active || requestVersionRef.current !== requestVersion) return;
        setUser(null);
        return;
      }

      try {
        const profile = await getUserProfile();
        if (!active || requestVersionRef.current !== requestVersion) return;

        if (profile) {
          setUser({
            id: profile.id,
            givenName: profile.givenName,
            familyName: profile.familyName,
            email: profile.email,
          });
        } else {
          setUser(null);
        }
      } catch {
        if (!active || requestVersionRef.current !== requestVersion) return;
        setUser(null);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [getUserProfile, isAuthenticated]);

  return user;
}
