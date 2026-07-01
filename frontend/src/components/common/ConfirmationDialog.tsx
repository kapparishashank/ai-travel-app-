import React from 'react';
import { Portal, Dialog, Paragraph } from 'react-native-paper';
import { Button } from './Button';
import { StyleSheet, View } from 'react-native';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onDismiss: () => void;
  confirmLabel?: string;
  dismissLabel?: string;
  loading?: boolean;
  isDestructive?: boolean;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  onConfirm,
  onDismiss,
  confirmLabel = 'Confirm',
  dismissLabel = 'Cancel',
  loading = false,
  isDestructive = false,
}: ConfirmationDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Paragraph>{message}</Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <View style={styles.actionsContainer}>
            <Button mode="text" onPress={onDismiss} disabled={loading} style={styles.button}>
              {dismissLabel}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              loading={loading}
              style={styles.button}
              color={isDestructive ? '#EF4444' : undefined}
            >
              {confirmLabel}
            </Button>
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    marginLeft: 8,
  },
});
