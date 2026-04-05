import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Loader } from './ui/Loader';
import type { User } from '../types';

const MOCK_USERS: User[] = [
  { id: '1', username: 'Иван', email: 'woroncov@example.com', first_name: 'Иван', last_name: 'Иванов', timezone: 'Europe/Moscow', contacts_visible: true },
  { id: '2', username: 'Петр', email: 'eagle@example.com', first_name: 'Петр', last_name: 'Петров', timezone: 'Europe/Moscow', contacts_visible: true },
  { id: '3', username: 'Матвей', email: 'whitewolf@example.com', first_name: 'Матвей', last_name: 'Матвеев', timezone: 'Europe/Moscow', contacts_visible: true },
  { id: '4', username: 'Алексей', email: 'striker@example.com', first_name: 'Алексей', last_name: 'Алексеев', timezone: 'Europe/Moscow', contacts_visible: true },
];

const SEARCH_DEBOUNCE_MS = 300;

interface UserSearchProps {
  onSelect: (user: User) => void;
  excludeIds?: string[];
}

export const UserSearch: React.FC<UserSearchProps> = ({ onSelect, excludeIds = [] }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setUsers([]);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const lowerQuery = query.toLowerCase();
        const results = MOCK_USERS.filter(
          (u) =>
            u.username.toLowerCase().includes(lowerQuery) ||
            u.email.toLowerCase().includes(lowerQuery) ||
            (u.first_name && u.first_name.toLowerCase().includes(lowerQuery)) ||
            (u.last_name && u.last_name.toLowerCase().includes(lowerQuery)),
        );
        const filtered = results.filter((u) => !excludeIds.includes(u.id));

        setUsers(filtered);
      } catch {
        setError('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, excludeIds]);

  const handleSelect = (user: User) => {
    onSelect(user);
    setUsers([]);
    setQuery('');
  };

  return (
    <div className="relative w-full">
      <div className="text-sm font-medium text-gray-700 mb-1">Поиск пользователя</div>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Введите имя или email..."
      />

      {loading && (
        <div className="mt-2">
          <Loader />
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="absolute mt-2 w-full z-20 space-y-2">
          {users.map((user) => (
            <Card key={user.id} hoverable onClick={() => handleSelect(user)}>
              <div className="font-semibold">
                {[user.last_name, user.first_name].filter(Boolean).join(' ') || user.username || 'Неизвестный пользователь'}
              </div>
              <div className="text-sm text-gray-600">{user.email || 'Нет email'}</div>
            </Card>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && users.length === 0 && !error && (
        <div className="mt-2 text-sm text-gray-600">Ничего не найдено</div>
      )}

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  );
};
