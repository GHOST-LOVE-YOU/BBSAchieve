import { useEffect, useState } from "react";

import { useMobileAuth } from "./useMobileAuth";

type KindeUser = {
  id: string;
  givenName: string;
  familyName: string;
  email: string;
};

export function useKindeUser() {
  const auth = useMobileAuth();
  const [user, setUser] = useState<KindeUser | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setUser(null);
      return;
    }
    void auth.getUserProfile().then((profile) => {
      if (profile) {
        setUser({
          id: profile.id,
          givenName: profile.givenName,
          familyName: profile.familyName,
          email: profile.email,
        });
      }
    });
  }, [auth.isAuthenticated]);

  return user;
}
