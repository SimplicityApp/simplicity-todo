import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export type TabType = 'today' | 'archive' | 'summary' | 'settings';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'today', label: 'Today', icon: '◆' },
    { key: 'archive', label: 'Archive', icon: '◇' },
    { key: 'summary', label: 'Stats', icon: '◈' },
    { key: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={[
            styles.tab,
            activeTab === tab.key && styles.tabActive,
          ]}
        >
          <Text
            style={[
              styles.tabIcon,
              activeTab === tab.key && styles.tabIconActive,
            ]}
          >
            {tab.icon}
          </Text>
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.text,
  },
  tabIcon: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  tabIconActive: {
    color: COLORS.text,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
