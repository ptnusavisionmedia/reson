import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const { returnTo, error } = await searchParams;
  return <LoginForm returnTo={returnTo ?? null} callbackError={error === 'callback'} />;
}
