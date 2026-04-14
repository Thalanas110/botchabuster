import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Copy, LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import { storageService } from "@/integrations/supabase/services/StorageService";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateEmail, updatePassword, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  const initials = useMemo(() => {
    const source = fullName.trim() || user?.email || "User";
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x.charAt(0).toUpperCase())
      .join("");
  }, [fullName, user?.email]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    void loadProfile(user.id);
  }, [user]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("meatlens-theme");
    const isLight = storedTheme === "light";
    setIsLightMode(isLight);
    document.documentElement.dataset.theme = isLight ? "light" : "dark";
  }, []);

  const loadProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await profileClient.getProfile(userId);
      setProfile(data);
      setFullName(data?.full_name ?? "");
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await storageService.uploadInspectionImage(file, user.id);
      const updated = await profileClient.updateProfile(user.id, { avatar_url: avatarUrl });
      setProfile(updated);
      toast.success("Profile image updated");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error("Failed to upload profile image");
    } finally {
      event.target.value = "";
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    setIsSavingProfile(true);
    try {
      let changed = false;
      if (trimmedName !== (profile?.full_name ?? "")) {
        const updatedProfile = await profileClient.updateProfile(user.id, { full_name: trimmedName || null });
        setProfile(updatedProfile);
        changed = true;
      }

      if (trimmedEmail && trimmedEmail !== (user.email ?? "")) {
        await updateEmail(trimmedEmail);
        changed = true;
        toast.success("Email update sent. Please confirm from your inbox.");
      }

      if (!changed) {
        toast.message("No profile changes to save");
        return;
      }

      if (trimmedEmail === (user.email ?? "")) {
        toast.success("Profile updated");
      }
    } catch (err) {
      console.error("Save profile failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      toast.error("Enter a new password");
      return;
    }
    if (password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(password.trim());
      setPassword("");
      toast.success("Password updated");
    } catch (err) {
      console.error("Password update failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCopyCode = async () => {
    const code = profile?.inspector_code?.trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Inspector code copied");
    } catch {
      toast.error("Failed to copy inspector code");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Failed to sign out");
    }
  };

  const handleThemeToggle = () => {
    const nextIsLight = !isLightMode;
    setIsLightMode(nextIsLight);
    document.documentElement.dataset.theme = nextIsLight ? "light" : "dark";
    window.localStorage.setItem("meatlens-theme", nextIsLight ? "light" : "dark");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Profile" subtitle="Inspector account center" />

      <div className="px-4">
        <div className="rounded-2xl border-2 border-border/80 bg-card/90 p-4 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.7)]">
          <div className="grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-xl border-2 border-border">
                <div className="grid min-h-[220px] grid-cols-1 sm:grid-cols-2">
                  <div className="flex flex-col items-center justify-center gap-3 border-b-2 border-border p-4 sm:border-b-0 sm:border-r-2">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profile avatar" />
                      <AvatarFallback className="font-display text-lg uppercase tracking-wider">
                        {initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-full space-y-1">
                      <Label htmlFor="profile-image" className="text-xs uppercase tracking-widest text-muted-foreground">
                        Profile Image
                      </Label>
                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-3 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Access Code
                    </div>
                    <p className="break-words font-display text-base tracking-wider">
                      {profile?.inspector_code || "No assigned inspector code"}
                    </p>
                    {profile?.inspector_code && (
                      <Button variant="outline" className="w-full gap-2" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-2 rounded-xl border-2 border-border text-sm font-display uppercase tracking-wider"
                onClick={handleThemeToggle}
              >
                {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {isLightMode ? "Dark Mode" : "Light Mode"}
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-2 rounded-xl border-2 border-border text-sm font-display uppercase tracking-wider"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </section>

            <section className="space-y-4">
              <div className="overflow-hidden rounded-xl border-2 border-border">
                <div className="space-y-0">
                  <div className="space-y-2 p-4">
                    <Label htmlFor="fullName" className="text-xs uppercase tracking-widest text-muted-foreground">
                      Name
                    </Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="border-t-2 border-border p-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
                        Email
                      </Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="border-t-2 border-border p-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || isUploadingAvatar}
                    className="h-10 rounded-lg font-display text-xs uppercase tracking-widest"
                  >
                    {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Profile
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border-2 border-border p-4">
                <div className="mb-3 font-display text-sm uppercase tracking-wider text-muted-foreground">
                  Password Reset Section
                </div>
                <div className="space-y-3">
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button onClick={handleUpdatePassword} disabled={isSavingPassword} className="h-10 rounded-lg">
                    {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Password
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
