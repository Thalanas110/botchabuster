import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { accessCodeService } from "@/integrations/supabase/services/AccessCodeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

const SignupPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error("Inspector access code is required");
      return;
    }
    setLoading(true);
    try {
      // Validate access code first
      const valid = await accessCodeService.validate(accessCode.trim());
      if (!valid) {
        toast.error("Invalid or expired access code. Contact your administrator.");
        setLoading(false);
        return;
      }
      await signUp(email, password, fullName);
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-xl uppercase tracking-wider">Create Account</CardTitle>
          <CardDescription>Join MeatLens as a verified inspector</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Inspector Access Code
              </Label>
              <Input
                id="accessCode"
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                className="font-display tracking-wider"
              />
              <p className="text-[11px] text-muted-foreground">
                Access codes are provided by your organization administrator.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full font-display uppercase tracking-wider" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
            <Link to="/" className="text-muted-foreground hover:text-foreground block text-xs mt-2">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
