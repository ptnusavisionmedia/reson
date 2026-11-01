import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { passwordSchema } from '@shared/validation/auth';

/** Layar reset password: muncul setelah tautan recovery dibuka, sebelum layar lain. */
export default function UpdatePassword() {
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    setFormError(null);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password: parsed.data });
    setSubmitting(false);
    if (err) {
      return setFormError(err.code === 'same_password' ? 'Password baru harus berbeda dari yang lama.' : authErrorMessage(err));
    }
    Alert.alert('Password diperbarui', 'Silakan masuk dengan password baru.', [{ text: 'OK', onPress: () => void finishRecovery() }]);
  }

  return (
    <Screen title="Password baru">
      <Input label="Password baru" value={password} onChangeText={setPassword} error={error} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Simpan" onPress={onSubmit} loading={submitting} />
      <Pressable accessibilityRole="button" onPress={() => void finishRecovery()} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Batal dan keluar</Text>
      </Pressable>
    </Screen>
  );
}
