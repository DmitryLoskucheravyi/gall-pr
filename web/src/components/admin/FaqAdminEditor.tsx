import { useEffect, useRef, useState } from 'react';

import type { FaqEntry } from '../../types/faq.types';
import { useFaqEntries } from '../../hooks/queries/useFaq';
import {
  useCreateFaqItemMutation,
  useDeleteFaqItemMutation,
  useReorderFaqMutation,
  useUpdateFaqItemMutation,
} from '../../hooks/mutations/useFaqMutations';
import FaqAccordion from '../ui/FaqAccordion';
import { useConfirm } from '../ui/ConfirmDialog';
import styles from './FaqAdminEditor.module.scss';

function FaqEditorItem({
  entry,
  onSave,
  onDelete,
  isDragging,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandleKeyDown,
}: {
  entry: FaqEntry;
  onSave: (id: string, dto: { title: string; text: string }) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onHandlePointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onHandleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [text, setText] = useState(entry.text);
  const dirty = title.trim() !== entry.title || text.trim() !== entry.text;

  return (
    <div
      // Read back off the pointer position during a drag to work out which
      // row is under the finger — see handlePointerMove.
      data-faq-id={entry.id}
      className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
    >
      {/* Dragging starts here rather than anywhere on the row: with pointer
          events the whole row would fight the text fields for the gesture. */}
      <button
        type="button"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onKeyDown={onHandleKeyDown}
        aria-label={`Перемістити «${entry.title}»`}
        className={styles.dragHandle}
      >
        ⠿
      </button>

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
  const confirm = useConfirm();

  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // The order as it stands right now. The pointer handlers commit on release
  // and would otherwise read whatever the closure captured when the drag
  // began, i.e. the order before any of the moves.
  const orderedIdsRef = useRef<string[]>([]);
  orderedIdsRef.current = orderedIds;

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

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Видалити запитання?',
      message: 'Це запитання зникне з FAQ.',
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    deleteItem.mutate(id);
  };

  // Pointer events rather than the HTML5 drag API, which mobile browsers
  // never implemented: `draggable` does nothing on touch, so reordering was
  // impossible from a phone. These work the same for mouse, touch and pen.
  const moveOver = (draggedId: string, overId: string) => {
    if (draggedId === overId) return;

    setOrderedIds((prev) => {
      const next = [...prev];
      const from = next.indexOf(draggedId);
      const to = next.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      return next;
    });
  };

  // Takes the list explicitly where the caller already knows it: the ref is
  // only refreshed on render, so a caller that reorders and commits in the
  // same tick would otherwise send the order from before its own move.
  const commitOrder = (ids: string[] = orderedIdsRef.current) => {
    reorder.mutate(Object.fromEntries(ids.map((id, index) => [id, index])));
  };

  const handlePointerDown = (
    id: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    // Stops the press turning into a text selection or a page scroll before
    // the first move even arrives.
    event.preventDefault();
    // Capture keeps every later move and the release aimed at this handle,
    // even once the rows have shuffled out from under the finger.
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingId) return;

    // Capture means the events no longer report what's under the pointer,
    // so ask the document directly.
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const overId = under
      ?.closest<HTMLElement>('[data-faq-id]')
      ?.dataset.faqId;
    if (overId) moveOver(draggingId, overId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    commitOrder();
  };

  // The handle is a real button, so it takes focus — these give it something
  // to do there, and are the only way to reorder without a pointer at all.
  const handleHandleKeyDown = (
    id: string,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const step =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (step === 0) return;

    event.preventDefault();
    const current = orderedIdsRef.current;
    const from = current.indexOf(id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= current.length) return;

    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, id);
    setOrderedIds(next);
    commitOrder(next);
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
                onHandlePointerDown={(event) =>
                  handlePointerDown(entry.id, event)
                }
                onHandlePointerMove={handlePointerMove}
                onHandlePointerUp={handlePointerUp}
                onHandleKeyDown={(event) => handleHandleKeyDown(entry.id, event)}
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
