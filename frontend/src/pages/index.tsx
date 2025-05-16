// pages/auth.js or any other page
import TwoFactorAuth from '../components/TwoFactorAuth';

export default function AuthPage() {
  return (
    <div className="container mx-auto py-8">
      <TwoFactorAuth />
    </div>
  );
}