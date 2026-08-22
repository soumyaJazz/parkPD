import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = () => {
    // TODO: wire up to backend
    console.log('send otp', { phoneNumber });
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    // TODO: wire up to backend
    console.log('verify otp', { phoneNumber, otp });
  };

  const handleChangeNumber = () => {
    setOtpSent(false);
    setOtp('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        style={styles.input}
        placeholder="Phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        editable={!otpSent}
      />

      {otpSent && (
        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          keyboardType="number-pad"
          autoComplete="sms-otp"
          value={otp}
          onChangeText={setOtp}
        />
      )}

      {!otpSent ? (
        <TouchableOpacity
          style={[styles.button, !phoneNumber && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!phoneNumber}
        >
          <Text style={styles.buttonText}>Send OTP</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, !otp && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={!otp}
          >
            <Text style={styles.buttonText}>Verify OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={handleChangeNumber}>
            <Text style={styles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
