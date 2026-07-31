import { useEffect, useState } from 'react';

import type { FaqEntry } from '../../types/faq.types';
import { useFaqEntries } from '../../hooks/queries/useFaq';
import {
  useCreateFaqItemMutation,
  useDeleteFaqItemMutation,
  useReorderFaqMutation,
  useUpdateFaqItemMutation,
} from '../../hooks/mutations/useFaqMutations';
import FaqAccordion from '../ui/FaqAccordion';
import styles from './FaqAdminEditor.module.scss';

function FaqEditorItem({
  entry,
  onSave,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  entry: FaqEntry;
  onSave: (id: string, dto: { title: string; text: string }) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [text, setText] = useState(entry.text);
  const dirty = title.trim() !== entry.title || text.trim() !== entry.text;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.dragHandle} aria-hidden="true">
        ⠿
      </span>

      <div className={styles.fields}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок питання"
          className={styles.input}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст відповіді"
          rows={2}
          className={styles.textarea}
        />
      </div>

      <div className={styles.itemActions}>
        {dirty && (
          <button
            type="button"
            onClick={() => onSave(entry.id, { title, text })}
            className={styles.saveItemButton}
          >
            Зберегти
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          aria-label="Видалити питання"
          className={styles.deleteItemButton}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function FaqAdminEditor() {
  const entries = useFaqEntries();
  const createItem = useCreateFaqItemMutation();
  const updateItem = useUpdateFaqItemMutation();
  const deleteItem = useDeleteFaqItemMutation();
  const reorder = useReorderFaqMutation();

  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedIds(entries.map((entry) => entry.id));
  }, [entries]);

  const orderedEntries = orderedIds
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is FaqEntry => !!entry);

  const handleAdd = () => {
    if (!newTitle.trim() || !newText.trim()) return;
    createItem.mutate({ title: newTitle.trim(), text: newText.trim() });
    setNewTitle('');
    setNewText('');
  };

  const handleSaveItem = (id: string, dto: { title: string; text: string }) => {
    if (!dto.title.trim() || !dto.text.trim()) return;
    updateItem.mutate({ id, dto: { title: dto.title.trim(), text: dto.text.trim() } });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Видалити це запитання?')) return;
    deleteItem.mutate(id);
  };

  const handleDragEnter = (overId: string) => {
    if (!draggingId || draggingId === overId) return;

    setOrderedIds((prev) => {
      const next = [...prev];
      const from = next.indexOf(draggingId);
      const to = next.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggingId);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    const order = Object.fromEntries(orderedIds.map((id, index) => [id, index]));
    reorder.mutate(order);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.editorColumn}>
        {orderedEntries.length > 0 && (
          <div className={styles.list}>
            {orderedEntries.map((entry) => (
              <FaqEditorItem
                key={entry.id}
                entry={entry}
                onSave={handleSaveItem}
                onDelete={handleDelete}
                isDragging={draggingId === entry.id}
                onDragStart={() => setDraggingId(entry.id)}
                onDragEnter={() => handleDragEnter(entry.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}

        <div className={styles.addRow}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Нове запитання"
            className={styles.input}
          />
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Відповідь"
            rows={2}
            className={styles.textarea}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={createItem.isPending}
            className={styles.addButton}
          >
            + Додати запитання
          </button>
        </div>
      </div>

      <div className={styles.previewColumn}>
        <p className={styles.previewLabel}>Превʼю</p>
        <FaqAccordion items={orderedEntries} />
      </div>
    </div>
  );
}
