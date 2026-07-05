import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';
import type { ActivityInput, ItineraryActivity } from '../trips/types';

type ActivityDialogProps = {
  visible: boolean;
  activity?: ItineraryActivity | null;
  loading?: boolean;
  onDismiss: () => void;
  onSave: (input: ActivityInput) => void;
};

export function ActivityDialog({ visible, activity, loading, onDismiss, onSave }: ActivityDialogProps) {
  const [title, setTitle] = useState(activity?.title ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [category, setCategory] = useState(activity?.category ?? 'activity');
  const [location, setLocation] = useState(activity?.location_name ?? '');
  const [startTime, setStartTime] = useState(activity?.local_start_time?.slice(0, 5) ?? '10:00');
  const [endTime, setEndTime] = useState(activity?.local_end_time?.slice(0, 5) ?? '11:00');
  const [cost, setCost] = useState(String(activity ? paiseToRupees(activity.estimated_cost_minor) : 0));
  const [transport, setTransport] = useState(activity?.metadata?.recommended_transport ?? '');
  const [reason, setReason] = useState(activity?.metadata?.recommendation_reason ?? '');
  const [safetyNote, setSafetyNote] = useState(activity?.metadata?.safety_note ?? '');
  const [weatherNote, setWeatherNote] = useState(activity?.metadata?.weather_note ?? '');

  const canSave = title.trim().length >= 2 && /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{activity ? 'Edit activity' : 'Add activity'}</Dialog.Title>
        <Dialog.ScrollArea>
          <View style={styles.content}>
            <TextInput label="Name" value={title} onChangeText={setTitle} />
            <TextInput label="Description" value={description} onChangeText={setDescription} />
            <TextInput label="Category" value={category} onChangeText={setCategory} />
            <TextInput label="Location" value={location} onChangeText={setLocation} />
            <TextInput label="Start time" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
            <TextInput label="End time" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
            <TextInput label="Estimated cost" value={cost} onChangeText={setCost} keyboardType="number-pad" />
            <TextInput label="Transport" value={transport} onChangeText={setTransport} />
            <TextInput label="Reason" value={reason} onChangeText={setReason} />
            <TextInput label="Safety note" value={safetyNote} onChangeText={setSafetyNote} />
            <TextInput label="Weather note" value={weatherNote} onChangeText={setWeatherNote} />
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss} disabled={loading}>Cancel</Button>
          <Button
            loading={loading}
            disabled={!canSave}
            onPress={() =>
              onSave({
                title: title.trim(),
                description: description.trim() || null,
                category: category.trim() || 'activity',
                location_name: location.trim() || null,
                local_start_time: startTime,
                local_end_time: endTime,
                estimated_cost_minor: rupeesToPaise(Number(cost || 0)),
                metadata: {
                  ...(activity?.metadata ?? {}),
                  recommended_transport: transport.trim() || 'Not specified',
                  recommendation_reason: reason.trim() || 'User edited activity.',
                  safety_note: safetyNote.trim() || 'Verify local safety conditions.',
                  weather_note: weatherNote.trim() || 'Verify weather before travel.',
                  data_label: activity ? activity.metadata?.data_label ?? '[AI ESTIMATE]' : 'CONFIRMED_BY_USER',
                },
              })
            }
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
