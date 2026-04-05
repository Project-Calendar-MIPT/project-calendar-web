import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { MOCK_USERS } from '../mock';
import type { User } from '../types';
import './UserSearch.scss';

type CandidateMeta = {
  activeTasksCount?: number;
  overlappingTasksCount?: number;
  workloadLabel?: string;
  matchedSkills?: string[];
  relevanceScore?: number;
  isAvailable?: boolean;
};

interface UserSearchProps {
  onSelect: (user: User) => void;
  excludeIds?: string[];
  users?: User[];
  candidateMeta?: Record<string, CandidateMeta>;
  onPreview?: (user: User) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

export const UserSearch: React.FC<UserSearchProps> = ({
  onSelect,
  excludeIds = [],
  users: sourceUsers,
  candidateMeta = {},
  onPreview,
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const candidates = useMemo(() => {
    return (sourceUsers || MOCK_USERS).filter((user) => !excludeIds.includes(user.id));
  }, [sourceUsers, excludeIds]);

  useEffect(() => {
    if (query.trim().length < 1) {
      setUsers([]);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        setLoading(true);
        setError(null);

        const lowerQuery = query.toLowerCase().trim();

        const results = candidates.filter(
          (u) =>
            u.username.toLowerCase().includes(lowerQuery) ||
            u.email.toLowerCase().includes(lowerQuery) ||
            u.full_name.toLowerCase().includes(lowerQuery)
        );

        const sorted = [...results].sort((a, b) => {
          const aMeta = candidateMeta[a.id] || {};
          const bMeta = candidateMeta[b.id] || {};

          const aAvailable = aMeta.isAvailable !== false ? 1 : 0;
          const bAvailable = bMeta.isAvailable !== false ? 1 : 0;
          if (aAvailable !== bAvailable) return bAvailable - aAvailable;

          const aScore = aMeta.relevanceScore || 0;
          const bScore = bMeta.relevanceScore || 0;
          if (aScore !== bScore) return bScore - aScore;

          const aTasks = aMeta.activeTasksCount || 0;
          const bTasks = bMeta.activeTasksCount || 0;
          if (aTasks !== bTasks) return aTasks - bTasks;

          return a.full_name.localeCompare(b.full_name);
        });

        setUsers(sorted);
      } catch {
        setError('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, candidates, candidateMeta]);

  const handleSelect = (user: User) => {
    const meta = candidateMeta[user.id];
    if (meta && meta.isAvailable === false) {
      return;
    }

    onSelect(user);
    setUsers([]);
    setQuery('');
  };

  return (
    <div className="user-search">
      <div className="user-search__label">Поиск по нику / имени</div>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Введите ник, имя или email..."
      />

      {loading && <div className="user-search__status">Загрузка...</div>}

      {!loading && users.length > 0 && (
        <div className="user-search__results">
          {users.map((user) => {
            const meta = candidateMeta[user.id] || {};
            const isAvailable = meta.isAvailable !== false;

            return (
              <div
                key={user.id}
                className={`user-search__card ${!isAvailable ? 'user-search__card--disabled' : ''}`}
                onClick={() => handleSelect(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isAvailable) {
                    handleSelect(user);
                  }
                }}
              >
                <div className="user-search__content">
                  <div className="user-search__name">
                    {user.full_name || user.username || 'Неизвестный пользователь'}
                  </div>

                  <div className="user-search__meta">
                    @{user.username} · {user.email || 'Нет email'}
                  </div>

                  <div className="user-search__workload">
                    Загруженность: {meta.workloadLabel || 'нет данных'}
                  </div>

                  {meta.matchedSkills && meta.matchedSkills.length > 0 && (
                    <div className="user-search__skills">
                      Совпадение навыков: {meta.matchedSkills.join(', ')}
                    </div>
                  )}

                  {!isAvailable && (
                    <div className="user-search__warning">
                      Есть пересечения по датам
                    </div>
                  )}
                </div>

                {onPreview && (
                  <div className="user-search__actions">
                    <Button
                      type="button"
                      variant="outline"
                      className="user-search__profile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(user);
                      }}
                    >
                      Профиль
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && query.length >= 1 && users.length === 0 && !error && (
        <div className="user-search__status">Ничего не найдено</div>
      )}

      {error && <div className="user-search__error">{error}</div>}
    </div>
  );
};
