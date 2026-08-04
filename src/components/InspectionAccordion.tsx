import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Pressable
} from 'react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface InspectionAccordionProps {
  data: InspectionCategory;
  index: number;
}

const iconMap: Record<string, any> = {
  Trees, Leaf, Droplets, Sparkles, Wrench, ShieldCheck, Waves, Palette,
};

export const InspectionAccordion: React.FC<InspectionAccordionProps> = ({ data, index }) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Minimal enter animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index, fadeAnim]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, borderBottomColor: theme.border }]}>
      <Pressable onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <IconComponent size={16} color={theme.textPrimary} strokeWidth={1.5} />
          <Text style={[styles.categoryName, { color: theme.textPrimary }]}>
            {data.category}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {badgeText}
          </Text>
          <Pressable onPress={(e) => { e.stopPropagation(); /* Implement download logic */ }}>
            <Download size={18} color={theme.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ChevronDown size={16} color={theme.textSecondary} strokeWidth={1} />
          </Animated.View>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    fontSize: 18,
    letterSpacing: -0.5,
  },
  badgeText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  content: {
    paddingBottom: 16,
    paddingTop: 8,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 32, // Indent content to align with text
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  issueDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: -12,
  },
  itemName: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
  },
  itemValue: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
});
