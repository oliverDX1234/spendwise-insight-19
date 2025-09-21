import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, TrendingUp, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCards } from "@/hooks/useCards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingDialog({ isOpen, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState<'plan' | 'payment'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'premium' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { createCard } = useCards();

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");

  const handlePlanSelect = async (plan: 'trial' | 'premium') => {
    setSelectedPlan(plan);
    
    if (plan === 'trial') {
      await handleTrialSelection();
    } else {
      setStep('payment');
    }
  };

  const handleTrialSelection = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_plan: 'trial',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to your trial!",
        description: "You now have 30 days to explore the app.",
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePremiumSelection = async () => {
    if (!user || !validateCardForm()) return;

    setIsLoading(true);
    try {
      // Save card
      await createCard.mutateAsync({
        card_number: cardNumber,
        card_holder_name: cardHolderName,
        expiry_month: parseInt(expiryMonth),
        expiry_year: parseInt(expiryYear),
        cvc: cvc,
        is_default: true,
      });

      // Update user subscription
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_plan: 'premium',
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to Premium!",
        description: "You now have unlimited access to all features.",
      });
      
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateCardForm = () => {
    if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvc) {
      toast({
        title: "Validation Error",
        description: "Please fill in all card details.",
        variant: "destructive",
      });
      return false;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(expiryYear);
    const expMonth = parseInt(expiryMonth);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      toast({
        title: "Validation Error",
        description: "Card has expired.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {step === 'plan' ? 'Choose Your Plan' : 'Enter Payment Details'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'plan' && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card className="relative cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Trial Plan
                  </CardTitle>
                  <Badge variant="secondary">Free</Badge>
                </div>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">30 days free trial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 3 custom categories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 10 expenses</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <span className="h-4 w-4">×</span>
                    <span className="text-sm">No analytics access</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handlePlanSelect('trial')}
                  disabled={isLoading}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="relative cursor-pointer hover:ring-2 hover:ring-primary transition-all border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Premium Plan
                  </CardTitle>
                  <Badge>Best Value</Badge>
                </div>
                <CardDescription>Full access to all features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Full analytics dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited custom categories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited expenses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handlePlanSelect('premium')}
                  disabled={isLoading}
                >
                  Choose Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'payment' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Premium Plan Selected</h3>
              <p className="text-muted-foreground">Enter your payment details to continue</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardHolderName">Cardholder Name</Label>
                <Input
                  id="cardHolderName"
                  placeholder="John Doe"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryMonth">Month</Label>
                  <Select value={expiryMonth} onValueChange={setExpiryMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryYear">Year</Label>
                  <Select value={expiryYear} onValueChange={setExpiryYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep('plan')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={handlePremiumSelection}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}