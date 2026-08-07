import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { useTheme, typography } from '../theme';

export interface ConfirmActionDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  const { theme } = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={{ backgroundColor: theme.background, borderRadius: 8 }}>
        <Dialog.Title style={[styles.title, { color: theme.textPrimary }]}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button 
            onPress={onCancel} 
            textColor={theme.textSecondary}
            labelStyle={styles.buttonLabel}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={onConfirm} 
            buttonColor={destructive ? theme.accentRed : theme.accentAmber}
            textColor="#FFFFFF"
            labelStyle={styles.buttonLabel}
            style={styles.confirmBtn}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.lg,
  },
  message: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  confirmBtn: {
    borderRadius: 6,
    marginLeft: 8,
  },
  buttonLabel: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  }
});
