import { Redirect } from 'expo-router';

// Deep link reson://auth/callback diselesaikan oleh openAuthSessionAsync; rute ini hanya mencegah
// layar "tidak ditemukan" bila Android juga mengirim tautan itu ke router. Guard memilih layar akhir.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
