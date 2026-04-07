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
    // Guard для некорректных значений count
    if (count <= 0) {
      return [];
    }

    const spacing = 100 / count; // Динамическое распределение по ширине
    return [...Array(count)].map((_, i) => {
      const depth = Math.random();
      const width = 30 + depth * 30; // 30-60px
      const height = 60 + depth * 80; // 60-140px
      const duration = 20 - depth * 6; // 14-20s
      // Небольшой симметричный jitter в рамках своей колонки,
      // чтобы избежать скопления слева/справа.
      const leftJitter = (Math.random() - 0.5) * spacing * 0.6;
      const left = Math.min(100, Math.max(0, (i + 0.5) * spacing + leftJitter));
      const delay = -Math.random() * duration;

      return {
        id: `column-${i}-${Math.random().toString(36).slice(2, 11)}`,
        style: {
          left: `${left}%`,
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
