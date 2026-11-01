import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string; deleted?: string }> }) {
  const { returnTo, error, deleted } = await searchParams;
  return <LoginForm returnTo={returnTo ?? null} callbackError={error === 'callback'} accountDeleted={deleted === '1'} />;
}
