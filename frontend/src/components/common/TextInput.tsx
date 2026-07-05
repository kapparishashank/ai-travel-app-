import React from 'react';
import { HelperText, TextInput as PaperTextInput, useTheme } from 'react-native-paper';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  accessibilityLabel?: string;
}

export function TextInput({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  placeholder,
  style,
  leftIcon,
  rightIcon,
  onRightIconPress,
  accessibilityLabel,
}: TextInputProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <PaperTextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={!!error}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        mode="outlined"
        outlineStyle={styles.outline}
        activeOutlineColor={theme.colors.primary}
        outlineColor={theme.colors.outlineVariant}
        style={{ backgroundColor: theme.colors.surface }}
        left={leftIcon ? <PaperTextInput.Icon icon={leftIcon} /> : undefined}
        right={
          rightIcon ? (
            <PaperTextInput.Icon icon={rightIcon} onPress={onRightIconPress} />
          ) : undefined
        }
        accessibilityLabel={accessibilityLabel ?? label}
      />
      {!!error && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    width: '100%',
  },
  outline: {
    borderRadius: 8,
  },
  errorText: {
    paddingLeft: 4,
  },
});
