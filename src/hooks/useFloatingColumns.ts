import { useMemo } from 'react';

/**
 * Hook для генерации конфигурации плавающих колонок фона
 * @param count Количество колонок (по умолчанию 15)
 * @returns Массив стилей для колонок
 */
export const useFloatingColumns = (count: number = 15): React.CSSProperties[] => {
  return useMemo(() => {
    return [...Array(count)].map((_, i) => {
      const depth = Math.random();
      const scale = depth * 0.6 + 0.4;
      const width = 30 + scale * 30;
      const height = 60 + scale * 80;
      const duration = 14 + (1 - scale) * 6;
      const leftOffset = Math.random() * 3;
      const delay = -Math.random() * duration;

      return {
        left: `${i * 6.5 + leftOffset}%`,
        width: `${width}px`,
        height: `${height}px`,
        opacity: scale * 0.6 + 0.2,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        zIndex: Math.floor(scale * 10),
      };
    });
  }, [count]);
};
