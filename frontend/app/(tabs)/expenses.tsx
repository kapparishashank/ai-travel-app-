import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { HiddenCostCalculator } from '../../src/features/hiddenCosts/HiddenCostCalculator';
import { hyderabadGoaHiddenCosts } from '../../src/features/hiddenCosts/demoData';
import { rupeesToPaise } from '../../src/utils/currency';

export default function ExpensesScreen() {
  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <HiddenCostCalculator
          initialItems={hyderabadGoaHiddenCosts}
          budgetMinor={rupeesToPaise(40000)}
          travelerCount={4}
          currency="INR"
          demoLabel="Demo data: Hyderabad-to-Goa friends trip, 4 travelers, INR 40,000 budget"
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
  },
});
