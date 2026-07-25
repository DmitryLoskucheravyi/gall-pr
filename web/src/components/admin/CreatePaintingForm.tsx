import { useEffect, useRef, useState } from 'react';

import { paintingsService } from '../../api/paintings.api';
import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { uploadImage } from '../../api/uploads.api';
import type { Painting } from '../../types/painting.types';
import type { Material, Technique } from '../../types/dictionaries.types';
import Select from '../ui/Select';
import styles from './CreatePaintingForm.module.scss';

type Props = {
  painting?: Painting;
  onSaved: () => void;
  onClose: () => void;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => {
  const year = CURRENT_YEAR - i;
  return { value: String(year), label: String(year) };
});

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
  const [newImages, setNewImages] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    painting?.images ?? [],
  );
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Each preview URL is created exactly once, when its file is selected,
  // and only ever revoked when that entry is explicitly removed or the
  // form unmounts. Recomputing every URL on each selection change (e.g.
  // via a useMemo keyed off the whole array) was the previous approach,
  // and revoking/recreating already-displayed previews on every unrelated
  // change is what made newly added photos intermittently fail to render.
  const newImagesRef = useRef(newImages);
  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  useEffect(() => {
    techniquesService.getTechniques().then(setTechniques);
    materialsService.getMaterials().then(setMaterials);
  }, []);

  const techniqueOptions = [
    { value: '', label: 'Не вказано' },
    ...techniques.map((t) => ({ value: String(t.id), label: t.name })),
  ];
  const materialOptions = [
    { value: '', label: 'Не вказано' },
    ...materials.map((m) => ({ value: String(m.id), label: m.name })),
  ];

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const selected = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImages((prev) => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (existingImages.length === 0 && newImages.length === 0) {
      setError("Додайте хоча б одне фото");
      return;
    }

    try {
      setSaving(true);

      // Upload one at a time rather than in parallel: if a single photo
      // hits a transient failure, we keep whatever already succeeded
      // (folded into existingImages) instead of losing the whole batch
      // and forcing a full re-upload of everything on retry.
      const uploadedUrls: string[] = [];
      const failedImages: { file: File; previewUrl: string }[] = [];

      for (const item of newImages) {
        try {
          const { url } = await uploadImage(item.file);
          uploadedUrls.push(url);
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          failedImages.push(item);
        }
      }

      if (failedImages.length > 0) {
        setExistingImages((prev) => [...prev, ...uploadedUrls]);
        setNewImages(failedImages);
        setError(
          `Не вдалося завантажити ${failedImages.length} з ${newImages.length} фото. Решта збережені — спробуйте ще раз.`,
        );
        return;
      }

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
          <span className={styles.fileLabel}>Фото</span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.filePickerButton}
          >
            + Додати фото
          </button>

          {(existingImages.length > 0 || newImages.length > 0) && (
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

              {newImages.map((item, index) => (
                <div key={item.previewUrl} className={styles.imagePreviewWrap}>
                  <img
                    src={item.previewUrl}
                    alt=""
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(index)}
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

          <Select
            value={techniqueId}
            onChange={setTechniqueId}
            options={techniqueOptions}
            placeholder="Техніка"
          />

          <Select
            value={materialId}
            onChange={setMaterialId}
            options={materialOptions}
            placeholder="Матеріал"
          />

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
            <Select
              value={year}
              onChange={setYear}
              options={YEAR_OPTIONS}
              placeholder="Рік"
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
