import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const PrivacyToggle = () => {
  const { privacyMode, togglePrivacy } = useAuthStore();
  return (
    <button onClick={togglePrivacy} className="p-2 rounded-full hover:bg-muted transition-colors">
      {privacyMode ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
};

export default PrivacyToggle;
