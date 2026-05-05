CREATE UNIQUE INDEX "human_profiles_authProvider_authSubject_key"
ON "human_profiles"("authProvider", "authSubject");
