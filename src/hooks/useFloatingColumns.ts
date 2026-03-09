import { useMemo, type CSSProperties } from 'react';

interface FloatingColumn {
  id: string;
  style: CSSProperties;
}

/**
 * Hook для генерации конфигурации плавающих колонок фона
 * @param count Количество колонок (по умолчанию 15)
 * @returns Массив объектов с уникальным id и стилями для колонок
 */
export const useFloatingColumns = (count: number = 15): FloatingColumn[] => {
  return useMemo(() => {
    return [...Array(count)].map((_, i) => {
      const depth = Math.random();
      const width = 30 + depth * 30; // 30-60px
      const height = 60 + depth * 80; // 60-140px
      const duration = 20 - depth * 6; // 14-20s
      const leftOffset = Math.random() * 3;
      const delay = -Math.random() * duration;

      return {
        id: `column-${i}-${Math.random().toString(36).slice(2, 11)}`,
        style: {
          left: `${i * 6.5 + leftOffset}%`,
          width: `${width}px`,
          height: `${height}px`,
          opacity: 0.2 + depth * 0.6, // 0.2-0.8
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          zIndex: Math.floor(depth * 11), // 0-10
        },
      };
    });
  }, [count]);
};
