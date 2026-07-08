import { Link } from 'react-router-dom';
import { History, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email || '';
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 sticky top-0 z-50 flex items-center justify-between px-6 shadow-md" style={{ backgroundColor: 'rgb(0, 100, 162)' }}>
      <Link to="/" className="flex items-center gap-3">
        <img src="/logo.png" alt="ABMMC Logo" className="h-10 w-auto" />
        <div>
          <span className="text-white text-xl font-bold tracking-tight">ABMMC</span>
          <p className="text-white/70 text-xs leading-none mt-0.5">Excel Reconciliation Tool</p>
        </div>
      </Link>

      {user && (
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/history">
              <History className="w-4 h-4 mr-2" />
              History
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                <Avatar className="h-9 w-9 border border-white/30">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/history" className="cursor-pointer">
                  <History className="w-4 h-4 mr-2" />
                  Reconciliation History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
};

export default Header;
