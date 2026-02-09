import { useState, useEffect } from 'react';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      // Try to get stored user first (synchronous)
      const storedUser = LocalAuthClient.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
      
      // Then verify with server (async)
      const currentUser = await LocalAuthClient.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    LocalAuthClient.signOut();
  };

  if (!user) return null;

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut size={16} className="mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
