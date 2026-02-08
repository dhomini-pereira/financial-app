import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

interface DataPoint {
  label: string;
  value: number;
}

interface SpendingChartProps {
  data: DataPoint[];
  height?: number;
  hidden?: boolean;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data, height = 140, hidden = false }) => {
  const { colors } = useTheme();
  const width = Dimensions.get('window').width - 80; // padding considerado

  if (hidden) {
    return (
      <View style={[styles.hiddenContainer, { height }]}>
        <Text style={[styles.hiddenText, { color: colors.textMuted }]}>Oculto</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={[styles.hiddenContainer, { height }]}>
        <Text style={[styles.hiddenText, { color: colors.textMuted }]}>Sem dados</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const paddingTop = 16;
  const paddingBottom = 28;
  const chartHeight = height - paddingTop - paddingBottom;
  const stepX = width / (data.length - 1 || 1);

  // Build points
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: paddingTop + chartHeight - (d.value / maxValue) * chartHeight,
  }));

  // Smooth curve using cubic bezier
  const buildPath = () => {
    if (points.length < 2) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpx1 = current.x + stepX * 0.4;
      const cpy1 = current.y;
      const cpx2 = next.x - stepX * 0.4;
      const cpy2 = next.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = buildPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <View style={{ height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = paddingTop + chartHeight * (1 - frac);
          return (
            <Line
              key={frac}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={colors.surfaceBorder}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Path
              d={`M ${p.x - 3.5} ${p.y} a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0`}
              fill={colors.primary}
            />
          </React.Fragment>
        ))}

        {/* Labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={points[i].x}
            y={height - 6}
            fill={colors.textMuted}
            fontSize={9}
            fontWeight="500"
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenText: {
    fontSize: 14,
  },
});

export default SpendingChart;
