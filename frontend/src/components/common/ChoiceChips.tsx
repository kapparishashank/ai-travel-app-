import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText } from 'react-native-paper';
import { SegmentedTabs } from './SegmentedTabs';

type ChoiceChipsProps = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multi?: boolean;
  error?: string;
};

export function ChoiceChips({ options, selected, onChange, multi = true, error }: ChoiceChipsProps) {
  if (!multi) {
    return (
      <View style={styles.container}>
        <SegmentedTabs
          name={`choice-${options.join('-')}`}
          ariaLabel="Choice options"
          value={selected[0] ?? options[0] ?? ''}
          onChange={(option) => onChange([option])}
          options={options.map((option) => ({ label: option, value: option }))}
        />
        {!!error && <HelperText type="error">{error}</HelperText>}
      </View>
    );
  }

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Chip
            key={option}
            selected={selected.includes(option)}
            onPress={() => toggle(option)}
            style={styles.chip}
            compact
          >
            {option}
          </Chip>
        ))}
      </View>
      {!!error && <HelperText type="error">{error}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 8,
  },
});
