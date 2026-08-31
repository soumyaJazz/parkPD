import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { styles, variants } from './Toast.styles';

export type ToastVariant = keyof typeof variants;

export type ToastOptions = {
  /** Small timestamp-style line under the message, e.g. "Just now". */
  meta?: string;
  /** Inline link under the message; tapping it runs onAction and dismisses. */
  actionLabel?: string;
  onAction?: () => void;
  /** Override the auto-dismiss delay. Pass 0 to keep it up until dismissed. */
  durationMs?: number;
};

type ToastPayload = ToastOptions & {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
};

const DURATION_MS = 6000;
const ENTER_MS = 350;
const EXIT_MS = 250;
/** Older toasts drop off the top rather than letting the stack fill the screen. */
const MAX_VISIBLE = 3;

// A single ToastHost is mounted once at the app root (see App.tsx). Screens
// call showToast() imperatively - same call shape as Alert.alert - without
// needing a context provider or a ref threaded through navigation.
let currentListener: ((toast: ToastPayload) => void) | null = null;
let nextId = 0;

export function showToast(
  title: string,
  message?: string,
  variant: ToastVariant = 'success',
  options: ToastOptions = {},
): void {
  currentListener?.({ ...options, id: ++nextId, title, message, variant });
}

type ToastCardProps = {
  toast: ToastPayload;
  onDismissed: (id: number) => void;
};

function ToastCard({ toast, onDismissed }: ToastCardProps) {
  const palette = variants[toast.variant];
  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissing.current) {
      return;
    }
    dismissing.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: EXIT_MS,
      useNativeDriver: true,
    }).start(() => onDismissed(toast.id));
  }, [exit, onDismissed, toast.id]);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      useNativeDriver: true,
    }).start();

    const duration = toast.durationMs ?? DURATION_MS;
    if (duration <= 0) {
      return;
    }
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, enter, toast.durationMs]);

  const handleAction = () => {
    toast.onAction?.();
    dismiss();
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: palette.line },
        {
          opacity: Animated.multiply(
            enter,
            exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          ),
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
              }),
            },
            {
              translateX: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 24],
              }),
            },
            {
              scale: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.98],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: palette.fg }]} />
      <View style={[styles.badge, { backgroundColor: palette.bg }]}>
        <Text style={[styles.badgeGlyph, { color: palette.fg }]}>
          {palette.glyph}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.fg }]}>{toast.title}</Text>
        {toast.message ? (
          <Text style={styles.message}>{toast.message}</Text>
        ) : null}
        {toast.meta ? <Text style={styles.meta}>{toast.meta}</Text> : null}
        {toast.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleAction}
            style={styles.action}
          >
            <Text style={[styles.actionLabel, { color: palette.fg }]}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        onPress={dismiss}
        style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
      >
        <Text style={styles.dismissGlyph}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Renders wherever it's mounted, so it stays visible across screen transitions. */
function ToastHost() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    currentListener = next =>
      setToasts(prev => [...prev, next].slice(-MAX_VISIBLE));

    return () => {
      currentListener = null;
    };
  }, []);

  const handleDismissed = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.stack}>
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismissed={handleDismissed} />
      ))}
    </View>
  );
}

export default ToastHost;
