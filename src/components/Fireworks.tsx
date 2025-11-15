import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { COLORS } from '../constants/theme';

interface FireworksProps {
  onComplete?: () => void;
}

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 50; // Increased from 20
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

export const Fireworks: React.FC<FireworksProps> = ({ onComplete }) => {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  useEffect(() => {
    // Create random angles for each particle
    const animations = particles.map((particle, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const distance = 150 + Math.random() * 100; // 150-250px spread (much larger)
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      return Animated.sequence([
        // Initial burst - fade in and scale up
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(particle.scale, {
            toValue: 1.5,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        // Expand outward
        Animated.parallel([
          Animated.timing(particle.translateX, {
            toValue: endX,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: endY,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Fade out
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 600,
            delay: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          // Scale down
          Animated.timing(particle.scale, {
            toValue: 0.2,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Run all particle animations simultaneously
    Animated.parallel(animations).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.center}>
        {particles.map((particle, index) => {
          // Alternate between circles and squares for variety
          const isCircle = index % 3 !== 0;

          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                isCircle ? styles.particleCircle : styles.particleSquare,
                {
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { scale: particle.scale },
                    { rotate: isCircle ? '0deg' : `${index * 7}deg` },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: COLORS.text,
  },
  particleCircle: {
    borderRadius: 6,
  },
  particleSquare: {
    borderRadius: 2,
  },
});
