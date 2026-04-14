import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  UserRound,
} from "lucide-react";
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

  const inspectorCode = profile?.inspector_code || "No assigned inspector code";
  const roleLabel = "Inspector";

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    void loadProfile(user.id);
  }, [user]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("meatlens-theme");
    const isLight = storedTheme !== "dark";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-background"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">My Profile</h1>
            <p className="text-xs text-muted-foreground">Inspector account center</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_20px_65px_-34px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 border-2 border-border/80">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profile avatar" />
                    <AvatarFallback className="font-display text-base uppercase tracking-wider">{initials || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-display text-2xl font-semibold leading-tight">{fullName || "Unnamed User"}</h2>
                    <p className="text-sm text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-display uppercase tracking-widest text-primary">
                  Active
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground">
                  <Mail className="h-4 w-4" />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground">
                  <Phone className="h-4 w-4" />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground">
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-1 rounded-xl border border-border/70 bg-background/55 p-3">
                  <Label htmlFor="profile-image" className="text-[11px] uppercase tracking-widest text-muted-foreground">
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
                <div className="rounded-xl border border-border/70 bg-background/55 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Access Code
                    </div>
                    {profile?.inspector_code && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={handleCopyCode}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <p className="break-words font-display text-sm tracking-widest">{inspectorCode}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-card/90 p-4">
              <h3 className="mb-3 font-display text-lg font-semibold">Detailed Information</h3>
              <div className="space-y-2">
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">{fullName || "Not set"}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Email Address</p>
                  <p className="break-all text-sm font-medium">{email || user?.email || "Not set"}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Inspector Code</p>
                  <p className="text-sm font-medium">{inspectorCode}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Theme</p>
                  <p className="text-sm font-medium">{isLightMode ? "Light Mode" : "Dark Mode"}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl border border-border/70 bg-card/92 p-4 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
                  <Label htmlFor="fullName" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Name
                  </Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 bg-background/65" />
                </div>
                <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.14)] p-3">
                  <Label htmlFor="email" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Email
                  </Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 bg-background/65" />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || isUploadingAvatar}
                  className="h-10 rounded-xl px-5 font-display text-xs uppercase tracking-widest"
                >
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRound className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
                <h3 className="font-display text-lg font-semibold">Password Reset Section</h3>
                <p className="mt-1 text-xs text-muted-foreground">Change password directly while signed in.</p>
                <div className="mt-4 space-y-3">
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-11 rounded-xl bg-background/60"
                  />
                  <Button onClick={handleUpdatePassword} disabled={isSavingPassword} className="h-11 rounded-xl px-5">
                    {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Password
                  </Button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
                <h3 className="font-display text-base font-semibold">Actions</h3>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleThemeToggle}
                    className="h-11 w-full justify-start gap-2 rounded-xl border border-border/80"
                  >
                    {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {isLightMode ? "Switch to Dark" : "Switch to Light"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="h-11 w-full justify-start gap-2 rounded-xl border border-border/80"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
