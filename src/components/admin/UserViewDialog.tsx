import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User } from "@/hooks/useUsers";
import { format } from "date-fns";

interface UserViewDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserViewDialog({ user, open, onOpenChange }: UserViewDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Complete information about {user.full_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-sm">{user.full_name}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm">{user.email}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
            <p className="text-sm">
              {user.date_of_birth ? format(new Date(user.date_of_birth), "PPP") : "Not provided"}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Role</label>
            <div className="mt-1">
              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Subscription Plan</label>
            <div className="mt-1">
              <Badge variant={user.subscription_plan === 'premium' ? 'default' : 'outline'}>
                {user.subscription_plan || 'trial'}
              </Badge>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Registered At</label>
            <p className="text-sm">{format(new Date(user.created_at), "PPp")}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="text-sm">{format(new Date(user.updated_at), "PPp")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}