import { useEffect, useState } from 'react';

import { paintingsService } from '../../api/paintings.api';
import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { uploadImage } from '../../api/uploads.api';
import type { Painting } from '../../types/painting.types';
import type { Material, Technique } from '../../types/dictionaries.types';
import styles from './CreatePaintingForm.module.scss';

type Props = {
  painting?: Painting;
  onSaved: () => void;
  onClose: () => void;
};

export default function CreatePaintingForm({
  painting,
  onSaved,
  onClose,
}: Props) {
  const [title, setTitle] = useState(painting?.title ?? '');
  const [description, setDescription] = useState(painting?.description ?? '');
  const [price, setPrice] = useState(painting?.price?.toString() ?? '');
  const [techniqueId, setTechniqueId] = useState(
    painting?.techniqueId?.toString() ?? '',
  );
  const [materialId, setMaterialId] = useState(
    painting?.materialId?.toString() ?? '',
  );
  const [width, setWidth] = useState(painting?.width?.toString() ?? '');
  const [height, setHeight] = useState(painting?.height?.toString() ?? '');
  const [year, setYear] = useState(painting?.year?.toString() ?? '');
  const [isFeatured, setIsFeatured] = useState(painting?.isFeatured ?? false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    painting?.images ?? [],
  );
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    techniquesService.getTechniques().then(setTechniques);
    materialsService.getMaterials().then(setMaterials);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (existingImages.length === 0 && files.length === 0) {
      setError("Додайте хоча б одне фото");
      return;
    }

    try {
      setSaving(true);

      const uploadedUrls = await Promise.all(
        files.map(async (file) => (await uploadImage(file)).url),
      );

      const images = [...existingImages, ...uploadedUrls];

      const payload = {
        title,
        description,
        cardImage: images[0],
        images,
        price: Number(price),
        isFeatured,
        techniqueId: techniqueId ? Number(techniqueId) : undefined,
        materialId: materialId ? Number(materialId) : undefined,
        width: Number(width) || undefined,
        height: Number(height) || undefined,
        year: Number(year) || undefined,
      };

      if (painting) {
        await paintingsService.updatePainting(painting.id, payload);
      } else {
        await paintingsService.createPainting(payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося зберегти картину');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {painting ? 'Редагування картини' : 'Створення картини'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.fileLabel}>
            Фото
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className={styles.fileInput}
            />
          </label>

          {existingImages.length > 0 && (
            <div className={styles.imagePreviews}>
              {existingImages.map((url) => (
                <div key={url} className={styles.imagePreviewWrap}>
                  <img src={url} alt="" className={styles.imagePreview} />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingImages((prev) =>
                        prev.filter((item) => item !== url),
                      )
                    }
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            required
            placeholder="Назва"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />

          <input
            required
            type="number"
            placeholder="Ціна"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={styles.input}
          />

          <select
            value={techniqueId}
            onChange={(e) => setTechniqueId(e.target.value)}
            className={styles.select}
          >
            <option value="">Техніка</option>
            {techniques.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className={styles.select}
          >
            <option value="">Матеріал</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <div className={styles.row3}>
            <input
              type="number"
              placeholder="Ширина"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Висота"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Рік"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={styles.input}
            />
          </div>

          <textarea
            required
            placeholder="Опис"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            Featured
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Скасувати
            </button>
            <button type="submit" disabled={saving} className={styles.saveButton}>
              {saving
                ? 'Зберігаємо…'
                : painting
                  ? 'Оновити картину'
                  : 'Створити картину'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
