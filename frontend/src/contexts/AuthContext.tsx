import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authClient, type AuthSession, type AuthUser } from "@/integrations/api/AuthClient";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";

const USER_STORAGE_KEY = "meatlens-auth-user";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, accessCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePasswordWithRecoveryToken: (accessToken: string, password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (currentUser: AuthUser | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    try {
      const [userProfile, admin] = await Promise.all([
        profileClient.getProfile(currentUser.id),
        profileClient.hasRole(currentUser.id, "admin"),
      ]);
      setProfile(userProfile);
      setIsAdmin(admin);
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreAuth = async () => {
      const storedUserRaw = window.localStorage.getItem(USER_STORAGE_KEY);
      const storedSessionRaw = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedUserRaw) {
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUserRaw) as AuthUser;
        const parsedSession = storedSessionRaw ? JSON.parse(storedSessionRaw) as AuthSession : null;

        if (!parsedUser?.id) throw new Error("Invalid cached user");

        if (!mounted) return;

        setUser(parsedUser);
        setSession(parsedSession);
        await loadUserData(parsedUser);
      } catch (err) {
        console.error("Failed to restore auth session:", err);
        window.localStorage.removeItem(USER_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreAuth();

    return () => {
      mounted = false;
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    const result = await authClient.signIn(email, password);
    setUser(result.user);
    setSession(result.session);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.session));
    await loadUserData(result.user);
  };

  const signUp = async (email: string, password: string, fullName: string, accessCode?: string) => {
    await authClient.signUp({
      email,
      password,
      fullName,
      accessCode,
      emailRedirectTo: window.location.origin,
    });
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const resetPassword = async (email: string) => {
    await authClient.resetPassword(email, `${window.location.origin}/reset-password`);
  };

  const updatePasswordWithRecoveryToken = async (accessToken: string, password: string) => {
    await authClient.updatePasswordWithRecoveryToken(accessToken, password);
  };

  const updateEmail = async (email: string) => {
    if (!user) throw new Error("Not signed in");
    const updatedUser = await authClient.updateEmail(user.id, email);
    setUser(updatedUser);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const updatePassword = async (password: string) => {
    if (!user) throw new Error("Not signed in");
    await authClient.updatePassword(user.id, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePasswordWithRecoveryToken,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
