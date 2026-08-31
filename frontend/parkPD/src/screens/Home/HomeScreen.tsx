import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { globalStyles, minInset } from '../../theme';
import { styles } from './HomeScreen.styles';

/**
 * Placeholder for whatever the app's first signed-in screen turns out to be.
 *
 * It exists because the session had to land somewhere: the navigator swaps the
 * auth stack for this one as soon as a user is held, and signing out is a
 * feature of the token work rather than of the product on top of it. Replace
 * the body; keep the sign-out control somewhere reachable.
 */
function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    // signOut clears the session either way, so the screen never has to handle
    // a failure here - the navigator unmounts it regardless. Awaited so the
    // dialog keeps saying what it is doing until that happens.
    await signOut();
  };

  return (
    <View
      style={[
        globalStyles.screen,
        {
          paddingTop: Math.max(minInset.top, insets.top),
          paddingBottom: Math.max(minInset.bottom, insets.bottom),
        },
      ]}
    >
      <Text style={globalStyles.title}>
        {user?.fullName ? `Hello, ${user.fullName}` : 'Hello'}
      </Text>
      <Text style={globalStyles.subtext}>
        You are signed in. Parking features will appear here.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
        </View>
        {user?.dob ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date of birth</Text>
            <Text style={styles.rowValue}>{user.dob}</Text>
          </View>
        ) : null}
      </View>

      <View style={globalStyles.spacer} />

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => setIsConfirming(true)}
        disabled={isSigningOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out of parkPD"
        activeOpacity={0.9}
      >
        <Text style={styles.signOutText}>
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Text>
      </TouchableOpacity>

      {/* Said plainly, and it names the consequence rather than asking "are you
          sure?" - getting back in means waiting on a new code by email. */}
      <ConfirmDialog
        visible={isConfirming}
        title="Sign out of parkPD?"
        message="You will need a new code sent to your email the next time you sign in."
        confirmLabel={isSigningOut ? 'Signing out...' : 'Sign out'}
        cancelLabel="Stay signed in"
        destructive
        busy={isSigningOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setIsConfirming(false)}
      />
    </View>
  );
}

export default HomeScreen;
