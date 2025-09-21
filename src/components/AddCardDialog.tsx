import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCards, formatCardNumber } from "@/hooks/useCards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddCardDialog() {
  const [open, setOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { createCard } = useCards();

  const handleCardNumberChange = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Limit to 16 digits
    const limited = cleaned.slice(0, 16);
    // Format with spaces
    setCardNumber(formatCardNumber(limited));
  };

  const handleCvcChange = (value: string) => {
    // Only allow digits and limit to 4
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setCvc(cleaned);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 16) {
      newErrors.cardNumber = "Card number must be 13-16 digits";
    }
    
    if (!cardHolderName.trim()) {
      newErrors.cardHolderName = "Card holder name is required";
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (!expiryMonth) {
      newErrors.expiryMonth = "Expiry month is required";
    }
    
    if (!expiryYear) {
      newErrors.expiryYear = "Expiry year is required";
    } else {
      const yearNum = parseInt(expiryYear);
      const monthNum = parseInt(expiryMonth);
      
      if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        newErrors.expiry = "Card has expired";
      }
    }
    
    if (!cvc || cvc.length < 3) {
      newErrors.cvc = "CVC must be 3-4 digits";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    createCard.mutate({
      card_number: cardNumber.replace(/\s/g, ''),
      card_holder_name: cardHolderName.trim(),
      expiry_month: parseInt(expiryMonth),
      expiry_year: parseInt(expiryYear),
      cvc: cvc,
    }, {
      onSuccess: () => {
        setOpen(false);
        // Reset form
        setCardNumber("");
        setCardHolderName("");
        setExpiryMonth("");
        setExpiryYear("");
        setCvc("");
        setErrors({});
      }
    });
  };

  // Generate years array (current year + 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Card</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19} // 16 digits + 3 spaces
            />
            {errors.cardNumber && (
              <p className="text-sm text-destructive">{errors.cardNumber}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cardHolderName">Card Holder Name</Label>
            <Input
              id="cardHolderName"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              placeholder="John Doe"
            />
            {errors.cardHolderName && (
              <p className="text-sm text-destructive">{errors.cardHolderName}</p>
            )}
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
                    <SelectItem key={month} value={month.toString()}>
                      {month.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expiryMonth && (
                <p className="text-sm text-destructive">{errors.expiryMonth}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiryYear">Year</Label>
              <Select value={expiryYear} onValueChange={setExpiryYear}>
                <SelectTrigger>
                  <SelectValue placeholder="YYYY" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expiryYear && (
                <p className="text-sm text-destructive">{errors.expiryYear}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                value={cvc}
                onChange={(e) => handleCvcChange(e.target.value)}
                placeholder="123"
                maxLength={4}
              />
              {errors.cvc && (
                <p className="text-sm text-destructive">{errors.cvc}</p>
              )}
            </div>
          </div>
          
          {errors.expiry && (
            <p className="text-sm text-destructive">{errors.expiry}</p>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCard.isPending}>
              {createCard.isPending ? "Adding..." : "Add Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}