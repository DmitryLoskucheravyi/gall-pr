import { useEffect, useRef, useState } from 'react';

import { uploadImage } from '../../api/uploads.api';
import type { Giveaway } from '../../types/giveaway.types';
import type { News } from '../../types/news.types';
import { useGiveaways } from '../../hooks/queries/useGiveaways';
import { useNews } from '../../hooks/queries/useNews';
import { usePaintings } from '../../hooks/queries/usePaintings';
import {
  useCreateGiveawayMutation,
  useDeleteGiveawayMutation,
  useUpdateGiveawayMutation,
} from '../../hooks/mutations/useGiveawayMutations';
import {
  useCreateNewsMutation,
  useDeleteNewsMutation,
  useUpdateNewsMutation,
} from '../../hooks/mutations/useNewsMutations';
import Select from '../../components/ui/Select';
import { useAppDispatch } from '../../store/hooks';
import { showToast } from '../../store/slices/toastSlice';
import styles from './AdminGiveawaysPage.module.scss';

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminGiveawaysPage() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<'giveaways' | 'news'>('giveaways');

  const { data: giveaways = [], isLoading: loading } = useGiveaways();
  const { data: news = [], isLoading: newsLoading } = useNews();
  const { data: paintingsResponse } = usePaintings({ page: 1, limit: 200 });
  const paintings = paintingsResponse?.data ?? [];

  const createGiveaway = useCreateGiveawayMutation();
  const updateGiveaway = useUpdateGiveawayMutation();
  const deleteGiveaway = useDeleteGiveawayMutation();
  const createNews = useCreateNewsMutation();
  const updateNews = useUpdateNewsMutation();
  const deleteNews = useDeleteNewsMutation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [paintingId, setPaintingId] = useState('');
  const [deadline, setDeadline] = useState('');

  const [newsEditingId, setNewsEditingId] = useState<number | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsText, setNewsText] = useState('');
  const [newsImage, setNewsImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [newsExistingImageUrl, setNewsExistingImageUrl] = useState<
    string | null
  >(null);
  const [uploadingNewsImage, setUploadingNewsImage] = useState(false);
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const newsImageRef = useRef(newsImage);
  useEffect(() => {
    newsImageRef.current = newsImage;
  }, [newsImage]);
  useEffect(() => {
    return () => {
      if (newsImageRef.current) URL.revokeObjectURL(newsImageRef.current.previewUrl);
    };
  }, []);

  const newsSaving = uploadingNewsImage || createNews.isPending || updateNews.isPending;

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setConditions('');
    setPaintingId('');
    setDeadline('');
  };

  const handleEdit = (giveaway: Giveaway) => {
    setEditingId(giveaway.id);
    setTitle(giveaway.title);
    setDescription(giveaway.description);
    setConditions(giveaway.conditions ?? '');
    setPaintingId(String(giveaway.painting.id));
    setDeadline(toDatetimeLocalValue(giveaway.deadline));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !paintingId || !deadline) return;

    const dto = {
      title: title.trim(),
      description: description.trim(),
      conditions: conditions.trim(),
      paintingId: Number(paintingId),
      deadline: new Date(deadline).toISOString(),
    };

    if (editingId) {
      updateGiveaway.mutate({ id: editingId, dto }, { onSuccess: resetForm });
    } else {
      createGiveaway.mutate(dto, { onSuccess: resetForm });
    }
  };

  const handleDelete = (giveaway: Giveaway) => {
    if (!window.confirm(`Видалити розіграш "${giveaway.title}"?`)) return;
    deleteGiveaway.mutate(giveaway.id);
  };

  const resetNewsForm = () => {
    setNewsEditingId(null);
    setNewsTitle('');
    setNewsText('');
    if (newsImage) URL.revokeObjectURL(newsImage.previewUrl);
    setNewsImage(null);
    setNewsExistingImageUrl(null);
  };

  const handleNewsEdit = (item: News) => {
    setNewsEditingId(item.id);
    setNewsTitle(item.title);
    setNewsText(item.text);
    if (newsImage) URL.revokeObjectURL(newsImage.previewUrl);
    setNewsImage(null);
    setNewsExistingImageUrl(item.imageUrl);
  };

  const handleNewsFileSelected = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (newsImage) URL.revokeObjectURL(newsImage.previewUrl);
    setNewsImage({ file, previewUrl: URL.createObjectURL(file) });
    setNewsExistingImageUrl(null);
    if (newsFileInputRef.current) newsFileInputRef.current.value = '';
  };

  const handleNewsRemoveImage = () => {
    if (newsImage) URL.revokeObjectURL(newsImage.previewUrl);
    setNewsImage(null);
    setNewsExistingImageUrl(null);
  };

  const handleNewsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsTitle.trim() || !newsText.trim()) return;

    let imageUrl = newsExistingImageUrl ?? undefined;

    if (newsImage) {
      try {
        setUploadingNewsImage(true);
        const uploaded = await uploadImage(newsImage.file);
        imageUrl = uploaded.url;
      } catch (error: any) {
        dispatch(
          showToast({
            message:
              error?.response?.data?.message ?? 'Не вдалося завантажити зображення',
            variant: 'error',
          }),
        );
        setUploadingNewsImage(false);
        return;
      }
      setUploadingNewsImage(false);
    }

    const dto = {
      title: newsTitle.trim(),
      text: newsText.trim(),
      imageUrl,
    };

    if (newsEditingId) {
      updateNews.mutate({ id: newsEditingId, dto }, { onSuccess: resetNewsForm });
    } else {
      createNews.mutate(dto, { onSuccess: resetNewsForm });
    }
  };

  const handleNewsDelete = (item: News) => {
    if (!window.confirm(`Видалити новину "${item.title}"?`)) return;
    deleteNews.mutate(item.id);
  };

  const paintingOptions = paintings.map((p) => ({
    value: String(p.id),
    label: p.title,
  }));

  const newsPreviewUrl = newsImage?.previewUrl ?? newsExistingImageUrl;

  return (
    <div>
      <h1 className={styles.title}>Розіграш та новини</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => setTab('giveaways')}
          className={`${styles.tabButton} ${tab === 'giveaways' ? styles.tabActive : ''}`}
        >
          Розіграш
        </button>
        <button
          type="button"
          onClick={() => setTab('news')}
          className={`${styles.tabButton} ${tab === 'news' ? styles.tabActive : ''}`}
        >
          Новини
        </button>
      </div>

      {tab === 'giveaways' ? (
        <>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              required
              placeholder="Назва розіграшу"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
            />

            <Select
              value={paintingId}
              onChange={setPaintingId}
              options={paintingOptions}
              placeholder="Картина"
            />

            <input
              required
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={styles.input}
            />

            <textarea
              required
              rows={4}
              placeholder="Опис розіграшу"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
            />

            <textarea
              rows={4}
              placeholder="Умови участі (необов'язково)"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className={styles.textarea}
            />

            <div className={styles.formActions}>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={styles.cancelButton}
                >
                  Скасувати
                </button>
              )}
              <button type="submit" className={styles.submitButton}>
                {editingId ? 'Зберегти' : 'Створити розіграш'}
              </button>
            </div>
          </form>

          {loading ? (
            <p className={styles.muted}>Завантаження…</p>
          ) : giveaways.length === 0 ? (
            <p className={styles.muted}>Розіграшів поки немає</p>
          ) : (
            <div className={styles.list}>
              {giveaways.map((giveaway) => (
                <div key={giveaway.id} className={styles.item}>
                  <img
                    src={giveaway.painting.cardImage}
                    alt=""
                    className={styles.itemImage}
                  />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{giveaway.title}</span>
                    <span className={styles.itemMeta}>
                      {giveaway.painting.title} · {giveaway.participantsCount}{' '}
                      учасників · {giveaway.isActive ? 'активний' : 'завершено'}
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      onClick={() => handleEdit(giveaway)}
                      className={styles.editButton}
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDelete(giveaway)}
                      className={styles.deleteButton}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <form onSubmit={handleNewsSubmit} className={styles.form}>
            <span className={styles.fileLabel}>Зображення (необов'язково)</span>

            <input
              ref={newsFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleNewsFileSelected(e.target.files)}
              className={styles.hiddenFileInput}
            />

            {newsPreviewUrl ? (
              <div className={styles.newsImagePreviewWrap}>
                <img
                  src={newsPreviewUrl}
                  alt=""
                  className={styles.newsImagePreview}
                />
                <button
                  type="button"
                  onClick={handleNewsRemoveImage}
                  className={styles.removeImageButton}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => newsFileInputRef.current?.click()}
                className={styles.filePickerButton}
              >
                + Додати зображення
              </button>
            )}

            <input
              required
              placeholder="Заголовок новини"
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              className={styles.input}
            />

            <textarea
              required
              rows={4}
              placeholder="Текст новини"
              value={newsText}
              onChange={(e) => setNewsText(e.target.value)}
              className={styles.textarea}
            />

            <div className={styles.formActions}>
              {newsEditingId && (
                <button
                  type="button"
                  onClick={resetNewsForm}
                  className={styles.cancelButton}
                >
                  Скасувати
                </button>
              )}
              <button
                type="submit"
                disabled={newsSaving}
                className={styles.submitButton}
              >
                {newsSaving
                  ? 'Зберігаємо…'
                  : newsEditingId
                    ? 'Зберегти'
                    : 'Створити новину'}
              </button>
            </div>
          </form>

          {newsLoading ? (
            <p className={styles.muted}>Завантаження…</p>
          ) : news.length === 0 ? (
            <p className={styles.muted}>Новин поки немає</p>
          ) : (
            <div className={styles.list}>
              {news.map((item) => (
                <div key={item.id} className={styles.item}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className={styles.itemImage} />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemMeta}>{item.text}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      onClick={() => handleNewsEdit(item)}
                      className={styles.editButton}
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleNewsDelete(item)}
                      className={styles.deleteButton}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
