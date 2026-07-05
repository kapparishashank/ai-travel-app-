import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import type { TripBasicsInput, TripSummary } from './types';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';

type RenameDialogProps = {
  trip: TripSummary | null;
  visible: boolean;
  loading: boolean;
  onDismiss: () => void;
  onSave: (title: string) => void;
};

export function RenameTripDialog({ trip, visible, loading, onDismiss, onSave }: RenameDialogProps) {
  const [title, setTitle] = useState(trip?.title ?? '');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Rename trip</Dialog.Title>
        <Dialog.Content>
          <TextInput label="Trip name" value={title} onChangeText={setTitle} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss} disabled={loading}>Cancel</Button>
          <Button onPress={() => onSave(title.trim())} loading={loading} disabled={title.trim().length < 2}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

type BasicsDialogProps = {
  trip: TripSummary | null;
  visible: boolean;
  loading: boolean;
  onDismiss: () => void;
  onSave: (basics: TripBasicsInput) => void;
};

export function EditTripBasicsDialog({ trip, visible, loading, onDismiss, onSave }: BasicsDialogProps) {
  const [title, setTitle] = useState(trip?.title ?? '');
  const [origin, setOrigin] = useState(trip?.origin_name ?? '');
  const [destination, setDestination] = useState(trip?.destination_name ?? '');
  const [startDate, setStartDate] = useState(trip?.start_date ?? '');
  const [endDate, setEndDate] = useState(trip?.end_date ?? '');
  const [budget, setBudget] = useState(String(trip ? paiseToRupees(trip.total_budget_minor) : ''));
  const [currency, setCurrency] = useState(trip?.currency_code ?? 'INR');

  const canSave = title.trim().length >= 2 && origin.trim().length >= 2 && destination.trim().length >= 2 && Number(budget) > 0;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Edit trip basics</Dialog.Title>
        <Dialog.ScrollArea>
          <View style={styles.content}>
            <TextInput label="Trip name" value={title} onChangeText={setTitle} />
            <TextInput label="Starting city" value={origin} onChangeText={setOrigin} />
            <TextInput label="Destination" value={destination} onChangeText={setDestination} />
            <TextInput label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            <TextInput label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
            <TextInput label="Budget" value={budget} onChangeText={setBudget} keyboardType="number-pad" />
            <TextInput label="Currency" value={currency} onChangeText={(value) => setCurrency(value.toUpperCase())} />
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss} disabled={loading}>Cancel</Button>
          <Button
            onPress={() =>
              onSave({
                title: title.trim(),
                origin_name: origin.trim(),
                destination_name: destination.trim(),
                start_date: startDate,
                end_date: endDate,
                total_budget_minor: rupeesToPaise(Number(budget)),
                currency_code: currency.toUpperCase(),
              })
            }
            loading={loading}
            disabled={!canSave}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
