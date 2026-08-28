import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import {
  Trees,
  Leaf,
  Droplets,
  Sparkles,
  Wrench,
  ShieldCheck,
  Waves,
  Palette,
  ChevronDown,
  Download,
  MapPin,
} from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { useTheme, typography } from '../theme';
import { InspectionCategory } from '../types';

export interface InspectionAccordionProps {
  data: InspectionCategory;
  index: number;
}

const iconMap: Record<string, any> = {
  Trees, Leaf, Droplets, Sparkles, Wrench, ShieldCheck, Waves, Palette,
};

export default function InspectionAccordion({ data, index }: InspectionAccordionProps) {
  const { theme, tokens, sp } = useTheme();
  const [expanded, setExpanded] = useState(index === 0);

  // The two Animated.Values that used to live here drove nothing: neither was
  // ever bound to a style, so the mount fade and the chevron spin were only
  // ever timers. Dropping them leaves the rendering exactly as it was.
  const toggleExpand = () => setExpanded(!expanded);

  const IconComponent = iconMap[data.iconName] || Wrench;

  // Determine overall category status
  let highestSeverity = 'good';
  let issueCount = 0;
  
  data.items.forEach(item => {
    if ((item.status as string) === 'critical') highestSeverity = 'critical';
    else if (item.status === 'issue' && highestSeverity !== 'critical') highestSeverity = 'issue';
    else if ((item.status as string) === 'attention' && highestSeverity === 'good') highestSeverity = 'attention';
    
    if (item.status === 'issue' || (item.status as string) === 'critical' || (item.status as string) === 'attention') {
      issueCount++;
    }
  });

  const getStatusColor = (status: string) => {
    if (status === 'critical') return theme.accentRed;
    if (status === 'issue') return theme.accentRed;
    if (status === 'attention') return theme.accentAmber;
    return theme.statusGreen;
  };

  const statusColor = issueCount > 0 ? getStatusColor(highestSeverity) : theme.statusGreen;
  const badgeText = issueCount > 0 ? `${issueCount} ISSUE${issueCount > 1 ? 'S' : ''}` : 'ALL CLEAR';

  return (
    <View style={[styles.container, { borderBottomColor: theme.hairline, borderBottomWidth: tokens.rule.hair }]}>
      <Pressable
        onPress={toggleExpand}
        style={[styles.header, { paddingHorizontal: tokens.gutter, paddingVertical: sp(16) }]}
      >
        <View style={styles.headerLeft}>
          <IconComponent size={22} color={theme.textPrimary} strokeWidth={1.5} />
          <Text style={[styles.categoryName, { color: theme.textPrimary }]}>
            {data.category}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {badgeText}
          </Text>
          <Pressable onPress={(e) => { e.stopPropagation(); /* Implement download logic */ }}>
            <Download size={24} color={theme.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <ChevronDown size={22} color={theme.textSecondary} strokeWidth={1} />
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.content, { paddingHorizontal: tokens.gutter, paddingBottom: sp(18) }]}>
          {data.items.map((item, idx) => {
            const isItemIssue = item.status !== 'good';
            const itemColor = getStatusColor(item.status);
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  {/* Indicator dot */}
                  {isItemIssue && <View style={[styles.issueDot, { backgroundColor: itemColor }]} />}
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                </View>
                <Text style={[styles.itemValue, { color: isItemIssue ? itemColor : theme.textSecondary }]} numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // The row's own padding supplies the air; the container adding more on top
    // of it was what made the closed rows twice as tall as the open ones.
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    paddingRight: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryName: {
    fontFamily: typography.fonts.light, // Zen thin text
    fontSize: 23,
    letterSpacing: -0.5,
  },
  badgeText: {
    fontFamily: typography.fonts.medium,
    fontSize: 17,
    letterSpacing: 1.2,
  },
  content: {
    paddingTop: 2,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 38, // Indent content to align with the heading's text, past its icon
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  issueDot: {
    // A square tick in the margin rather than a dot, matching the fleet list's
    // hanging status marker.
    width: 4,
    height: 4,
    position: 'absolute',
    left: -14,
  },
  itemName: {
    fontFamily: typography.fonts.regular,
    fontSize: 19,
  },
  itemValue: {
    fontFamily: typography.fonts.regular,
    fontSize: 19,
    flex: 1,
    textAlign: 'right',
  },
});
